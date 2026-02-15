# Scalable URL Shortener (System Design Project)

A production-style URL shortener backend in Node.js + MySQL focused on hashing, indexing, caching, and scalability tradeoffs.

## Features

- `POST /shorten` to create short links
- `GET /:shortCode` to redirect to original URL
- Collision-resistant short code generation (base62 + crypto randomness)
- MySQL persistence with unique indexed `short_code`
- In-memory LRU cache for hot read paths
- In-memory IP rate limiting
- `click_count` tracking
- Optional link expiry (`ttlDays`)

## API

### `POST /shorten`

Request body:

```json
{
  "originalUrl": "https://example.com/some/long/path",
  "ttlDays": 7
}
```

Response:

```json
{
  "shortCode": "a1B2c3D4",
  "shortUrl": "http://localhost:3000/a1B2c3D4",
  "originalUrl": "https://example.com/some/long/path",
  "expiresAt": "2026-02-22T20:00:00.000Z"
}
```

### `GET /:shortCode`

- `302` redirect for active links
- `404` if code does not exist
- `410` if link is expired

## Database Design

Schema file: `db/schema.sql`

Table: `urls`

- `id` (PK)
- `original_url`
- `short_code` (`UNIQUE`, indexed)
- `created_at`
- `click_count`
- `expires_at` (nullable)

## Setup

1. Copy `.env.example` to `.env` and fill your MySQL credentials.
1. Create schema/table:

```sql
SOURCE db/schema.sql;
```

1. Install dependencies and start:

```bash
npm install
npm run start
```

If port `3000` is busy on your machine, set in `.env`:

```dotenv
PORT=3001
BASE_URL=http://127.0.0.1:3001
```

## Docker (One Command)

Run app + MySQL together:

```bash
docker compose up --build
```

Then test:

- Health: `http://localhost:3000/health`
- Create short URL: `POST http://localhost:3000/shorten`

Stop containers:

```bash
docker compose down
```

## Web UI

Open the app in your browser:

- `http://localhost:3000/`

Live Server mode:

- Open `src/views/index.html` with VS Code Live Server (`http://127.0.0.1:5500`)
- Keep the API running on `http://127.0.0.1:3001`
- The UI will call `POST http://127.0.0.1:3001/shorten`

Use the form to:

- Paste a long URL
- Optionally set `ttlDays`
- Get a shortened URL
- Copy or open the result directly

## Performance Work

### 1) Benchmark without index vs with index

Run:

```bash
npm run benchmark:db
```

What it does:

- Creates a benchmark table with 100k rows
- Measures lookup latency without index
- Adds index on `short_code`
- Measures lookup latency again
- Prints improvement percentage

### 2) Add caching layer and compare API latency

Run app first and create one known short code, then run:

```bash
npm run benchmark:api -- http://localhost:3000/<shortCode>
```

The script runs two phases:

- Cold cache phase (initial misses)
- Warm cache phase (high hit rate)

Compare average latency and requests/sec between the two phases.

## Tests

Run:

```bash
npm test
```

Included unit tests:

- Short code generation shape/length
- Collision handling retry path
- Expired link logic (`410` behavior + helper)

## Scalability: Path to 10M Users

- **Load balancer**: Put API nodes behind an L7 load balancer (NGINX/ALB) with health checks.
- **Horizontal scaling**: Run multiple stateless API instances; move cache/rate limit state to Redis for multi-node consistency.
- **Read replicas**: Route `GET /:shortCode` reads to replicas; keep writes on primary.
- **Partitioning strategy**: If table growth is very large, shard by hash(short_code) or by range on `id`.
- **Queue-based analytics**: Push click events to Kafka/SQS and aggregate asynchronously.
- **Reliability**: Add retries, circuit breakers, and observability (metrics, tracing, structured logs).

## Project Structure

- `src/app.js` - Express app and routes
- `src/services/urlService.js` - business logic
- `src/repositories/urlRepository.js` - SQL queries
- `src/cache/lruCache.js` - in-memory LRU cache
- `src/middleware/rateLimit.js` - in-memory rate limiter
- `benchmarks/*` - performance scripts
- `tests/*` - unit tests
