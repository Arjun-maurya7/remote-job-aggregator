"""
Jobicy adapter.

Translates one raw Jobicy API job dict into our normalized Job model.

This is the only place in the codebase that should know about Jobicy's
field names (jobTitle, companyName, jobGeo, etc.). Everything above this
layer uses the normalized Job model instead.
"""

from datetime import datetime

from models.job import Job


def adapt(raw: dict, fetched_at: datetime) -> Job:
    """
    Convert one raw Jobicy job dict into our normalized Job.

    fetched_at is passed in by the caller rather than generated here.
    This ensures that every job processed in one ingestion run shares
    the same timestamp — the caller generates it once and passes it to
    every adapt() call in the batch.

    Required fields use direct key access (raw["field"]).  If a required
    field is absent from the raw data a KeyError is raised immediately —
    this is intentional: the caller should know the data is malformed.

    Optional fields use raw.get("field"), which returns None if the key is
    absent.  Pydantic accepts None for every Optional field in Job.
    """
    return Job(
        source="jobicy",

        # Jobicy uses integer IDs; we normalize to str so the rest of the
        # application is not coupled to Jobicy's choice of ID type.
        source_job_id=str(raw["id"]),

        title=raw["jobTitle"],
        company=raw["companyName"],
        url=raw["url"],

        # jobType and jobIndustry are already lists in the Jobicy response.
        # We keep them as lists; do not join them into a single string.
        employment_type=raw.get("jobType", []),
        industry=raw.get("jobIndustry", []),

        location=raw.get("jobGeo"),
        job_level=raw.get("jobLevel"),
        excerpt=raw.get("jobExcerpt"),

        # Raw HTML — not stripped here. See Phase 1 notes.
        description=raw.get("jobDescription"),

        # Pydantic will parse the ISO-8601 string "2026-08-19T02:30:06+00:00"
        # into a timezone-aware datetime object automatically.
        published_at=raw.get("pubDate"),

        # Provided by the caller — not generated here.
        fetched_at=fetched_at,

        salary_min=raw.get("salaryMin"),
        salary_max=raw.get("salaryMax"),
        salary_currency=raw.get("salaryCurrency"),
        salary_period=raw.get("salaryPeriod"),
    )
