# URL Shortener

A backend URL shortener built with a focus on production-style practices — structured logging, cache-aside caching with Redis, and centralized error handling — rather than just the happy path.

## Features

- Shorten a URL and get back a short, unique code
- Redirect from the short code to the original URL, with click tracking
- Redis cache-aside layer in front of Postgres — cache hits skip the DB read entirely, and the cache **fails open**: if Redis is unavailable, requests still succeed by falling through to the database
- Structured JSON logging (Pino) — every request is logged with a correlation ID, method, status code, and response time, so a single request's full lifecycle can be traced through the logs
- Centralized error handling that distinguishes **expected** errors (e.g. "short code not found" → 404, logged as a warning) from **unexpected** ones (e.g. a DB failure → 500, logged with full detail, without leaking internals to the client)
- Health check endpoint for uptime/monitoring

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js (ES Modules) |
| Framework | Express 5 |
| Database | PostgreSQL |
| Cache | Redis (Upstash, hosted) |
| Logging | Pino + pino-http |
| ID generation | nanoid |

## Architecture Notes

- **Cache-aside pattern**: on a lookup, Redis is checked first; on a miss, Postgres is queried and the result is written back to Redis with a 1-hour TTL.
- **Fail-open caching**: Redis errors are caught and logged as warnings, not treated as request failures — a cache outage degrades performance, not availability.
- **Operational vs. unexpected errors**: a custom `AppError` class marks errors that are normal, expected outcomes (bad input, not found) so the error handler can respond with the real message and a 4xx code. Anything else is treated as a bug — logged with full detail, but returned to the client as a generic 500.
- **Async error handling**: route handlers are wrapped in a small `catchAsync` utility so thrown/rejected errors are automatically forwarded to the centralized error handler, instead of repeating try/catch in every route.

## Getting Started

### Prerequisites
- Node.js 18+
- A PostgreSQL database (local or hosted)
- A Redis instance (local, or hosted — e.g. [Upstash](https://upstash.com))

### Setup

```bash
git clone <this-repo-url>
cd <repo-folder>
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

## API

### Create a short URL
```bash
curl -X POST http://localhost:3001/api/urls \
  -H "Content-Type: application/json" \
  -d '{"url": "https://google.com"}'
```
Response:
```json
{ "shortUrl": "http://localhost:3001/api/urls/r4pR_1" }
```

### Follow a short URL
```bash
curl -i http://localhost:3001/api/urls/r4pR_1
```
Responds with a `302` redirect to the original URL, and increments the click count.

## Possible Extensions

- Custom aliases for short codes
- Analytics dashboard (clicks over time, referrers)
- Rate limiting on URL creation
- Expiry dates for short URLs