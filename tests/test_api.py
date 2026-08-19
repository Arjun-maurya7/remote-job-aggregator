"""
API layer tests for search, filtering, and pagination.

Tests endpoints:
  GET  /
  GET  /health
  GET  /jobs (search, filter, pagination, stable ordering)
  GET  /jobs/{id}
  POST /ingestion/run
"""

from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.main import app
from database.connection import get_engine
from database.models import Base, JobRecord
from database.repository import save_job
from models.job import Job

client = TestClient(app)

# ---------------------------------------------------------------------------
# Sample payload for mocked ingestion test
# ---------------------------------------------------------------------------
MOCK_API_RESPONSE = {
    "jobs": [
        {
            "id": 501,
            "url": "https://jobicy.com/jobs/501-backend-dev",
            "jobTitle": "Backend Developer",
            "companyName": "TechCorp",
            "jobGeo": "Remote",
            "jobType": ["Full-Time"],
            "jobIndustry": ["Software"],
            "jobLevel": "Senior",
            "jobExcerpt": "Great Python job.",
            "jobDescription": "<p>Great Python job.</p>",
            "pubDate": "2026-08-19T05:00:00+00:00",
        }
    ]
}


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def engine():
    """Ensure schema exists for session."""
    e = get_engine()
    Base.metadata.create_all(e)
    yield e


@pytest.fixture
def clean_db(engine):
    """Truncate jobs table before each test."""
    with Session(engine) as s:
        s.execute(text("TRUNCATE TABLE jobs RESTART IDENTITY"))
        s.commit()
    yield


def make_job_model(
    source_job_id: str,
    title: str = "Software Engineer",
    company: str = "Acme Corp",
    location: str = "Remote - India",
    employment_type: list = None,
    industry: list = None,
    job_level: str = "Midweight",
    excerpt: str = "Exciting opportunity",
    pub_date: str = "2026-08-19T10:00:00+00:00",
) -> Job:
    """Construct a Job Pydantic model for populating test data."""
    return Job(
        source="jobicy",
        source_job_id=source_job_id,
        title=title,
        company=company,
        url=f"https://jobicy.com/jobs/{source_job_id}",
        employment_type=employment_type or ["Full-Time"],
        industry=industry or ["Technology"],
        location=location,
        job_level=job_level,
        excerpt=excerpt,
        description="<p>Full description</p>",
        published_at=datetime.fromisoformat(pub_date),
        fetched_at=datetime(2026, 8, 19, 12, 0, 0, tzinfo=timezone.utc),
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_read_root():
    """GET / -> 200 OK with API identity."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"name": "Job Ingestion API", "status": "ok"}


def test_health_check_healthy(clean_db):
    """GET /health -> 200 OK when DB is healthy."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@patch("app.main.get_engine")
def test_health_check_unhealthy(mock_engine):
    """GET /health -> 503 when DB fails."""
    mock_engine.side_effect = Exception("DB error")
    response = client.get("/health")
    assert response.status_code == 503
    assert response.json() == {"detail": "Database unavailable"}


def test_default_pagination(engine, clean_db):
    """
    Test 1: GET /jobs with default query parameters.
    Verify default page=1, limit=20, total, pages structure.
    """
    with Session(engine) as s:
        for i in range(25):
            save_job(s, make_job_model(str(i + 1), title=f"Job {i + 1}"))
        s.commit()

    response = client.get("/jobs")
    assert response.status_code == 200
    data = response.json()

    assert data["page"] == 1
    assert data["limit"] == 20
    assert data["total"] == 25
    assert data["pages"] == 2
    assert len(data["items"]) == 20


def test_explicit_pagination(engine, clean_db):
    """
    Test 2: GET /jobs?page=2&limit=10.
    Verify page 2 items and offset logic.
    """
    with Session(engine) as s:
        for i in range(25):
            save_job(s, make_job_model(str(i + 1), title=f"Job {i + 1}"))
        s.commit()

    response = client.get("/jobs?page=2&limit=10")
    assert response.status_code == 200
    data = response.json()

    assert data["page"] == 2
    assert data["limit"] == 10
    assert data["total"] == 25
    assert data["pages"] == 3
    assert len(data["items"]) == 10


def test_max_limit_validation():
    """Test 3: GET /jobs?limit=101 -> 422 Unprocessable Entity."""
    response = client.get("/jobs?limit=101")
    assert response.status_code == 422


def test_invalid_page_validation():
    """Test 4: GET /jobs?page=0 -> 422 Unprocessable Entity."""
    response = client.get("/jobs?page=0")
    assert response.status_code == 422


def test_search_filter(engine, clean_db):
    """
    Test 5: GET /jobs?search=python.
    Verify case-insensitive broad keyword search across title, company, excerpt.
    """
    with Session(engine) as s:
        save_job(s, make_job_model("1", title="Python Developer"))
        save_job(s, make_job_model("2", company="Senior PYTHON Corp"))
        save_job(s, make_job_model("3", excerpt="Needs python experience"))
        save_job(s, make_job_model("4", title="Java Developer", excerpt="Only Java"))
        s.commit()

    response = client.get("/jobs?search=python")
    assert response.status_code == 200
    data = response.json()

    assert data["total"] == 3
    titles = [item["title"] for item in data["items"]]
    assert "Java Developer" not in titles


def test_location_filter(engine, clean_db):
    """
    Test 6: GET /jobs?location=India.
    Verify case-insensitive location filter.
    """
    with Session(engine) as s:
        save_job(s, make_job_model("1", location="Remote - India"))
        save_job(s, make_job_model("2", location="US Only"))
        s.commit()

    response = client.get("/jobs?location=India")
    assert response.status_code == 200
    data = response.json()

    assert data["total"] == 1
    assert data["items"][0]["location"] == "Remote - India"


def test_employment_type_filter(engine, clean_db):
    """
    Test 7: GET /jobs?employment_type=Full-Time.
    Verify PostgreSQL array element filtering.
    """
    with Session(engine) as s:
        save_job(s, make_job_model("1", employment_type=["Full-Time", "Contract"]))
        save_job(s, make_job_model("2", employment_type=["Part-Time"]))
        s.commit()

    response = client.get("/jobs?employment_type=Full-Time")
    assert response.status_code == 200
    data = response.json()

    assert data["total"] == 1
    assert data["items"][0]["source_job_id"] == "1"


def test_industry_filter(engine, clean_db):
    """
    Test 8: GET /jobs?industry=Technology.
    Verify PostgreSQL array element filtering on industry.
    """
    with Session(engine) as s:
        save_job(s, make_job_model("1", industry=["Technology", "Design"]))
        save_job(s, make_job_model("2", industry=["Healthcare"]))
        s.commit()

    response = client.get("/jobs?industry=Technology")
    assert response.status_code == 200
    data = response.json()

    assert data["total"] == 1
    assert data["items"][0]["source_job_id"] == "1"


def test_job_level_filter(engine, clean_db):
    """
    Test 9: GET /jobs?job_level=Senior.
    Verify case-insensitive job level filtering.
    """
    with Session(engine) as s:
        save_job(s, make_job_model("1", job_level="Senior"))
        save_job(s, make_job_model("2", job_level="Junior"))
        s.commit()

    response = client.get("/jobs?job_level=senior")
    assert response.status_code == 200
    data = response.json()

    assert data["total"] == 1
    assert data["items"][0]["job_level"] == "Senior"


def test_combined_filters(engine, clean_db):
    """
    Test 10: GET /jobs?search=python&location=India&employment_type=Full-Time.
    Verify all supplied filters are applied together (AND logic).
    """
    with Session(engine) as s:
        # Match all 3
        save_job(s, make_job_model("1", title="Python Lead", location="India", employment_type=["Full-Time"]))
        # Match python & location, but Part-Time
        save_job(s, make_job_model("2", title="Python Lead", location="India", employment_type=["Part-Time"]))
        # Match python & Full-Time, but US
        save_job(s, make_job_model("3", title="Python Lead", location="US", employment_type=["Full-Time"]))
        s.commit()

    response = client.get("/jobs?search=python&location=India&employment_type=Full-Time")
    assert response.status_code == 200
    data = response.json()

    assert data["total"] == 1
    assert data["items"][0]["source_job_id"] == "1"


def test_empty_filtered_result(clean_db):
    """
    Test 11: GET /jobs?search=nonexistent-job-xyz -> 200 OK with items=[], total=0, pages=0.
    """
    response = client.get("/jobs?search=nonexistent-job-xyz")
    assert response.status_code == 200
    data = response.json()

    assert data["items"] == []
    assert data["total"] == 0
    assert data["pages"] == 0


def test_stable_ordering(engine, clean_db):
    """
    Test 12: Verify ordering by published_at DESC NULLS LAST, id DESC.
    """
    pub_time = "2026-08-19T10:00:00+00:00"
    with Session(engine) as s:
        # Save two jobs with identical published_at
        save_job(s, make_job_model("10", title="Job ID 10", pub_date=pub_time))
        save_job(s, make_job_model("20", title="Job ID 20", pub_date=pub_time))
        s.commit()

    response = client.get("/jobs")
    assert response.status_code == 200
    data = response.json()

    assert len(data["items"]) == 2
    # Second job inserted has higher internal ID, so it comes first when published_at is equal
    assert data["items"][0]["id"] > data["items"][1]["id"]


def test_get_job_by_id(engine, clean_db):
    """Test 13: GET /jobs/{id} still works as expected."""
    with Session(engine) as s:
        save_job(s, make_job_model("100", title="Unique Job"))
        s.commit()
        rec = s.query(JobRecord).filter_by(source_job_id="100").one()
        job_id = rec.id

    response = client.get(f"/jobs/{job_id}")
    assert response.status_code == 200
    assert response.json()["title"] == "Unique Job"

    missing = client.get("/jobs/999999")
    assert missing.status_code == 404


@patch("ingestion.jobicy.fetch_jobs")
def test_ingestion_endpoint(mock_fetch, engine, clean_db):
    """Test 14: POST /ingestion/run still works as expected."""
    mock_fetch.return_value = MOCK_API_RESPONSE

    response = client.post("/ingestion/run")
    assert response.status_code == 200
    assert response.json()["status"] == "committed"


def test_partial_location_filtering_usa(engine, clean_db):
    """
    Test 15: GET /jobs?location=USA.
    Verify partial ILIKE location match for both 'USA' and 'Canada, USA'.
    """
    with Session(engine) as s:
        save_job(s, make_job_model("1", location="USA"))
        save_job(s, make_job_model("2", location="Canada, USA"))
        save_job(s, make_job_model("3", location="UK"))
        s.commit()

    response = client.get("/jobs?location=USA")
    assert response.status_code == 200
    data = response.json()

    assert data["total"] == 2
    ids = [item["source_job_id"] for item in data["items"]]
    assert "1" in ids and "2" in ids
    assert "3" not in ids


def test_location_filtering_india(engine, clean_db):
    """
    Test 16: GET /jobs?location=India.
    Verify location filtering for 'Remote - India'.
    """
    with Session(engine) as s:
        save_job(s, make_job_model("1", location="Remote - India"))
        save_job(s, make_job_model("2", location="USA"))
        s.commit()

    response = client.get("/jobs?location=India")
    assert response.status_code == 200
    data = response.json()

    assert data["total"] == 1
    assert data["items"][0]["source_job_id"] == "1"


def test_case_insensitive_array_filtering(engine, clean_db):
    """
    Test 17: GET /jobs?employment_type=full-time.
    Verify case-insensitive matching on PostgreSQL TEXT[] array column.
    """
    with Session(engine) as s:
        save_job(s, make_job_model("1", employment_type=["Full-Time"]))
        save_job(s, make_job_model("2", employment_type=["Part-Time"]))
        s.commit()

    response = client.get("/jobs?employment_type=full-time")
    assert response.status_code == 200
    data = response.json()

    assert data["total"] == 1
    assert data["items"][0]["source_job_id"] == "1"


def test_combined_location_and_employment_type(engine, clean_db):
    """
    Test 18: GET /jobs?location=USA&employment_type=Full-Time.
    Verify combined location + employment_type filtering.
    """
    with Session(engine) as s:
        save_job(s, make_job_model("1", location="Canada, USA", employment_type=["Full-Time"]))
        save_job(s, make_job_model("2", location="Canada, USA", employment_type=["Part-Time"]))
        save_job(s, make_job_model("3", location="UK", employment_type=["Full-Time"]))
        s.commit()

    response = client.get("/jobs?location=USA&employment_type=Full-Time")
    assert response.status_code == 200
    data = response.json()

    assert data["total"] == 1
    assert data["items"][0]["source_job_id"] == "1"


def test_filtered_pagination_total_matches_count(engine, clean_db):
    """
    Test 19: Verify total count and pages correspond accurately to filtered queries.
    """
    with Session(engine) as s:
        for i in range(15):
            save_job(s, make_job_model(str(i + 1), location="USA", employment_type=["Full-Time"]))
        save_job(s, make_job_model("99", location="UK", employment_type=["Part-Time"]))
        s.commit()

    response = client.get("/jobs?location=USA&employment_type=Full-Time&page=1&limit=10")
    assert response.status_code == 200
    data = response.json()

    assert data["total"] == 15
    assert data["pages"] == 2
    assert len(data["items"]) == 10

