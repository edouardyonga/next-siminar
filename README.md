## Seminar Management Platform

Full-stack Next.js app for managing courses, trainers, conflict detection, AI-powered trainer matching, and email notifications. Built to be production-lean: Zod validation, Prisma + Postgres, rate limiting, CSRF protection, and Mailhog for local email testing.

## Stack
- Next.js 16 (App Router), React 19, TypeScript
- Prisma ORM + PostgreSQL
- Nodemailer + Mailhog (local email)
- OpenAI for AI trainer matching with structured JSON output + fallback heuristic
- Zod validation, JWT session auth, CSRF double-submit middleware, simple rate limiting
- Tailwind v4 (preflight via `globals.css`)

## Quick start (local, with Docker for DB/Mailhog)
1) Prereqs: Node 20+, Docker + Docker Compose.
2) Copy env and fill secrets:
   ```
   cp env.example .env
   ```
3) Start infra (Postgres + Mailhog):
   ```
   docker compose up -d
   ```
4) Install deps: `npm install`
5) Generate client and migrate DB:
   ```
   npx prisma generate
   npx prisma migrate dev
   ```
6) Seed data (trainers, courses, assignment history):
   ```
   npm run seed
   ```
7) Run dev server: `npm run dev` then open http://localhost:3000
8) Login with the admin creds you set in `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).

## Environment variables
Required
- `DATABASE_URL`: Postgres connection string.
- `AUTH_SECRET`: strong secret for signing session JWTs (min 16 chars).
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`: admin login; bcrypt check at runtime.
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_FROM` - Mailhog defaults: host `localhost`, port `1025`, from like `seminars@example.com`.

AI (optional but recommended)
- `OPENAI_API_KEY` – set to your provider key.
- `OPENAI_MODEL` – defaults to `gpt-4o-mini`.
- `OPENAI_BASE_URL` – override for compatible providers.

Rate limiting (optional)
- `RATE_LIMIT_MAX_REQUESTS` – default 120.
- `RATE_LIMIT_WINDOW_MS` – default 60000.

## Running via Docker Compose
`docker-compose.yml` runs:
- `app` (Next.js) on 3000, mounts source
- `db` (Postgres 16) on 5432 with volume
- `mailhog` on SMTP 1025 and UI 8025

You still run `npm install`, `prisma migrate`, `npm run dev` inside the app container or locally while Docker provides Postgres/Mailhog.

## Data model (Prisma)
- `Course`: name, start/end, subjects[], location, participants, notes, price, trainerPrice, status (draft/scheduled/completed/cancelled), optional assignedTrainerId, soft delete, timestamps, indexes on startDate/location/status.
- `Trainer`: name, email (unique), location, trainingSubjects[], availabilityRanges JSON, hourlyRate, rating, timestamps.
- `AssignmentHistory`: courseId, trainerId, action, actor, createdAt.

## Features
- Auth: admin-only login, 12h JWT session cookie, logout, `/api/auth/me`.
- CSRF & rate limit: double-submit token (cookie + `x-csrf-token` header) enforced on mutating `/api/*` via middleware; token issued on login or `GET /api/auth/csrf`. Simple token-bucket rate limit on all `/api/*`.
- Courses: list/filter/sort, create/edit (Zod validation), soft delete, conflict detection (location/trainer overlap) with override path, assignment history writes.
- Trainers: list/search, create/edit/delete (delete unassigns courses + history), availability entry UI.
- Assignment: manual assignment with conflict check + override; email notification to trainer; history tracked.
- AI matching: `/api/courses/:id/match` calls OpenAI (or compatible) with structured JSON prompt; retries/timeout; caches for 5 minutes; fallback heuristic scorer if AI fails; UI shows source/model/cache/fallback reason and allows one-click assignment.
- Email: HTML + text template with course details, goes through Mailhog locally.
- Dashboard UI: Stats, course/trainer panels, assignment panel with AI suggestions, history feed, responsive layout.

## API overview (all under `/api`, JSON)
- Auth: `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `GET /auth/csrf` (fetch token). Login/CSRF routes are CSRF-exempt; all others require `x-csrf-token`.
- Courses: `GET /courses` (list), `POST /courses` (create), `GET/PUT/DELETE /courses/:id` (soft delete on DELETE), `POST /courses/:id/assign` (assign trainer + email + history), `GET /courses/:id/match` (AI/fallback suggestions).
- Trainers: `GET /trainers`, `POST /trainers`, `GET/PUT/DELETE /trainers/:id` (DELETE unassigns courses and records history).
- Assignments history: `GET /assignments` with optional `courseId`/`trainerId` query.

Auth & CSRF
- All mutating calls (POST/PUT/DELETE) must include `x-csrf-token` matching the `csrfToken` cookie. Obtain via `GET /api/auth/csrf` or from login response. Client helper `@/lib/client/csrf` attaches it.
- Session cookie is httpOnly, SameSite=Lax, secure in production.

## Development scripts
- `npm run dev` – start Next.js
- `npm run build && npm start` – production build/serve
- `npm run lint` – lint
- `npm run prisma:migrate` – dev migration
- `npm run prisma:generate` – regenerate client
- `npm run seed` – seed DB

## Mailhog usage
- SMTP: `localhost:1025`
- UI: http://localhost:8025
- Update `MAIL_FROM` to your desired sender; emails are captured in Mailhog locally.

## AI matching behavior
- Structured JSON prompt prioritizes subject fit, then location proximity, availability, rating/experience, cost.
- Retries (max 3) with 15s timeout; 5-minute cache keyed by course + trainer updates.
- Fallback heuristic scoring covers subject overlap, location, availability ranges, rating, workload, and rough cost bias.
- Suggestions limited to top 5; UI shows confidence and reasons; assignment still manual.

## Security notes (summary)
- CSRF double-submit enforced on all mutating `/api/*` except login/CSRF.
- Rate limiting: token bucket (defaults 120 req / 60s per client key).
- HTTPS recommended; keep `.env` secrets safe; rotate `AUTH_SECRET` to invalidate sessions.
- See `SECURITY.md` for details.

## Known gaps / next steps
- Tests are not included.
- No backend pagination on lists (search/sort only).
- No undo/restore for soft-deleted courses.
- Observability/logging is minimal; AI cost tracking not instrumented.
- Single-admin auth only.

## Helpful links
- Mailhog UI: http://localhost:8025
- Prisma Studio (optional): `npm run prisma:studio`
- Seed script: `npm run seed`
