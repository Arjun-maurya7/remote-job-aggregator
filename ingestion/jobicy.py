"""
Jobicy batch ingestion orchestrator.

run_ingestion() coordinates the full pipeline:

    1.  Fetch raw jobs from the Jobicy API.
    2.  Validate the response has the expected top-level structure.
    3.  Create ONE fetched_at timestamp for the entire run.
    4.  Adapt every raw job into a normalized Job.
    5.  Upsert every normalized Job into PostgreSQL.
    6.  Commit if all jobs succeeded; roll back if any failed.
    7.  Return an IngestionResult describing what happened.

This module coordinates components that already exist.  It does not
duplicate HTTP logic, field mapping, or SQL — those stay in their own modules.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

import httpx
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from adapters.jobicy import adapt
from client import fetch_jobs
from database.connection import get_engine
from database.repository import save_job
from models.ingestion_result import IngestionResult

logger = logging.getLogger(__name__)


def run_ingestion(engine: Optional[Engine] = None) -> IngestionResult:
    """
    Execute one complete batch ingestion run.

    Parameters:
        engine: SQLAlchemy engine to use.  Defaults to get_engine(), which
                reads DATABASE_URL from the environment.  Tests pass an
                explicit engine so they are not tied to the environment.

    Returns:
        IngestionResult with counts and a status string.
    """
    if engine is None:
        engine = get_engine()

    # ------------------------------------------------------------------
    # 1. Fetch
    # ------------------------------------------------------------------
    # Any HTTP failure here means we have no data to process.
    # Return early without opening a database transaction.
    try:
        data = fetch_jobs()
    except httpx.TimeoutException as exc:
        return IngestionResult(
            fetched=0, inserted=0, updated=0, failed=0,
            status="http_error",
            error=f"Request timed out: {exc}",
        )
    except httpx.RequestError as exc:
        return IngestionResult(
            fetched=0, inserted=0, updated=0, failed=0,
            status="http_error",
            error=f"Network error: {exc}",
        )
    except RuntimeError as exc:
        return IngestionResult(
            fetched=0, inserted=0, updated=0, failed=0,
            status="http_error",
            error=str(exc),
        )
    except ValueError as exc:
        return IngestionResult(
            fetched=0, inserted=0, updated=0, failed=0,
            status="http_error",
            error=f"Invalid JSON in response: {exc}",
        )

    # ------------------------------------------------------------------
    # 2. Validate response structure
    # ------------------------------------------------------------------
    # We only check the top-level shape here.  Individual job fields are
    # validated by Pydantic inside the adapter.
    if not isinstance(data, dict) or "jobs" not in data or not isinstance(data["jobs"], list):
        return IngestionResult(
            fetched=0, inserted=0, updated=0, failed=0,
            status="validation_error",
            error="Response did not contain a 'jobs' list",
        )

    raw_jobs = data["jobs"]

    # ------------------------------------------------------------------
    # 3. Empty response is valid — nothing to persist
    # ------------------------------------------------------------------
    if not raw_jobs:
        return IngestionResult(fetched=0, inserted=0, updated=0, failed=0, status="committed")

    # ------------------------------------------------------------------
    # 4. One shared timestamp for this entire ingestion run
    # ------------------------------------------------------------------
    # All jobs from this run will have the same fetched_at.  This makes it
    # easy to group or query "all jobs from ingestion run X".
    fetched_at = datetime.now(tz=timezone.utc)

    # ------------------------------------------------------------------
    # 5 & 6.  Adapt, upsert, then commit or roll back — as one transaction
    # ------------------------------------------------------------------
    inserted = 0
    updated = 0
    normalization_errors = []

    with Session(engine) as session:
        try:
            for raw_job in raw_jobs:
                # Adaptation is pure Python — a KeyError means a required
                # field is missing from the raw job dict.  The session is
                # not involved yet, so a failure here does not corrupt it.
                try:
                    normalized = adapt(raw_job, fetched_at=fetched_at)
                except KeyError as exc:
                    normalization_errors.append({
                        "source_job_id": raw_job.get("id"),
                        "error": f"Missing required field: {exc}",
                    })
                    # Continue collecting failures for all jobs rather
                    # than stopping at the first bad one.
                    continue

                outcome = save_job(session, normalized)
                if outcome == "inserted":
                    inserted += 1
                else:
                    updated += 1

            # If any job could not be normalized, roll back everything.
            # We do not commit a partial batch.
            if normalization_errors:
                session.rollback()
                error_msg = "; ".join(
                    f"job {e['source_job_id']}: {e['error']}"
                    for e in normalization_errors
                )
                return IngestionResult(
                    fetched=len(raw_jobs),
                    inserted=0,
                    updated=0,
                    failed=len(normalization_errors),
                    status="rolled_back",
                    error=error_msg,
                )

            session.commit()
            return IngestionResult(
                fetched=len(raw_jobs),
                inserted=inserted,
                updated=updated,
                failed=0,
                status="committed",
            )

        except Exception as exc:
            # A database error (e.g. connection lost, constraint violation
            # not caught by the upsert) lands here.
            session.rollback()
            return IngestionResult(
                fetched=len(raw_jobs),
                inserted=0,
                updated=0,
                failed=1,
                status="rolled_back",
                error=f"Persistence error: {exc}",
            )
