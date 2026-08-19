"""
Jobicy API client — Phase 1 prototype.

Sends a single GET request to the Jobicy public jobs API,
checks the response, and prints a brief summary of the results.
"""

import httpx
from datetime import datetime, timezone
from adapters.jobicy import adapt

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
API_URL = "https://jobicy.com/api/v2/remote-jobs"
TIMEOUT_SECONDS = 10
USER_AGENT = "JobIngestionDemo/0.1"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def fetch_jobs() -> dict:
    """
    Send a GET request to the Jobicy API and return the parsed JSON body.

    Raises:
        httpx.TimeoutException   -- if the server does not respond in time.
        httpx.RequestError       -- for other network-level failures (DNS, etc.).
        ValueError               -- if the response body is not valid JSON.
        RuntimeError             -- if the server returns a non-2xx status code.
    """
    headers = {"User-Agent": USER_AGENT}
    response = httpx.get(API_URL, headers=headers, timeout=TIMEOUT_SECONDS)

    # Raise our own clear error if the server returned an error status (4xx/5xx).
    if response.status_code != 200:
        raise RuntimeError(
            f"API returned an unexpected status: {response.status_code}"
        )

    # .json() raises json.JSONDecodeError (a subclass of ValueError) if the
    # body cannot be parsed.  We let that propagate with a short wrapper below.
    try:
        data = response.json()
    except ValueError as exc:
        raise ValueError(f"Response body is not valid JSON: {exc}") from exc

    return data


def print_summary(data: dict) -> None:
    """
    Print a short, human-readable summary of the API response.
    We show the count of jobs and a handful of key fields from the first job.
    """
    job_count = data.get("jobCount", 0)
    jobs = data.get("jobs", [])

    print(f"Jobs returned : {job_count}")
    print(f"Last updated  : {data.get('lastUpdate', 'n/a')}")
    print()

    if not jobs:
        print("No jobs in the response.")
        return

    # Show a preview of the first job only.
    first = jobs[0]

    # Salary is optional -- not every job includes it.
    salary_parts = []
    if first.get("salaryMin") is not None and first.get("salaryMax") is not None:
        currency = first.get("salaryCurrency", "")
        period   = first.get("salaryPeriod", "")
        salary_parts.append(
            f"{first['salaryMin']:,}--{first['salaryMax']:,} {currency} / {period}"
        )
    salary_str = salary_parts[0] if salary_parts else "not listed"

    print("--- First job ---")
    print(f"  ID          : {first.get('id')}")
    print(f"  Title       : {first.get('jobTitle')}")
    print(f"  Company     : {first.get('companyName')}")
    print(f"  Location    : {first.get('jobGeo')}")
    print(f"  Type        : {first.get('jobType')}")
    print(f"  Industry    : {first.get('jobIndustry')}")
    print(f"  Level       : {first.get('jobLevel')}")
    print(f"  Salary      : {salary_str}")
    print(f"  Published   : {first.get('pubDate')}")
    print(f"  URL         : {first.get('url')}")


def main() -> None:
    print(f"Fetching jobs from: {API_URL}")
    print("-" * 50)

    try:
        data = fetch_jobs()
    except httpx.TimeoutException:
        print("ERROR: Request timed out. The server did not respond in time.")
        return
    except httpx.RequestError as exc:
        print(f"ERROR: Network error -- {exc}")
        return
    except RuntimeError as exc:
        print(f"ERROR: {exc}")
        return
    except ValueError as exc:
        print(f"ERROR: {exc}")
        return

    print(f"HTTP status   : 200 OK")
    print_summary(data)

    # Show the normalized form of the first job to demonstrate the adapter.
    if data.get("jobs"):
        # Generate one fetched_at for the whole run.
        # In a real batch, this same timestamp would be passed to every adapt() call.
        fetched_at = datetime.now(tz=timezone.utc)
        normalized = adapt(data["jobs"][0], fetched_at=fetched_at)
        print()
        print("--- Normalized (first job, description excluded) ---")
        # Exclude long HTML fields so the terminal output stays readable.
        preview = normalized.model_dump(exclude={"description", "excerpt"})
        for key, value in preview.items():
            print(f"  {key:<20}: {value}")


if __name__ == "__main__":
    main()
