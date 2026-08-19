"""
Integration tests for the database persistence layer.

These tests use a REAL PostgreSQL database.  They do NOT use SQLite as a
substitute — PostgreSQL arrays (TEXT[]) and the INSERT ON CONFLICT upsert
behaviour are PostgreSQL-specific and cannot be tested accurately with SQLite.

Requirements:
  - DATABASE_URL must be set to a real PostgreSQL database.
  - Example: postgresql+psycopg2://postgres@localhost:5432/job_ingestion
  - The database must already exist (run: createdb job_ingestion).

To run:
  $env:DATABASE_URL = "postgresql+psycopg2://postgres@localhost:5432/job_ingestion"
  .venv\\Scripts\\pytest tests/test_repository.py -v
"""

from datetime import datetime, timezone
from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from database.connection import get_engine
from database.models import Base, JobRecord
from database.repository import save_job
from models.job import Job


# ---------------------------------------------------------------------------
# Fixed timestamps — tests must be deterministic, not depend on wall clock.
# ---------------------------------------------------------------------------
PUBLISHED_AT = datetime(2026, 8, 19, 2, 30, 6, tzinfo=timezone.utc)
FETCHED_AT   = datetime(2026, 8, 19, 9, 0, 0, tzinfo=timezone.utc)


def make_job(**overrides) -> Job:
    """
    Build a minimal valid normalized Job for testing.
    Pass keyword arguments to override any default field.
    """
    defaults = {
        "source": "jobicy",
        "source_job_id": "146740",
        "title": "Creative Producer",
        "company": "CapsLock",
        "url": "https://jobicy.com/jobs/146740-creative-producer",
        "employment_type": ["Full-Time"],
        "industry": ["Creative &amp; Design"],
        "location": "Anywhere",
        "job_level": "Midweight",
        "excerpt": None,
        "description": None,
        "published_at": PUBLISHED_AT,
        "fetched_at": FETCHED_AT,
        "salary_min": None,
        "salary_max": None,
        "salary_currency": None,
        "salary_period": None,
    }
    defaults.update(overrides)
    return Job(**defaults)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def engine():
    """
    Ensure the database schema exists for test runs.
    """
    e = get_engine()
    Base.metadata.create_all(e)
    yield e


@pytest.fixture
def session(engine):
    """
    Each test gets its own Session.  Changes are NOT committed.
    When the test finishes, session.rollback() undoes all changes,
    leaving the database clean for the next test.

    This avoids slow table-drop/create cycles between tests while
    still guaranteeing isolation.
    """
    with Session(engine) as s:
        yield s
        s.rollback()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_new_job_can_be_inserted(session):
    """A new normalized job can be inserted and read back."""
    save_job(session, make_job())

    result = session.query(JobRecord).filter_by(
        source="jobicy", source_job_id="146740"
    ).one()

    assert result.title == "Creative Producer"
    assert result.company == "CapsLock"
    assert result.url == "https://jobicy.com/jobs/146740-creative-producer"
    assert result.location == "Anywhere"
    assert result.job_level == "Midweight"


def test_duplicate_does_not_create_second_row(session):
    """
    Calling save_job twice with the same (source, source_job_id)
    must result in exactly one row — not two.
    """
    save_job(session, make_job(title="First Title"))
    save_job(session, make_job(title="Second Title"))

    count = session.query(JobRecord).filter_by(
        source="jobicy", source_job_id="146740"
    ).count()

    assert count == 1


def test_upsert_updates_existing_fields(session):
    """
    When the same (source, source_job_id) is saved again with different
    content, the existing row is updated — not duplicated.
    """
    save_job(session, make_job(title="Original Title", company="OldCo"))
    save_job(session, make_job(title="Updated Title", company="NewCo"))

    result = session.query(JobRecord).filter_by(
        source="jobicy", source_job_id="146740"
    ).one()

    assert result.title == "Updated Title"
    assert result.company == "NewCo"


def test_optional_salary_fields_are_null(session):
    """When no salary data is provided, all four salary columns are NULL."""
    save_job(session, make_job())

    result = session.query(JobRecord).filter_by(
        source="jobicy", source_job_id="146740"
    ).one()

    assert result.salary_min is None
    assert result.salary_max is None
    assert result.salary_currency is None
    assert result.salary_period is None


def test_salary_fields_stored_as_numeric(session):
    """
    Salary values are stored as NUMERIC, not float.
    Reading them back should produce Decimal values.
    """
    save_job(session, make_job(
        source_job_id="salary-test",
        salary_min=230000,
        salary_max=322000,
        salary_currency="USD",
        salary_period="yearly",
    ))

    result = session.query(JobRecord).filter_by(
        source="jobicy", source_job_id="salary-test"
    ).one()

    assert result.salary_min == Decimal("230000")
    assert result.salary_max == Decimal("322000")
    assert result.salary_currency == "USD"
    assert result.salary_period == "yearly"


def test_industry_array_preserved(session):
    """
    PostgreSQL TEXT[] must preserve the full list, including order
    and all elements.
    """
    save_job(session, make_job(
        source_job_id="industry-array-test",
        industry=["Engineering", "Data Science"],
    ))

    result = session.query(JobRecord).filter_by(
        source="jobicy", source_job_id="industry-array-test"
    ).one()

    assert result.industry == ["Engineering", "Data Science"]


def test_employment_type_array_preserved(session):
    """
    employment_type must come back as a list with all elements intact.
    """
    save_job(session, make_job(
        source_job_id="emptype-array-test",
        employment_type=["Full-Time", "Contract"],
    ))

    result = session.query(JobRecord).filter_by(
        source="jobicy", source_job_id="emptype-array-test"
    ).one()

    assert result.employment_type == ["Full-Time", "Contract"]


def test_timestamps_stored_as_timezone_aware(session):
    """
    Both published_at and fetched_at must be stored and read back as
    timezone-aware datetimes (TIMESTAMPTZ in PostgreSQL).
    """
    save_job(session, make_job(
        source_job_id="timestamp-test",
        published_at=PUBLISHED_AT,
        fetched_at=FETCHED_AT,
    ))

    result = session.query(JobRecord).filter_by(
        source="jobicy", source_job_id="timestamp-test"
    ).one()

    # psycopg2 returns TIMESTAMPTZ as timezone-aware UTC datetimes.
    assert result.published_at == PUBLISHED_AT
    assert result.fetched_at == FETCHED_AT
    assert result.published_at.tzinfo is not None
    assert result.fetched_at.tzinfo is not None

def test_save_job_returns_inserted_on_new_row(session):
    """save_job() must return 'inserted' the first time a job is persisted."""
    outcome = save_job(session, make_job(source_job_id="ret-insert-test"))
    assert outcome == "inserted"


def test_save_job_returns_updated_on_existing_row(session):
    """
    save_job() must return 'updated' when the same (source, source_job_id)
    is persisted a second time.
    """
    save_job(session, make_job(source_job_id="ret-update-test"))
    outcome = save_job(session, make_job(source_job_id="ret-update-test", title="New Title"))
    assert outcome == "updated"


def test_created_at_remains_original_and_fetched_at_updates(session):
    """
    Verify:
      - First ingestion returns 'inserted'
      - Second ingestion returns 'updated'
      - created_at remains the original creation timestamp
      - fetched_at is updated to the second run's timestamp
    """
    first_fetched_at = datetime(2026, 8, 19, 9, 0, 0, tzinfo=timezone.utc)
    second_fetched_at = datetime(2026, 8, 20, 10, 0, 0, tzinfo=timezone.utc)

    # 1. First run (INSERT)
    outcome1 = save_job(
        session,
        make_job(source_job_id="timestamps-seq-test", fetched_at=first_fetched_at),
    )
    assert outcome1 == "inserted"

    rec1 = session.query(JobRecord).filter_by(
        source="jobicy", source_job_id="timestamps-seq-test"
    ).one()
    original_created_at = rec1.created_at
    assert rec1.fetched_at == first_fetched_at

    # 2. Second run (UPDATE)
    outcome2 = save_job(
        session,
        make_job(
            source_job_id="timestamps-seq-test",
            title="Updated Title",
            fetched_at=second_fetched_at,
        ),
    )
    assert outcome2 == "updated"

    session.expire_all()
    rec2 = session.query(JobRecord).filter_by(
        source="jobicy", source_job_id="timestamps-seq-test"
    ).one()

    # created_at MUST remain the original timestamp
    assert rec2.created_at == original_created_at
    # fetched_at MUST be updated to the second run's timestamp
    assert rec2.fetched_at == second_fetched_at

