"""
IngestionResult — a small structured result returned by run_ingestion().

Using a dataclass keeps this lightweight.  No HTTP serialization is needed
yet (that comes when FastAPI is added in a later phase), so Pydantic would
be overkill here.
"""

from dataclasses import dataclass
from typing import Literal, Optional


@dataclass
class IngestionResult:
    # How many raw jobs were present in the API response.
    fetched: int
    # How many were new rows (INSERT).
    inserted: int
    # How many were existing rows that were refreshed (UPDATE).
    updated: int
    # How many failed normalization or persistence.
    failed: int
    # What happened to the transaction.
    # "committed"        — all jobs persisted successfully.
    # "rolled_back"      — at least one failure; nothing was committed.
    # "http_error"       — the API request failed; no DB transaction was opened.
    # "validation_error" — the response structure was unexpected; no DB transaction.
    status: Literal["committed", "rolled_back", "http_error", "validation_error"]
    # Human-readable explanation of what went wrong, if anything.
    error: Optional[str] = None
