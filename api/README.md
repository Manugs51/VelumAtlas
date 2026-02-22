# VelumAtlas API

TypeScript REST API (Fastify) for the finance ledger schema in `database/001_finance_schema.sql`.

## Prerequisites

- Node.js 20+
- PostgreSQL running locally
- Database created and schema applied

## Setup

1. Install dependencies from the API folder:

```bash
cd api
npm install
```

2. Copy env file:

```bash
cp .env.example .env
```

3. Update `api/.env` with your Postgres credentials.

## Run

From `api` folder:

```bash
npm run dev
```

API base URL: `http://localhost:4000`
Docs UI: `http://localhost:4000/docs`
OpenAPI JSON: `http://localhost:4000/docs/json`

## Test suites

### API tests with mocked tables

The GET route suite uses in-memory mock values for all current finance tables (`owners`, `accounts`, `instruments`, `ledger_transactions`, `postings`, `import_profiles`, plus market/snapshot tables) so endpoint tests are deterministic and do not require a running database.

```bash
npm run test
```

### k6 API and browser E2E tests

From the repository root:

```bash
npm run test:k6:api
npm run test:k6:browser
```

Environment variables:

- `BASE_URL` for `tests/k6/api-get-suite.js` (default `http://localhost:3000`)
- `WEB_BASE_URL` for `tests/k6/e2e-fileformats-browser.js` (default `http://localhost:5173`)

> Requires `k6` with browser support (`k6/browser`) installed in your environment.

## Endpoints

- `GET /health`
- `GET /api/v1/owners`
- `POST /api/v1/owners`
- `GET /api/v1/accounts?ownerId=<uuid>`
- `POST /api/v1/accounts`
- `GET /api/v1/instruments`
- `POST /api/v1/instruments`
- `GET /api/v1/transactions`
- `GET /api/v1/transactions/:id`
- `POST /api/v1/transactions`
- `GET /api/v1/import-profiles`
- `POST /api/v1/import-profiles`
