"""
Tests for the Jobicy adapter.

These tests do NOT make real HTTP requests.  They feed a static raw dict
(matching the shape of actual observed Jobicy API responses) into the
adapter and verify the normalized output.
"""

import pytest
from datetime import datetime, timezone

from adapters.jobicy import adapt


# A fixed timestamp used in every test.  Using a fixed value means
# tests are deterministic — they do not depend on wall-clock time.
FIXED_FETCHED_AT = datetime(2026, 8, 19, 9, 0, 0, tzinfo=timezone.utc)


# ---------------------------------------------------------------------------
# Sample data — based on actual Jobicy API response (observed 2026-08-19).
# This is a representative job that has NO salary fields, which is the
# common case in the real API.
# ---------------------------------------------------------------------------
SAMPLE_JOB = {
    "id": 146740,
    "url": "https://jobicy.com/jobs/146740-creative-producer",
    "jobTitle": "Creative Producer",
    "companyName": "CapsLock",
    "jobGeo": "Anywhere",
    "jobType": ["Full-Time"],
    "jobIndustry": ["Creative &amp; Design"],
    "jobLevel": "Midweight",
    "jobExcerpt": "CapsLock is a dynamic marketing company...",
    "jobDescription": "<h2>Description</h2><p>CapsLock is a dynamic marketing company.</p>",
    "pubDate": "2026-08-19T02:30:06+00:00",
}


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_normal_job_maps_correctly():
    """All fields map to the correct normalized names and values."""
    job = adapt(SAMPLE_JOB, fetched_at=FIXED_FETCHED_AT)

    assert job.source == "jobicy"
    assert job.source_job_id == "146740"
    assert job.title == "Creative Producer"
    assert job.company == "CapsLock"
    assert job.location == "Anywhere"
    assert job.job_level == "Midweight"
    assert job.url == "https://jobicy.com/jobs/146740-creative-producer"
    # Pydantic should have parsed the ISO string into a real datetime.
    assert isinstance(job.published_at, datetime)
    # fetched_at should be exactly the value we passed in.
    assert job.fetched_at == FIXED_FETCHED_AT


def test_integer_id_becomes_string():
    """Jobicy returns an integer ID; the adapter must normalize it to str."""
    job = adapt(SAMPLE_JOB, fetched_at=FIXED_FETCHED_AT)
    assert isinstance(job.source_job_id, str)
    assert job.source_job_id == "146740"


def test_arrays_remain_lists():
    """jobType and jobIndustry must remain lists, not be joined into strings."""
    job = adapt(SAMPLE_JOB, fetched_at=FIXED_FETCHED_AT)
    assert isinstance(job.employment_type, list)
    assert isinstance(job.industry, list)
    assert job.employment_type == ["Full-Time"]
    assert job.industry == ["Creative &amp; Design"]


def test_missing_salary_fields_are_none():
    """When salary fields are absent from the raw data, normalized fields are None."""
    job = adapt(SAMPLE_JOB, fetched_at=FIXED_FETCHED_AT)  # SAMPLE_JOB has no salary keys at all.
    assert job.salary_min is None
    assert job.salary_max is None
    assert job.salary_currency is None
    assert job.salary_period is None


def test_salary_fields_present_when_provided():
    """When salary data is present, it is passed through correctly."""
    raw = {
        **SAMPLE_JOB,
        "salaryMin": 230000,
        "salaryMax": 322000,
        "salaryCurrency": "USD",
        "salaryPeriod": "yearly",
    }
    job = adapt(raw, fetched_at=FIXED_FETCHED_AT)
    assert job.salary_min == 230000
    assert job.salary_max == 322000
    assert job.salary_currency == "USD"
    assert job.salary_period == "yearly"


def test_missing_required_field_raises():
    """The adapter must raise KeyError if a required Jobicy field is absent."""
    raw = dict(SAMPLE_JOB)
    del raw["jobTitle"]
    with pytest.raises(KeyError):
        adapt(raw, fetched_at=FIXED_FETCHED_AT)
