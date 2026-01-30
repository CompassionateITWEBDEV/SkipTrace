# SkipTrace (MASE Intelligence)

Next.js-based people search platform with multi-method searches (email, phone, name, address), analytics, batch processing, and monitoring.

## Setup

```bash
pnpm install
cp .env.example .env   # if present; edit .env with your values
pnpm exec prisma migrate deploy
pnpm build
pnpm start
```

Development:

```bash
pnpm dev
```

## Environment variables

- **Database**: `DATABASE_URL` (PostgreSQL)
- **Auth**: `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (e.g. `http://localhost:3000`)
- **Redis** (optional, for cache and queues): `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_TLS`
- **Stripe**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PROFESSIONAL`, `STRIPE_PRICE_ENTERPRISE` (Stripe Price IDs for plans)
- **Resend** (email notifications): `RESEND_API_KEY`, `NOTIFICATION_EMAIL_FROM`
- **RapidAPI** (skip-trace data): `RAPIDAPI_KEY`; optional `RAPIDAPI_ALT_KEY` for fallback when `FALLBACK_API_PROVIDER=enabled`
- **Secondary data provider** (optional): `SECONDARY_SEARCH_API_URL`, `SECONDARY_SEARCH_API_KEY` (HTTP POST endpoint for failover)
- **Base URL**: `NEXT_PUBLIC_BASE_URL` (e.g. `https://your-domain.com`), `NEXT_PUBLIC_CONTACT_EMAIL` (for Contact Sales)

## Workers (background jobs)

Run these in separate processes (or use a process manager) so batch and monitoring jobs are processed.

- **Batch search worker** (processes batch search jobs from the queue):
  ```bash
  pnpm worker:batch
  ```
- **Monitoring worker** (runs monitoring subscription checks):
  ```bash
  pnpm worker:monitoring
  ```

Requires Redis and the same env (e.g. `DATABASE_URL`, `RAPIDAPI_KEY`). Start Redis before running workers.

## User-facing docs

See [docs/user-guide.md](docs/user-guide.md) for batch search, monitoring subscriptions, rate limits, and account/billing.
