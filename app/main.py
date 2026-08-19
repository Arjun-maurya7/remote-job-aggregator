"""
FastAPI application entry point.

Exposes REST endpoints for the job ingestion system:
  GET  /               -- API info
  GET  /health         -- Health check & DB connectivity
  GET  /jobs           -- List, search, filter, and paginate jobs
  GET  /jobs/{id}      -- Get single job by internal ID
  POST /ingestion/run  -- Trigger batch ingestion
"""

import math
import os
from typing import Generator, Optional

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.schemas import (
    ErrorResponse,
    HealthResponse,
    IngestionRunResponse,
    JobListResponse,
    JobResponse,
    RootResponse,
)
from database.connection import get_engine
from database.repository import get_job_by_id, get_jobs
from ingestion.jobicy import run_ingestion

app = FastAPI(
    title="Job Ingestion API",
    description="REST API for remote job ingestion, retrieval, search, filtering, and pagination",
    version="0.1.0",
)

# Enable CORS for frontend integration
raw_frontend_origin = os.environ.get("FRONTEND_ORIGIN")
if raw_frontend_origin:
    allowed_origins = [
        origin.strip().rstrip("/")
        for origin in raw_frontend_origin.split(",")
        if origin.strip()
    ]
else:
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency yielding a database Session.
    Session is automatically closed at request cleanup.
    """
    engine = get_engine()
    with Session(engine) as session:
        yield session


@app.get(
    "/",
    response_model=RootResponse,
    summary="API Information",
    tags=["Meta"],
)
def read_root() -> RootResponse:
    """Return basic API identity and status."""
    return RootResponse()


@app.get(
    "/health",
    response_model=HealthResponse,
    summary="Health Check",
    tags=["Meta"],
    responses={
        200: {"model": HealthResponse, "description": "System and database are healthy"},
        503: {"model": ErrorResponse, "description": "Database unavailable"},
    },
)
def health_check() -> HealthResponse:
    """Verify database connectivity with a lightweight SELECT 1 query."""
    try:
        engine = get_engine()
        with Session(engine) as session:
            session.execute(text("SELECT 1"))
        return HealthResponse(status="ok")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable",
        )


@app.get(
    "/jobs",
    response_model=JobListResponse,
    summary="List Jobs",
    tags=["Jobs"],
)
def list_all_jobs(
    search: Optional[str] = Query(
        None, description="Search title, company, and excerpt."
    ),
    location: Optional[str] = Query(
        None, description="Filter by location."
    ),
    employment_type: Optional[str] = Query(
        None, description="Filter by employment type."
    ),
    industry: Optional[str] = Query(
        None, description="Filter by industry."
    ),
    job_level: Optional[str] = Query(
        None, description="Filter by job level."
    ),
    page: int = Query(
        1, ge=1, description="Page number, starting at 1."
    ),
    limit: int = Query(
        20, ge=1, le=100, description="Number of jobs per page, maximum 100."
    ),
    session: Session = Depends(get_db),
) -> JobListResponse:
    """
    Retrieve paginated and filtered jobs from PostgreSQL.
    """
    jobs, total = get_jobs(
        session=session,
        search=search,
        location=location,
        employment_type=employment_type,
        industry=industry,
        job_level=job_level,
        page=page,
        limit=limit,
    )
    pages = math.ceil(total / limit) if total > 0 else 0
    return JobListResponse(
        items=jobs,
        page=page,
        limit=limit,
        total=total,
        pages=pages,
    )


@app.get(
    "/jobs/{job_id}",
    response_model=JobResponse,
    summary="Get Job by ID",
    tags=["Jobs"],
    responses={
        200: {"model": JobResponse, "description": "Job found"},
        404: {"model": ErrorResponse, "description": "Job not found"},
    },
)
def get_job(job_id: int, session: Session = Depends(get_db)) -> JobResponse:
    """Retrieve a single normalized job by its internal primary key."""
    job = get_job_by_id(session, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )
    return job


@app.post(
    "/ingestion/run",
    response_model=IngestionRunResponse,
    summary="Trigger Job Ingestion",
    tags=["Ingestion"],
    responses={
        200: {"model": IngestionRunResponse, "description": "Ingestion committed"},
        500: {"model": IngestionRunResponse, "description": "Ingestion rolled back"},
        502: {"model": IngestionRunResponse, "description": "Jobicy HTTP API error"},
    },
)
def trigger_ingestion() -> JSONResponse:
    """
    Run one batch ingestion run against Jobicy API.
    Persists jobs to PostgreSQL and returns ingestion statistics.
    """
    result = run_ingestion()
    payload = IngestionRunResponse(
        fetched=result.fetched,
        inserted=result.inserted,
        updated=result.updated,
        failed=result.failed,
        status=result.status,
        error=result.error,
    ).model_dump()

    if result.status == "committed":
        return JSONResponse(status_code=status.HTTP_200_OK, content=payload)
    elif result.status == "http_error":
        return JSONResponse(status_code=status.HTTP_502_BAD_GATEWAY, content=payload)
    else:
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=payload)
