"""
Database connection setup.

The SQLAlchemy engine is created from the DATABASE_URL environment variable.
Using a function (rather than a module-level engine) means nothing is
attempted at import time — the connection is only made when get_engine()
is explicitly called.
"""

import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine

# Load .env file if it exists.  This is a no-op if DATABASE_URL is already
# set in the environment, so it is safe to call in both dev and production.
load_dotenv()


def get_engine() -> Engine:
    """
    Create and return a SQLAlchemy engine.

    Reads DATABASE_URL from the environment.  Raises RuntimeError if it is
    not set, so the error is immediate and clear rather than cryptic.

    Example DATABASE_URL:
        postgresql+psycopg2://postgres:password@localhost:5432/job_ingestion
    """
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError(
            "DATABASE_URL environment variable is not set.\n"
            "Example: postgresql+psycopg2://postgres:password@localhost:5432/job_ingestion"
        )
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return create_engine(url)
