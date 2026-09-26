# URL Shortener

A backend URL shortener built with a focus on production-style practices — structured logging, cache-aside caching with Redis, containerized deployment, and a full CI/CD pipeline — rather than just the happy path.

**Live demo:** https://url-shortener-latest-22co.onrender.com
*(hosted on Render's free tier — the first request after idle time may take ~30-60s to wake the instance)*

[![CI](https://github.com/jammer98/project_Url/actions/workflows/ci.yml/badge.svg)](https://github.com/jammer98/project_Url/actions/workflows/ci.yml)

## Features

- Shorten a URL and get back a short, unique code
- Redirect from the short code to the original URL, with click tracking
- Redis cache-aside layer in front of Postgres — cache hits skip the DB read entirely, and the cache **fails open on both reads and writes**: if Redis is unavailable, requests still succeed by falling through to the database
- Structured JSON logging (Pino) — every request is logged with a correlation ID, method, status code, and response time, so a single request's full lifecycle can be traced through the logs
- Centralized error handling that distinguishes **expected** errors (e.g. "short code not found" → 404, logged as a warning) from **unexpected** ones (e.g. a DB failure → 500, logged with full detail, without leaking internals to the client)
- Health check endpoint for uptime/monitoring
- Containerized with Docker, built and tested in CI, and deployed as a published container image

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js 24 (ES Modules) |
| Framework | Express 5 |
| Database | PostgreSQL ([Neon](https://neon.tech), hosted) |
| Cache | Redis ([Upstash](https://upstash.com), hosted) |
| Logging | Pino + pino-http |
| ID generation | nanoid |
| Testing | Vitest |
| Containerization | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| Container registry | GitHub Container Registry (GHCR) |
| Hosting | Render (deployed from a GHCR image) |

## Architecture Notes

- **Cache-aside pattern**: on a lookup, Redis is checked first; on a miss, Postgres is queried and the result is written back to Redis with a 1-hour TTL.
- **Fail-open caching**: Redis errors are caught and logged as warnings, not treated as request failures — a cache outage degrades performance, not availability. This is deliberately tested by stopping the Redis container while the app is running.
- **Operational vs. unexpected errors**: a custom `AppError` class marks errors that are normal, expected outcomes (bad input, not found) so the error handler can respond with the real message and a 4xx code. Anything else is treated as a bug — logged with full detail, but returned to the client as a generic 500.
- **Async error handling**: route handlers are wrapped in a small `catchAsync` utility so thrown/rejected errors are automatically forwarded to the centralized error handler, instead of repeating try/catch in every route.

## CI/CD Pipeline

Every push to `main` runs a GitHub Actions workflow (`.github/workflows/ci.yml`) that:

1. Checks out the code and installs dependencies (`npm ci`)
2. Runs the test suite (Vitest)
3. Builds the Docker image (fails the build if the image doesn't build cleanly)
4. On success, builds and pushes the image to GHCR: `ghcr.io/jammer98/url-shortener:latest`

A broken test or a broken build fails the pipeline before any image is published — the `push-image` job only runs if `build-and-test` passes.

```
git push → GitHub Actions → npm ci → tests → docker build → (if main) → push to GHCR → Render pulls new image
```

## Running Locally with Docker (recommended)

The fastest way to run the whole stack — API, Postgres, and Redis — with one command:

```bash
git clone <this-repo-url>
cd project_Url
docker compose up --build
```

This starts:
- **api** — the Express app, built from the local `Dockerfile`, on port 3001
- **postgres** — Postgres 16, with the `urls` table auto-created from `init.sql`
- **redis** — Redis 7

No manual `.env` setup needed for this path — `docker-compose.yml` already wires the containers together over Docker's internal network.

Verify it's up:
```bash
curl -X POST http://localhost:3001/api/urls \
  -H "Content-Type: application/json" \
  -d '{"url": "https://google.com"}'
```

## Running Locally without Docker

### Prerequisites
- Node.js 20+
- A PostgreSQL database (local or hosted)
- A Redis instance (local, or hosted — e.g. [Upstash](https://upstash.com))

### Setup

```bash
git clone <this-repo-url>
cd project_Url
npm install
cp .env.example .env
```

Fill in `.env`:
```
DATABASE_URI=postgres://user:password@host:port/dbname
REDIS_URL=rediss://default:password@host:port
PORT=3001
```

Create the database table:
```sql
CREATE TABLE urls (
  id SERIAL PRIMARY KEY,
  short_code VARCHAR(10) UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

Run it:
```bash
npm run dev    # auto-restarts on file changes
# or
npm start      # single run, production-style
```

## Deployment

The app is deployed as a container, not with a platform's auto-deploy-from-source feature:

- **Image**: built and published by CI to `ghcr.io/jammer98/url-shortener` on every push to `main`
- **Hosting**: [Render](https://render.com) Web Service, configured to run that published image
- **Database**: [Neon](https://neon.tech) — managed, serverless Postgres
- **Cache**: [Upstash](https://upstash.com) — managed Redis, reached over TLS (`rediss://`)

Environment variables are set directly in Render's dashboard and are never committed to the repo (see `.gitignore`).

## API

### Create a short URL
```bash
curl -X POST https://url-shortener-latest-22co.onrender.com/api/urls \
  -H "Content-Type: application/json" \
  -d '{"url": "https://google.com"}'
```
Response:
```json
{ "shorturl": "https://url-shortener-latest-22co.onrender.com/api/urls/r4pR_1" }
```

### Follow a short URL
```bash
curl -i https://url-shortener-latest-22co.onrender.com/api/urls/r4pR_1
```
Responds with a `302` redirect to the original URL, and increments the click count.

## Testing

```bash
npm test
```
Runs the Vitest suite. This also runs automatically in CI on every push and pull request to `main`.

## Possible Extensions

- Custom aliases for short codes
- Analytics dashboard (clicks over time, referrers)
- Rate limiting on URL creation
- Expiry dates for short URLs
- Health check endpoint wired into Render's health checks for zero-downtime deploys
