# Horizon C

A Superhuman-style Next.js workspace for Gmail + Google Calendar workflows using Corsair-compatible integration APIs and PostgreSQL event logging.

## Features

- Gmail search endpoint + inbox preview UI
- Email draft + send flows
- Google Calendar invite creation flow
- Agent chat endpoint for natural-language task execution (MCP style)
- Webhook ingestion endpoint for realtime updates (works with ngrok)
- Postgres-backed workflow event feed
- Keyboard shortcuts:
  - `/` focus Gmail search

## Tech stack

- Next.js (App Router, TypeScript)
- PostgreSQL (`pg`)
- Zod for request validation

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env file and fill credentials:

```bash
cp .env.example .env.local
```

3. Set up DB schema (optional, required for persistent event feed):

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

4. Start app:

```bash
npm run dev
```

## Environment variables

- `DATABASE_URL`: Postgres connection string
- `CORSAIR_API_URL`: Base URL for Corsair integration APIs
- `CORSAIR_API_KEY`: API key used for Corsair requests

If Corsair env vars are missing, the app runs in mock mode for demo/testing.

## API routes

- `GET /api/email/search?q=...`
- `POST /api/email/draft`
- `POST /api/email/send`
- `POST /api/calendar/invite`
- `POST /api/agent/chat`
- `POST /api/webhooks/corsair`
- `GET /api/workflow/events`

## Webhooks via ngrok (optional)

Expose your local server:

```bash
ngrok http 3000
```

Then configure Corsair webhooks to point to:

`https://<your-ngrok-subdomain>/api/webhooks/corsair`

## Validation

```bash
npm run lint
npm run build
```
