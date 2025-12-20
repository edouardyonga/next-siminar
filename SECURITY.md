# Security Notes

## Authentication & credentials
- Admin login only; credentials are pulled from `ADMIN_EMAIL`/`ADMIN_PASSWORD` and bcrypt-compared at runtime. Use strong values and keep them out of source control.
- Sessions are JWTs signed with `AUTH_SECRET` (12h expiry) and stored in the `session` httpOnly, SameSite=Lax cookie.
- Clearing a session also clears the CSRF cookie; rotating `AUTH_SECRET` invalidates all sessions.

## CSRF protection
- A double-submit token is required for any mutating API call (POST/PUT/PATCH/DELETE) except `/api/auth/login` and `/api/auth/csrf`.
- The token lives in the `csrfToken` cookie and must be echoed in the `x-csrf-token` header.
- Clients can obtain/refresh the token by calling `GET /api/auth/csrf`; it is also issued automatically on login.
- Frontend helpers (`@/lib/client/csrf`) attach the header; reuse them for new fetch calls.

## Rate limiting
- All `/api/*` routes are protected by a simple token-bucket limit (defaults: 120 requests per 60s per client IP).
- Configure via `RATE_LIMIT_MAX_REQUESTS` and `RATE_LIMIT_WINDOW_MS` env vars.

## Operational reminders
- Use HTTPS in production so cookies stay secure-only.
- Keep `.env` restricted; never log credentials or secrets.
- If running behind a proxy, ensure `x-forwarded-for`/`x-real-ip` are forwarded so rate limiting remains accurate.

