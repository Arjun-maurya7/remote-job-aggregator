"""
Tests for the batch ingestion orchestrator (ingestion/jobicy.py).

Strategy:
  - fetch_jobs() is mocked in every test — no real HTTP calls.
  - A real PostgreSQL database is used — the orchestrator commits its own
    transaction, so we cannot rely on the session-rollback trick used in
    test_repository.py.  Instead, each test starts with a clean table via
    the clean_db fixture.

To run:
    .venv\\Scripts\\pytest tests/test_ingestion.py -v
"""

from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from database.connection import get_engine
from database.models import Base, JobRecord
from ingestion.jobicy import run_ingestion


# ---------------------------------------------------------------------------
# Representative raw Jobicy jobs (no HTTP call needed — we feed these
# directly to the orchestrator via the mocked fetch_jobs).
# ---------------------------------------------------------------------------
SAMPLE_JOB_1 = {
    "id": 111,
    "url": "https://jobicy.com/jobs/111-engineer",
    "jobTitle": "Software Engineer",
    "companyName": "Acme Corp",
    "jobGeo": "Remote",
    "jobType": ["Full-Time"],
    "jobIndustry": ["Engineering"],
    "jobLevel": "Senior",
    "jobExcerpt": "Build great things.",
    "jobDescription": "<p>Build great things.</p>",
    "pubDate": "2026-08-19T02:30:06+00:00",
}

SAMPLE_JOB_2 = {
    "id": 222,
    "url": "https://jobicy.com/jobs/222-designer",
    "jobTitle": "Product Designer",
    "companyName": "Beta Ltd",
    "jobGeo": "Anywhere",
    "jobType": ["Full-Time"],
    "jobIndustry": ["Design"],
    "jobLevel": "Midweight",
    "jobExcerpt": "Design beautiful products.",
    "jobDescription": "<p>Design beautiful products.</p>",
    "pubDate": "2026-08-19T02:30:06+00:00",
}

# A job that is missing required fields — the adapter will raise KeyError.
MALFORMED_JOB = {
    "id": 999,
    # Missing: jobTitle, companyName, url
}


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def engine():
    """Ensure the schema exists for the test session."""
    e = get_engine()
    Base.metadata.create_all(e)
    yield e


@pytest.fixture
def clean_db(engine):
    """
    Truncate the jobs table before each test.

    run_ingestion() commits its own transaction, so we cannot use the
    session-rollback approach here.  TRUNCATE gives us a deterministic
    starting state for every test.
    """
    with Session(engine) as s:
        s.execute(text("TRUNCATE TABLE jobs RESTART IDENTITY"))
        s.commit()
    yield


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@patch("ingestion.jobicy.fetch_jobs")
def test_successful_first_ingestion(mock_fetch, engine, clean_db):
    """Two valid jobs on first run → both inserted, none updated."""
    mock_fetch.return_value = {"jobs": [SAMPLE_JOB_1, SAMPLE_JOB_2]}

    result = run_ingestion(engine=engine)

    assert result.fetched == 2
    assert result.inserted == 2
    assert result.updated == 0
    assert result.failed == 0
    assert result.status == "committed"

    # Verify both records exist in PostgreSQL.
    with Session(engine) as s:
        count = s.query(JobRecord).count()
        assert count == 2


@patch("ingestion.jobicy.fetch_jobs")
def test_repeated_ingestion_updates_not_duplicates(mock_fetch, engine, clean_db):
    """
    Running the same jobs twice must produce exactly one row per job
    and report updated=2 on the second run.  This is the idempotency test.
    """
    mock_fetch.return_value = {"jobs": [SAMPLE_JOB_1, SAMPLE_JOB_2]}

    first = run_ingestion(engine=engine)
    assert first.inserted == 2
    assert first.updated == 0

    second = run_ingestion(engine=engine)
    assert second.fetched == 2
    assert second.inserted == 0
    assert second.updated == 2
    assert second.failed == 0
    assert second.status == "committed"

    # Database must still contain exactly 2 rows — no duplicates.
    with Session(engine) as s:
        count = s.query(JobRecord).count()
        assert count == 2


@patch("ingestion.jobicy.fetch_jobs")
def test_empty_response_is_valid(mock_fetch, engine, clean_db):
    """An API response with an empty jobs list must not fail."""
    mock_fetch.return_value = {"jobs": []}

    result = run_ingestion(engine=engine)

    assert result.fetched == 0
    assert result.inserted == 0
    assert result.updated == 0
    assert result.failed == 0
    assert result.status == "committed"


@patch("ingestion.jobicy.fetch_jobs")
def test_malformed_job_rolls_back_entire_batch(mock_fetch, engine, clean_db):
    """
    One valid job + one malformed job → normalization fails →
    the entire batch is rolled back → no rows persist.
    """
    mock_fetch.return_value = {"jobs": [SAMPLE_JOB_1, MALFORMED_JOB]}

    result = run_ingestion(engine=engine)

    assert result.failed == 1
    assert result.status == "rolled_back"
    assert result.error is not None

    # Crucially: the valid job must NOT have been committed either.
    with Session(engine) as s:
        count = s.query(JobRecord).count()
        assert count == 0


@patch("ingestion.jobicy.save_job")
@patch("ingestion.jobicy.fetch_jobs")
def test_db_failure_rolls_back(mock_fetch, mock_save, engine, clean_db):
    """
    A persistence error during save_job() must roll back the batch
    and return status='rolled_back'.
    """
    mock_fetch.return_value = {"jobs": [SAMPLE_JOB_1]}
    mock_save.side_effect = Exception("Simulated database failure")

    result = run_ingestion(engine=engine)

    assert result.status == "rolled_back"
    assert result.error is not None
    assert "Simulated database failure" in result.error


@patch("ingestion.jobicy.fetch_jobs")
def test_all_jobs_share_same_fetched_at(mock_fetch, engine, clean_db):
    """
    All jobs processed in a single ingestion run must share the same
    fetched_at timestamp — demonstrating the batch timestamp behavior.
    """
    mock_fetch.return_value = {"jobs": [SAMPLE_JOB_1, SAMPLE_JOB_2]}

    run_ingestion(engine=engine)

    with Session(engine) as s:
        rows = s.query(JobRecord).order_by(JobRecord.id).all()
        assert len(rows) == 2
        assert rows[0].fetched_at == rows[1].fetched_at, (
            "Jobs from the same ingestion run must share fetched_at"
        )


@patch("ingestion.jobicy.fetch_jobs")
def test_http_error_does_not_open_transaction(mock_fetch, engine, clean_db):
    """An HTTP failure must short-circuit before any DB interaction."""
    import httpx
    mock_fetch.side_effect = httpx.TimeoutException("timed out")

    result = run_ingestion(engine=engine)

    assert result.status == "http_error"
    assert result.fetched == 0

    with Session(engine) as s:
        count = s.query(JobRecord).count()
        assert count == 0
