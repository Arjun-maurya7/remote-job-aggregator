"""
Normalized Job model.

This is our application's internal representation of a job posting.
Field names here are source-agnostic: none of them are Jobicy-specific.
Any source (Jobicy, a future source, a CSV import) must produce this
shape before the data can be stored or served.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class Job(BaseModel):
    # Where this job came from, e.g. "jobicy"
    source: str

    # The original ID from the source, normalized to a string so that
    # different sources can use different ID formats (int, UUID, slug, etc.)
    # without this model caring about the type.
    source_job_id: str

    # Core fields — required and always present in a well-formed job.
    title: str
    company: str
    url: str

    # These are lists because a job can belong to more than one category.
    employment_type: list[str]
    industry: list[str]

    # These are optional because not every source provides them.
    location: Optional[str] = None
    job_level: Optional[str] = None
    excerpt: Optional[str] = None

    # Raw HTML from Jobicy. We do NOT strip it here; that is a separate
    # concern that will be addressed in a later phase.
    description: Optional[str] = None

    # Pydantic parses ISO-8601 strings into datetime objects automatically.
    published_at: Optional[datetime] = None

    # The moment OUR application fetched this record — not from the source.
    # Must be timezone-aware (UTC).
    fetched_at: datetime

    # Salary fields are all optional together; a job may provide none or all.
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: Optional[str] = None
    salary_period: Optional[str] = None
