# Production readiness

## Configuration

- Deploy the Next.js and FastAPI applications as separate services over HTTPS.
- Store all secrets in provider-managed environment configuration. Browser code receives only the Supabase URL and publishable key.
- Set `APP_ENV=production`, an exact HTTPS `FRONTEND_URL`, and production Supabase/database values on FastAPI.
- Configure the same frontend origin and exact Auth callback/reset URLs in Supabase.
- Keep FastAPI private from direct database clients where the platform supports network restrictions.

The selected staging providers and exact setup are documented in [staging-deployment.md](staging-deployment.md).

FastAPI allows CORS only from `FRONTEND_URL`, verifies protected bearer tokens, returns request IDs, applies safe API cache/security headers, and rate-limits anonymous enquiry submissions per process. A shared edge/WAF limiter is required when deploying multiple API workers because in-memory counters are not distributed.

The frontend adds CSP, clickjacking, MIME-sniffing, referrer, and browser-permission headers. Review CSP whenever adding an analytics, image, font, API, or other external origin.

## Deployment order

1. Back up the target database and record its migration revision.
2. Apply reviewed, forward-compatible database migrations.
3. Deploy FastAPI and verify `/api/v1/health` plus OpenAPI availability policy.
4. Deploy Next.js and run authentication, booking, admin, upload, and report smoke journeys.
5. Watch structured application/platform logs by request ID, error rate, latency, and database saturation.

## Incident response

- Revoke or rotate exposed credentials immediately and redeploy affected services.
- Disable the affected route at the edge when abuse is active.
- Use request IDs to correlate platform and API errors; do not add tokens, passwords, or guest form bodies to logs.
- Prefer rolling the application forward. Use the tested recovery procedure for incompatible data failures.
