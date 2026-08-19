"""
SQLAlchemy ORM model for the jobs table.

This defines the schema that gets created in PostgreSQL.  It is separate
from the Pydantic Job model in models/job.py.

    models/job.py   — application data contract (Pydantic)
    database/models.py — database schema (SQLAlchemy ORM)

The two exist side-by-side because their concerns are different:
Pydantic validates data moving through the application; SQLAlchemy
describes how data is stored in PostgreSQL.
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import ARRAY, BigInteger, DateTime, Index, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class JobRecord(Base):
    __tablename__ = "jobs"

    # -----------------------------------------------------------------------
    # Primary key
    # -----------------------------------------------------------------------
    # Our internal identity.  We use BIGINT so we never run out of IDs even
    # with millions of rows.  We do NOT use Jobicy's ID as the PK because:
    # (1) a future source might return the same integer ID by coincidence,
    # (2) our internal ID should not depend on an external system's choices.
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    # -----------------------------------------------------------------------
    # Source identity
    # -----------------------------------------------------------------------
    # Together, (source, source_job_id) uniquely identifies one job across
    # all sources.  The unique constraint is declared below.
    source: Mapped[str] = mapped_column(String(50), nullable=False)
    source_job_id: Mapped[str] = mapped_column(String(255), nullable=False)

    # -----------------------------------------------------------------------
    # Core fields — required
    # -----------------------------------------------------------------------
    title: Mapped[str] = mapped_column(Text, nullable=False)
    company: Mapped[str] = mapped_column(Text, nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)

    # -----------------------------------------------------------------------
    # Array fields
    # -----------------------------------------------------------------------
    # PostgreSQL TEXT[] preserves the list structure from the API.
    # We avoid a junction table because the assessment does not require
    # querying "all jobs in industry X" with a join; a simple array scan
    # is sufficient for this stage.
    employment_type: Mapped[List[str]] = mapped_column(ARRAY(Text), nullable=False)
    industry: Mapped[List[str]] = mapped_column(ARRAY(Text), nullable=False)

    # -----------------------------------------------------------------------
    # Optional fields
    # -----------------------------------------------------------------------
    location: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    job_level: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    excerpt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Raw HTML from the source — not sanitized here.
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # -----------------------------------------------------------------------
    # Timestamps — both stored with timezone (TIMESTAMPTZ in PostgreSQL)
    # -----------------------------------------------------------------------
    # When the source says the job was published.
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    # When our ingestion run fetched this job.
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    # When this row was originally created in PostgreSQL.
    # Set ONCE on INSERT and excluded from ON CONFLICT DO UPDATE set in repository.py
    # so it remains the original creation timestamp.
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # -----------------------------------------------------------------------
    # Salary — NUMERIC avoids floating-point rounding errors.
    # Numeric(12, 2): up to 10 digits before the decimal, 2 after.
    # A salary of 1,000,000,000.00 is representable; that is sufficient.
    # -----------------------------------------------------------------------
    salary_min: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    salary_max: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    salary_currency: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    salary_period: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # -----------------------------------------------------------------------
    # Constraints and indexes
    # -----------------------------------------------------------------------
    __table_args__ = (
        # Prevents inserting the same job twice from the same source.
        # The database enforces this — not just application code.
        UniqueConstraint("source", "source_job_id", name="uq_jobs_source_source_job_id"),

        # The future API will almost certainly sort by publication date.
        # Adding the index now avoids a full-table scan for every request.
        Index("ix_jobs_published_at", "published_at"),
    )
