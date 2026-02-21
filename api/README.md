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
