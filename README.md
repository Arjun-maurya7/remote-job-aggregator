# Job Ingestion & Search Platform

A reliable, production-ready remote job ingestion and search platform built with Python, FastAPI, SQLAlchemy, PostgreSQL, Alembic, Docker, and React + JavaScript.

---

## Overview

This project is an end-to-end job ingestion and search platform. It retrieves public remote job listings from the **Jobicy REST API v2**, normalizes the external payload into an internal domain model, persists records in **PostgreSQL** using single-transaction idempotent upserts, exposes the dataset via a **FastAPI** REST API, and presents an interactive **React + JavaScript** dashboard for searching, filtering, and browsing jobs.

---

## Features

- **Legitimate Data Ingestion**: Ingests job data cleanly from Jobicy's public REST API (`https://jobicy.com/api/v2/remote-jobs`) with identifying User-Agent (`JobIngestionDemo/0.1`).
- **Adapter & Domain Boundary**: Isolates external API schema variations from internal application models.
- **Atomic Batch Orchestration**: Executes ingestion runs within a single database transaction. If any job fails normalization or persistence, the entire batch is atomically rolled back.
- **Idempotent Upserts**: Employs PostgreSQL's `INSERT ... ON CONFLICT DO UPDATE` on `(source, source_job_id)` to update existing listings in-place without creating duplicate rows.
- **Decoupled Timestamp Semantics**: Separates original database creation time (`created_at`) from source retrieval timestamp (`fetched_at`).
- **FastAPI REST Endpoints**: Implements `/`, `/health` (with `SELECT 1` DB ping), `/jobs`, `/jobs/{id}`, and `/ingestion/run`.
- **Search, Filtering & Pagination**: Performs case-insensitive broad keyword search (`ILIKE`), location/job-level filtering, PostgreSQL `TEXT[]` array containment filtering (`ANY`), and page-based offset pagination (`published_at DESC NULLS LAST, id DESC`).
- **Alembic Database Migrations**: Manages production database schema changes cleanly through revision scripts.
- **React + JavaScript Dashboard**: User-friendly frontend dashboard with search inputs, dropdown filters, pagination controls, DOMPurify HTML sanitization, and manual sync ingestion triggers.
- **Containerized Architecture**: Production `Dockerfile` configurations for FastAPI backend and multi-stage Nginx frontend build, orchestrated via `compose.yml`.

---

## Architecture

```text
Jobicy Public API (REST v2)
         │
         ▼
  HTTPX Client (client.py)
         │
         ▼
Jobicy Adapter (adapters/jobicy.py)
         │
         ▼
Pydantic Job Model (models/job.py)
         │
         ▼
Ingestion Orchestrator (ingestion/jobicy.py)
         │ (Single Transaction Rollback / Commit)
         ▼
SQLAlchemy Repository (database/repository.py)
         │ (PostgreSQL ON CONFLICT Upsert)
         ▼
PostgreSQL Database (database/models.py)
         │
         ▼
FastAPI REST API (app/main.py)
         │
         ▼ (HTTP JSON Fetch / CORS Allowed)
React + JavaScript Dashboard (frontend/src/)
```

### Adapter Pattern Rationale

The Jobicy adapter converts external fields (`jobTitle`, `companyName`, `jobGeo`, `jobType`, `pubDate`) into our internal `Job` model (`title`, `company`, `location`, `employment_type`, `published_at`). This decouples our database schema and API response endpoints from external changes, making it seamless to add future job providers (e.g. GitHub Jobs, Remotive) without refactoring the application core.

---

## Tech Stack

- **Backend Framework**: Python 3.12, FastAPI, Uvicorn
- **ORM & Database**: SQLAlchemy 2.0, PostgreSQL, `psycopg2-binary`
- **Database Migrations**: Alembic
- **HTTP & Validation**: HTTPX, Pydantic v2
- **Frontend**: React 19, Vite, JavaScript (ES6+), React Router v7, DOMPurify, CSS3
- **Containerization & Tooling**: Docker, Docker Compose, Nginx, Pytest, Oxlint

---

## Project Structure

```text
project2/
│
├── app/
│   ├── main.py                # FastAPI application endpoints & CORS setup
│   └── schemas.py             # Pydantic request/response schemas
│
├── adapters/
│   └── jobicy.py              # Jobicy API raw payload → normalized Job adapter
│
├── database/
│   ├── connection.py          # SQLAlchemy engine creation & env loading
│   ├── models.py              # SQLAlchemy ORM JobRecord schema definition
│   └── repository.py          # PostgreSQL save_job upsert & filter queries
│
├── ingestion/
│   └── jobicy.py              # Batch ingestion pipeline orchestrator
│
├── models/
│   ├── job.py                 # Application domain Job model (Pydantic)
│   └── ingestion_result.py    # Ingestion stats dataclass
│
├── tests/
│   ├── test_api.py            # FastAPI REST API unit/integration tests
│   ├── test_ingestion.py      # Ingestion pipeline & transaction rollback tests
│   ├── test_jobicy_adapter.py # Adapter mapping & transformation tests
│   └── test_repository.py     # Repository upsert & timestamp integration tests
│
├── frontend/
│   ├── src/
│   │   ├── components/        # Header, SearchBar, Filters, JobCard, Pagination, Loading
│   │   ├── pages/             # Home (Dashboard) & JobDetails pages
│   │   ├── services/          # Centralized JavaScript API fetch service (api.js)
│   │   ├── App.jsx            # React Router route configuration
│   │   ├── main.jsx           # Vite entrypoint
│   │   └── index.css          # Styling stylesheet
│   ├── Dockerfile             # Multi-stage production Nginx build
│   └── package.json           # Frontend dependencies & scripts
│
├── alembic/                   # Alembic environment & migration revisions
│   ├── versions/
│   └── env.py
│
├── .env.example               # Root environment variable template
├── .gitignore                 # Git ignore rules
├── Dockerfile                 # FastAPI production backend Dockerfile
├── compose.yml                # Docker Compose orchestration
├── run_ingestion.py           # Ingestion CLI execution script
├── requirements.txt           # Backend Python dependencies
└── README.md                  # Project documentation
```

---

## Data Flow

```text
1. Trigger Ingestion (POST /ingestion/run or CLI script)
       │
2. HTTPX fetches jobs payload from Jobicy API
       │
3. Batch Timestamp generated once (fetched_at = UTC NOW)
       │
4. Adapter transforms raw dictionary → Pydantic Job model
       │
5. Repository executes pg_insert ON CONFLICT (source, source_job_id)
       │   └─ created_at set once on INSERT; excluded from UPDATE
       │   └─ RETURNING (xmax = 0) evaluates inserted vs updated
       │
6. Commit on full success OR Rollback on any failure
       │
7. FastAPI serves normalized data to React Frontend via REST API
```

---

## API Endpoints

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `GET` | `/` | API identity and status | `200 OK` |
| `GET` | `/health` | Application health and database connectivity (`SELECT 1`) | `200 OK`, `503 Service Unavailable` |
| `GET` | `/jobs` | Search, filter, and paginate stored jobs | `200 OK` |
| `GET` | `/jobs/{id}` | Retrieve single job by internal PostgreSQL primary key | `200 OK`, `404 Not Found` |
| `POST` | `/ingestion/run` | Trigger a batch ingestion run from Jobicy API | `200 OK`, `500 Internal Error`, `502 Bad Gateway` |

---

## Environment Variables

Copy `.env.example` to `.env` in the root directory:

```env
# PostgreSQL Database Connection URL
DATABASE_URL=postgresql+psycopg2://postgres:password@localhost:5432/job_ingestion

# FastAPI Allowed Frontend CORS Origin
FRONTEND_ORIGIN=http://localhost:5173

# Frontend Target API URL (frontend/.env)
VITE_API_BASE_URL=http://localhost:8000
```

---

## Database Setup & Migrations

### 1. Initialize Database Schema via Alembic Migrations

To apply database migrations to a clean PostgreSQL database:

```bash
# Run Alembic migrations to current head
.venv\Scripts\alembic upgrade head

# Verify current revision
.venv\Scripts\alembic current
```

---

## Local Development

### 1. Start Backend FastAPI Server

```bash
# Run FastAPI via Uvicorn in development mode
.venv\Scripts\uvicorn app.main:app --reload --port 8000
```

Interactive OpenAPI documentation is available at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### 2. Run Ingestion via CLI

```bash
.venv\Scripts\python run_ingestion.py
```

---

## Frontend Setup

```bash
cd frontend

# Install Node dependencies
npm install

# Start Vite local development server
npm run dev

# Run Oxlint linter
npm run lint

# Build production bundle
npm run build
```

---

## Docker Compose Setup

Run the full-stack system (PostgreSQL, FastAPI Backend, and React/Nginx Frontend) in containers:

```bash
# Build and start container services
docker compose up --build

# Access services:
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
```

---

## Testing

Execute the complete 41-test backend test suite against PostgreSQL:

```bash
.venv\Scripts\pytest tests/ -v
```

---

## Example API Requests

### 1. Paginated Listing
```http
GET /jobs?page=1&limit=20
```

### 2. Search & Filter
```http
GET /jobs?search=python&location=India&employment_type=Full-Time&page=1&limit=20
```

### 3. Get Single Job
```http
GET /jobs/1
```

---

## Design Decisions

- **PostgreSQL Native Arrays (`TEXT[]`)**: Preserves array structures (`employment_type`, `industry`) without requiring complex junction tables or string conversions.
- **`xmax` System Column for Upserts**: Uses PostgreSQL's `RETURNING (xmax = 0)` to detect `inserted` vs `updated` in a single SQL operation without pre-SELECT queries.
- **Single-Transaction Ingestion**: Enforces all-or-nothing batch atomicity (`rollback` on error), keeping the database clean.
- **DOMPurify Sanitization**: Strips XSS attack vectors from external Jobicy HTML descriptions before rendering in React.

---

## Scalability Considerations

- **Keyset / Cursor Pagination**: Replace `OFFSET/LIMIT` with cursor pagination (`WHERE (published_at, id) < (last_published_at, last_id)`) for deep pagination performance.
- **`pg_trgm` / Full-Text Search**: Introduce GIN indexes or PostgreSQL `tsvector` for large-scale keyword search.
- **Asynchronous Worker Queue**: Offload ingestion from HTTP thread to Celery/Redis background workers.

---

## Future Improvements

1. Multi-source job adapters (Remotive, Wellfound).
2. Dynamic filter options API (`GET /jobs/filters`).
3. Scheduled cron ingestion workers.
