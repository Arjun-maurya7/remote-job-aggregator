# Architecture and Engineering Decisions (DECISIONS.md)

This document records the important technical and architectural decisions made during the development of the JobFinder project. It serves as an engineering decision record explaining what was chosen, why, and the trade-offs involved.

---

## ADR-001 — Jobicy as the Initial Job Data Source

### Status
Accepted

### Context
To build a remote job aggregation platform, the system needs a reliable, structured source of job data. Directly scraping job boards introduces significant maintenance complexity, bot detection, aggressive rate limiting, constantly changing page structures, and provider-specific operational constraints, which make building a stable MVP difficult.

### Decision
The project uses the public **Jobicy REST API** as its initial external data source. The external provider is kept strictly behind an adapter boundary (`adapters/jobicy.py`).

### Why
Jobicy provides structured JSON payloads of remote jobs without requiring complex scraping infrastructure. By abstracting Jobicy behind an adapter interface, the core application logic (database, internal models, API) is completely decoupled from Jobicy's specific JSON structure. This ensures that adding future providers (like a hypothetical public RSS feed or another API) will not require rewriting the core application.

### Alternatives Considered
- Direct web scraping via Puppeteer/Playwright: Rejected due to bot detection, IP bans, and high maintenance overhead when DOM structures change.
- Mock data: Rejected as it doesn't prove real-world ingestion capabilities.

### Trade-offs
We are currently reliant on the uptime and data quality of Jobicy. If Jobicy goes down, the initial ingestion pipeline stops. 

### Consequences
The system architecture natively supports multiple job providers, but only one is currently implemented.

---

## ADR-002 — Adapter Pattern for External Job Data

### Status
Accepted

### Context
External APIs return data in arbitrary, highly variable schemas. If these schemas leak into the database models or frontend, a change in the external API breaks the entire application.

### Decision
Implement the **Adapter Pattern** to isolate external data. The Jobicy payload is passed to the `JobicyAdapter`, which translates the external schema into an internal, normalized `JobCreate` Pydantic model. 

### Why
External API schemas should not leak directly into the database, API, or frontend. Normalization guarantees that no matter where a job comes from, the internal system always works with a predictable schema.

### Alternatives Considered
- Direct injection of external JSON to PostgreSQL JSONB columns: Rejected because it pushes normalization logic to the frontend and makes SQL filtering incredibly complex.

### Trade-offs
Adds boilerplate code and requires an explicit mapping layer for every new provider added to the system.

### Consequences
The internal domain model remains clean, predictable, and fully controlled by our application.

---

## ADR-003 — PostgreSQL as the Primary Database

### Status
Accepted

### Context
The aggregated job data must be stored persistently, queried via complex filters (text search, arrays for employment types), and safely updated during concurrent ingestion runs.

### Decision
**PostgreSQL** was selected as the primary relational database.

### Why
The project requires persistent storage, relational integrity, strict uniqueness constraints, transaction safety, and native support for array operations (used for `employment_type` and `industry`). PostgreSQL handles these requirements exceptionally well.

### Alternatives Considered
- SQLite: Rejected because it does not handle concurrent API access and background ingestion writes safely in a production environment, nor does it have native array types.
- MongoDB: Rejected because our data is highly structured and relational filters are easier to enforce with SQL.

### Trade-offs
Requires a running database server, increasing deployment complexity compared to embedded databases.

### Consequences
We can leverage advanced SQL features (like native Array filtering and robust UPSERTs) but must maintain database schemas.

---

## ADR-004 — SQLAlchemy 2.0

### Status
Accepted

### Context
We need a robust way to interact with PostgreSQL from Python without writing raw SQL for every query.

### Decision
Use **SQLAlchemy 2.0** as the persistence layer and ORM.

### Why
SQLAlchemy 2.0 provides an excellent database abstraction, strict model mapping, and safe transaction management. It safely sanitizes inputs, mitigating SQL injection, and offers powerful integrations with PostgreSQL-specific capabilities (like `dialects.postgresql.insert` and `ARRAY` types).

### Alternatives Considered
- Raw SQL (asyncpg/psycopg2): Rejected due to maintainability overhead and lack of type-safe model mapping.
- SQLModel: Considered, but pure SQLAlchemy 2.0 offers more explicit control over complex queries like UPSERTs.

### Trade-offs
SQLAlchemy has a steep learning curve and introduces a slight performance overhead compared to raw SQL.

### Consequences
Data access is clean, explicit, and easily testable. 

---

## ADR-005 — Alembic for Database Migrations

### Status
Accepted

### Context
Database schemas evolve over time. Relying on SQLAlchemy's `Base.metadata.create_all()` is fine for local prototyping but dangerous for production schema management.

### Decision
Use **Alembic** to generate and run versioned database migrations. 

### Why
Alembic provides a reproducible, versioned history of database schema changes, ensuring local, testing, and production databases remain in sync safely. 

### Alembic Incident
During development, a pytest session-scoped teardown fixture used `Base.metadata.drop_all()`. This destructively dropped the `jobs` table but left the `alembic_version` table intact. Therefore, Alembic believed the migration was already applied. Consequently, subsequent production or local ingestion runs failed with a "relation 'jobs' does not exist" error.
*Correction:* We removed the destructive session teardown and now use controlled test data cleanup, preserving the migration-managed schema.

### Alternatives Considered
- `Base.metadata.create_all()` in production: Rejected as it cannot handle `ALTER TABLE` or data migrations safely.

### Trade-offs
Requires developers to remember to generate and apply migration scripts whenever SQLAlchemy models change.

### Consequences
Production deployments can safely upgrade the database schema via Render build scripts.

---

## ADR-006 — Idempotent Ingestion

### Status
Accepted

### Context
The ingestion script runs periodically. If a job is fetched multiple times, it should not create duplicate entries in the database.

### Decision
Ingestion must be **idempotent**. We enforce a unique constraint on `(source, source_job_id)` and use PostgreSQL's `INSERT ... ON CONFLICT DO UPDATE` (UPSERT).

### Why
Repeated ingestion runs do not create duplicate records for the same `(source, source_job_id)` pair because PostgreSQL enforces uniqueness and the repository uses `INSERT ... ON CONFLICT DO UPDATE`. This approach completely eliminates race conditions where two ingestion scripts running concurrently might insert duplicates before seeing each other's data. 

### Alternatives Considered
- Read-before-write: Rejected due to race conditions and increased database round-trips.

### Trade-offs
Ties the ingestion logic directly to PostgreSQL-specific SQL (`dialects.postgresql.insert`), making the database layer harder to swap (though swapping away from Postgres is highly unlikely).

### Consequences
The ingestion script can be run repeatedly safely.

---

## ADR-007 — Single-Transaction Batch Ingestion

### Status
Accepted

### Context
An ingestion run might fetch 100 jobs at once. If 99 are valid but 1 is malformed, how should the database handle the write?

### Decision
Treat a complete ingestion batch run as a **single transaction**. 

### Why
This guarantees consistency. If a structural change in the external API causes the adapter to emit malformed data halfway through a batch, the entire batch rolls back. This prevents the database from entering a partially-updated, inconsistent state.

### Alternatives Considered
- Commit-per-record: Rejected because it creates excessive transaction overhead and allows partial corruption.
- Chunked commits: Deferred until batch sizes grow significantly larger.

### Trade-offs
A single bad record prevents the entire batch from being committed. Currently, partial batch recovery is not implemented.

### Consequences
Data integrity is prioritized over ingestion volume.

---

## ADR-008 — created_at vs fetched_at

### Status
Accepted

### Context
When updating existing jobs, we need to know both when the job first entered our system and when we last saw it active on the provider.

### Decision
Maintain two distinct timestamps:
- `created_at`: When the database record was originally created.
- `fetched_at`: When the external job was last retrieved during an ingestion run.

### Why
During a PostgreSQL UPSERT (`ON CONFLICT DO UPDATE`), `created_at` is specifically excluded from being overwritten, while `fetched_at` is updated to the current timestamp. This allows us to track the total lifetime of a listing.

### Consequences
`fetched_at` provides the information needed for future stale-job detection, expiration, or cleanup policies.

---

## ADR-009 — FastAPI REST API

### Status
Accepted

### Context
The React frontend requires a backend to serve normalized data from the PostgreSQL database. 

### Decision
**FastAPI** is used as the backend API layer.

### Why
FastAPI provides deep integration with Pydantic for request/response validation, robust dependency injection, automatic OpenAPI/Swagger documentation generation, and straightforward REST API development in Python. While FastAPI supports asynchronous applications natively, this project currently uses synchronous API handlers and synchronous SQLAlchemy sessions for simplicity. 

### API Responsibilities
The API is strictly scoped to:
- Health checks
- Job listing (with filters and pagination)
- Job details (fetch by ID)
- Ingestion trigger (manual sync endpoint)

### Consequences
The backend remains lightweight and explicitly typed.

---

## ADR-010 — Search and Filtering in PostgreSQL

### Status
Accepted

### Context
Users need to filter jobs by search terms, location, employment type, industry, and level.

### Decision
Perform **all filtering in PostgreSQL** via SQLAlchemy, rather than loading all jobs into Python memory and filtering there.

### Why
Filtering is performed in PostgreSQL rather than loading all rows into Python memory. For array fields like `employment_type` and `industry`, the repository uses:
```sql
EXISTS (
    SELECT 1 FROM unnest(jobs.employment_type) elem WHERE elem ILIKE :emp_type
)
```
This offloads the filtering work directly to the database engine.

### Trade-offs
Complex filters require nuanced SQLAlchemy query construction. Additionally, as the dataset grows, advanced indexing and search optimization will be needed.

---

## ADR-011 — Offset-Based Pagination

### Status
Accepted

### Context
The API must return job results in paginated chunks to keep UI load times fast.

### Decision
Use **OFFSET + LIMIT** based pagination, ordered reliably by `published_at DESC NULLS LAST, id DESC`.

### Why
Offset pagination is standard, easy to implement in SQL, and easily understood by the frontend. The stable sort order (falling back to `id`) prevents records from randomly jumping between pages when dates match exactly.

### Trade-offs / Limitations
Deep `OFFSET` pagination becomes increasingly expensive in PostgreSQL because the engine must compute and discard all skipped rows. 

### Consequences
Acceptable for the current scale. The secondary `id` ordering provides deterministic ordering for equal `published_at` values, though data changing between requests can still naturally affect page contents.

---

## ADR-012 — React + Vite Frontend

### Status
Accepted

### Context
The platform requires a dynamic, responsive client-side interface to browse jobs.

### Decision
Use **React** built with **Vite**. The frontend consumes the FastAPI REST API and does not connect to the database directly.

### Why
React provides a component-driven architecture perfect for dynamic search interfaces. Vite provides an exceptionally fast local development server and optimized production builds compared to Create React App.

### Consequences
The frontend acts as a completely detached thin client, allowing the backend to scale or change independently.

---

## ADR-013 — DOMPurify for Job Description HTML

### Status
Accepted

### Context
Jobicy returns job descriptions as raw, pre-formatted HTML. To preserve formatting, the React frontend must render this HTML.

### Decision
Use **DOMPurify** to sanitize the HTML before passing it to React's `dangerouslySetInnerHTML`.

### Why
Rendering arbitrary HTML from a third-party source introduces a critical Cross-Site Scripting (XSS) vulnerability. If a malicious payload is embedded in a job description, it would execute in the user's browser. DOMPurify safely strips out `<script>` tags and dangerous attributes while preserving typography structure.

### Consequences
Visual formatting is preserved without compromising frontend security.

---

## ADR-014 — Environment-Based Configuration

### Status
Accepted

### Context
The application runs in multiple environments (local development, test, production). Hardcoding URLs and credentials breaks portability and poses a severe security risk.

### Decision
Use **Environment Variables** for deployment-specific configuration. 
Key variables include: `DATABASE_URL`, `FRONTEND_ORIGIN`, and `VITE_API_BASE_URL`.

### Why
By keeping configuration strictly outside of the codebase, we adhere to 12-Factor App principles. The repository provides a `.env.example` as a safe template. Real credentials are never exposed to version control.

### Consequences
Deploying to a new environment (like Render) simply requires injecting the correct environment variables into the platform dashboard.

---

## ADR-015 — Render Deployment

### Status
Accepted

### Context
The application requires a public production environment to be accessible.

### Decision
The production architecture is deployed natively on **Render**.

### Why
Render handles the specific requirements of our decoupled architecture natively:
- **Render PostgreSQL:** Hosts the managed database.
- **Render Web Service:** Hosts the native Python FastAPI backend.
- **Render Static Site:** Hosts the Vite-built React frontend.

### Consequences
The infrastructure is fully managed in the cloud without requiring manual server provisioning.

---

## ADR-016 — Docker Configuration

### Status
Accepted

### Context
To guarantee environment reproducibility for other developers, the application dependencies and OS-level requirements need to be containerized.

### Decision
Provide `Dockerfile` configurations for both the backend and frontend.

### Why
Docker configuration is present but was not used for the current Render production deployment and has not been independently validated. It exists solely to support containerized local development and outline future deployment flexibility. 

### Consequences
The codebase is ready for container orchestration (like Kubernetes or AWS ECS) if future requirements demand it.

---

## ADR-017 — Testing Strategy

### Status
Accepted

### Context
Core logic (like ingestion, database writes, and API responses) must be proven reliable before deployment.

### Decision
Implement a thorough **pytest-based testing strategy**.

### Why
Tests protect important business behavior. The current suite explicitly verifies:
- API behavior and pagination correctly return data.
- The repository layer correctly executes SQL queries.
- The ingestion script correctly normalizes data via the Jobicy adapter.
- Ingestion idempotency (ensuring UPSERT transactions don't duplicate data).

### Consequences
Refactoring database schemas or internal logic is safe, as regressions will be caught by the test suite.

---

## ADR-018 — Production Search Scaling

### Status
Accepted

### Context
Users need to search job titles and company names. 

### Decision
Current implementation utilizes PostgreSQL's `ILIKE '%term%'` for case-insensitive partial matching.

### Why
This approach is simple, requires zero extra infrastructure, and performs adequately for thousands of records. 

### Trade-offs / Limitations
`ILIKE` with leading wildcards cannot use standard B-Tree indexes, requiring a full table scan. This is a known scalability limitation that is acceptable for the current dataset size.

### Consequences
Search is accurate but will eventually degrade in performance as the database grows.

---

## ADR-019 — Future Pagination Scaling

### Status
Accepted

### Context
As documented in ADR-011, deep `OFFSET` pagination causes database strain. 

### Decision
Acknowledge **Keyset (Cursor) Pagination** as the necessary architectural evolution at scale.

### Why
A cursor-based approach (e.g., `WHERE (published_at, id) < (last_seen_date, last_seen_id)`) allows the database to use indexes to immediately jump to the next page without computing offsets. 

### Consequences
This is strictly documented as a future engineering consideration. It is not currently implemented, keeping the MVP simple.

---

## ADR-020 — Frontend Deployment Configuration

### Status
Accepted

### Context
The React frontend needs to know where the FastAPI backend lives.

### Decision
`VITE_API_BASE_URL` is configured at frontend build time.

### Why
Vite embeds `VITE_*` environment variables directly into the compiled JavaScript bundle at build time. Because the static site runs entirely in the user's browser, it cannot read server-side environment variables at runtime. Therefore, the production frontend is configured at build time to communicate with the deployed Render FastAPI backend.

### Consequences
The frontend build process on Render must be supplied with the production backend URL prior to compilation.

---

# Future Engineering Considerations

The current architecture supports the MVP cleanly, but the following improvements are realistic next steps as the platform scales:

- **Keyset Pagination:** Replacing `OFFSET` with cursor-based pagination for highly efficient deep-page browsing.
- **Search Indexing:** Upgrading `ILIKE` searches to use PostgreSQL `pg_trgm` (Trigram) or `GIN` indexes, or implementing full-text search (`to_tsvector`).
- **Background Ingestion Workers:** Moving the synchronous ingestion script to a resilient background queue (e.g., Celery or ARQ) scheduled via cron.
- **Additional Job Providers:** Leveraging the Adapter pattern to integrate new sources (e.g., Wellfound, Indeed) with specific rate-limit handling and exponential backoff retry logic for API failures.
- **Caching:** Implementing Redis caching for the primary `/api/jobs` listing endpoint to reduce database load.
- **Observability:** Adding structured logging, Prometheus metrics, and APM tracing to monitor ingestion health and API performance.
