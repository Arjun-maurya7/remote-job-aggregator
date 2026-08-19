"""
Pydantic API schemas for request/response serialization.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class RootResponse(BaseModel):
    name: str = "Job Ingestion API"
    status: str = "ok"


class HealthResponse(BaseModel):
    status: str = "ok"


class JobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source: str
    source_job_id: str
    title: str
    company: str
    location: Optional[str] = None
    employment_type: List[str]
    industry: List[str]
    job_level: Optional[str] = None
    excerpt: Optional[str] = None
    description: Optional[str] = None
    url: str
    published_at: Optional[datetime] = None
    fetched_at: datetime
    created_at: datetime
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: Optional[str] = None
    salary_period: Optional[str] = None


class JobListResponse(BaseModel):
    items: List[JobResponse]
    page: int
    limit: int
    total: int
    pages: int


class IngestionRunResponse(BaseModel):
    fetched: int
    inserted: int
    updated: int
    failed: int
    status: str
    error: Optional[str] = None


class ErrorResponse(BaseModel):
    detail: str
