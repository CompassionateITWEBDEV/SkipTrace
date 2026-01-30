# Compliance & Data Handling

This document summarizes SkipTrace’s approach to data handling and compliance-relevant endpoints.

## Data Handling

- **Search data**: Queries and results are stored for logged-in users (reports, search logs) and may be cached for performance.
- **Retention**: Configurable per deployment; users can request export or deletion (see below).
- **No resale**: We do not resell or share search data with third parties for marketing.

## User Rights Endpoints

| Action | Endpoint | Method | Description |
|--------|----------|--------|-------------|
| Export my data | `/api/compliance/export-data` | GET | Returns a copy of the user’s data (requires auth). |
| Delete my data | `/api/compliance/delete-data` | POST | Deletes user data; body can request full account deletion. |
| Health check | `/api/health` | GET | Service health (DB, Redis); no auth. |

## Security Headers

The application sets security headers via `next.config.mjs` (e.g. X-Frame-Options, X-Content-Type-Options, Referrer-Policy).

## Rate Limiting

Auth and sensitive routes are rate-limited to reduce abuse. When limits are exceeded, the API returns `429 Too Many Requests`.

## Deployment

For production, ensure:

- `DATABASE_URL` and `DIRECT_URL` use TLS.
- `NEXTAUTH_SECRET` is a strong random value.
- Redis (if used) is secured and not exposed publicly.
- Environment variables containing secrets are not committed to source control.

For more detail on architecture and services, see [microservices-architecture.md](./microservices-architecture.md).
