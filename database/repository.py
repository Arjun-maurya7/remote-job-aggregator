"""
Persistence functions for the jobs table.

Public API:
  - save_job(session, job) -> "inserted" | "updated"
  - get_jobs(session, search, location, employment_type, industry, job_level, page, limit) -> (jobs, total)
  - get_job_by_id(session, job_id) -> Optional[JobRecord]

This module does not know about Jobicy's raw field names. It only
knows about the normalized Job model and SQLAlchemy ORM models — the boundary holds.
"""

from datetime import datetime, timezone
from typing import List, Literal, Optional, Tuple

from sqlalchemy import func, literal_column, or_, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from database.models import JobRecord
from models.job import Job


def save_job(session: Session, job: Job) -> Literal["inserted", "updated"]:
    """
    Persist one normalized Job to the database using PostgreSQL ON CONFLICT DO UPDATE.

    Returns:
        "inserted" if a new row was created.
        "updated"  if an existing row was found and updated in-place.
    """
    stmt = pg_insert(JobRecord).values(
        source=job.source,
        source_job_id=job.source_job_id,
        title=job.title,
        company=job.company,
        url=job.url,
        employment_type=job.employment_type,
        industry=job.industry,
        location=job.location,
        job_level=job.job_level,
        excerpt=job.excerpt,
        description=job.description,
        published_at=job.published_at,
        fetched_at=job.fetched_at,
        created_at=datetime.now(tz=timezone.utc),
        salary_min=job.salary_min,
        salary_max=job.salary_max,
        salary_currency=job.salary_currency,
        salary_period=job.salary_period,
    )

    stmt = stmt.on_conflict_do_update(
        constraint="uq_jobs_source_source_job_id",
        set_={
            "title": stmt.excluded.title,
            "company": stmt.excluded.company,
            "url": stmt.excluded.url,
            "employment_type": stmt.excluded.employment_type,
            "industry": stmt.excluded.industry,
            "location": stmt.excluded.location,
            "job_level": stmt.excluded.job_level,
            "excerpt": stmt.excluded.excerpt,
            "description": stmt.excluded.description,
            "published_at": stmt.excluded.published_at,
            "fetched_at": stmt.excluded.fetched_at,
            "salary_min": stmt.excluded.salary_min,
            "salary_max": stmt.excluded.salary_max,
            "salary_currency": stmt.excluded.salary_currency,
            "salary_period": stmt.excluded.salary_period,
        },
    )

    stmt = stmt.returning(literal_column("xmax = 0").label("is_inserted"))
    result = session.execute(stmt)
    is_inserted = result.scalar_one()

    return "inserted" if is_inserted else "updated"


def get_jobs(
    session: Session,
    search: Optional[str] = None,
    location: Optional[str] = None,
    employment_type: Optional[str] = None,
    industry: Optional[str] = None,
    job_level: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
) -> Tuple[List[JobRecord], int]:
    """
    Fetch filtered and paginated jobs from PostgreSQL.

    Filters:
      - search: ILIKE match across title, company, and excerpt.
      - location: ILIKE match on location.
      - employment_type: PostgreSQL TEXT[] array element match.
      - industry: PostgreSQL TEXT[] array element match.
      - job_level: ILIKE match on job_level.

    Pagination & Ordering:
      - ORDER BY published_at DESC NULLS LAST, id DESC
      - OFFSET (page - 1) * limit
      - LIMIT limit

    Returns:
        Tuple of (list_of_jobs, total_matching_count)
    """
    stmt = select(JobRecord)
    count_stmt = select(func.count()).select_from(JobRecord)

    filters = []
    if search and search.strip():
        term = f"%{search.strip()}%"
        filters.append(
            or_(
                JobRecord.title.ilike(term),
                JobRecord.company.ilike(term),
                JobRecord.excerpt.ilike(term),
            )
        )

    if location and location.strip():
        filters.append(JobRecord.location.ilike(f"%{location.strip()}%"))

    if employment_type and employment_type.strip():
        term = f"%{employment_type.strip()}%"
        filters.append(
            text("EXISTS (SELECT 1 FROM unnest(jobs.employment_type) elem WHERE elem ILIKE :emp_type)").params(
                emp_type=term
            )
        )

    if industry and industry.strip():
        term = f"%{industry.strip()}%"
        filters.append(
            text("EXISTS (SELECT 1 FROM unnest(jobs.industry) elem WHERE elem ILIKE :ind)").params(
                ind=term
            )
        )

    if job_level and job_level.strip():
        filters.append(JobRecord.job_level.ilike(f"%{job_level.strip()}%"))

    if filters:
        stmt = stmt.where(*filters)
        count_stmt = count_stmt.where(*filters)

    # 1. Total matching count
    total = session.scalar(count_stmt) or 0

    # 2. Paginated items
    offset = (page - 1) * limit
    stmt = (
        stmt.order_by(
            JobRecord.published_at.desc().nulls_last(),
            JobRecord.id.desc(),
        )
        .offset(offset)
        .limit(limit)
    )

    jobs = list(session.scalars(stmt).all())
    return jobs, total


def get_job_by_id(session: Session, job_id: int) -> Optional[JobRecord]:
    """
    Fetch a single job by its internal primary key (id).
    Returns None if no matching job is found.
    """
    stmt = select(JobRecord).where(JobRecord.id == job_id)
    return session.scalars(stmt).first()
