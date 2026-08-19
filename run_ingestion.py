"""
Run one batch ingestion from the command line.

Usage:
    .venv\\Scripts\\python run_ingestion.py

DATABASE_URL must be set in .env or in the environment.
"""

from ingestion.jobicy import run_ingestion


def main() -> None:
    print("Starting Jobicy ingestion run...")
    print("-" * 50)

    result = run_ingestion()

    print(f"\nIngestion {result.status}\n")
    print(f"  Fetched  : {result.fetched}")
    print(f"  Inserted : {result.inserted}")
    print(f"  Updated  : {result.updated}")
    print(f"  Failed   : {result.failed}")
    print(f"  Status   : {result.status}")

    if result.error:
        print(f"\n  Error    : {result.error}")


if __name__ == "__main__":
    main()
