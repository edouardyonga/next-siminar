## Architecture & Design Decisions

**Overall architecture**  
- Next.js App Router; API routes in `src/app/api/*`, UI in `src/app`.  
- Shared logic in `src/lib` (auth/session, env parsing, validation, ai-matching, conflicts, mail, security/CSRF).  
- Prisma/Postgres data layer with soft-deleted courses and assignment history for auditability.  
- Middleware enforces CSRF + rate limiting on all `/api/*`.  
- Client providers: `AuthProvider` (session gate) and `DashboardProvider` (data fetching, mutations, toasts).

**Libraries & frameworks**  
- Next.js/React/TypeScript; App Router for co-located API + UI.  
- Prisma + Postgres for relational modeling/migrations.  
- Zod for runtime validation.  
- bcryptjs for JWT auth and password hashing.  
- Nodemailer -> Mailhog for local email.  
- OpenAI (fetch) for AI matching in JSON mode 
- Tailwind v4 for styling

**Database schema**  
- `Course`: subjects[], location, start/end, participants, notes, price/trainerPrice, status enum, optional assignedTrainerId, soft delete, indexes on startDate/location/status.  
- `Trainer`: unique email, trainingSubjects[], location, availabilityRanges JSON, hourlyRate, rating.  
- `AssignmentHistory`: courseId, trainerId, action, actor, createdAt; indexes on courseId/trainerId.  
- Relations: Course ↔ Trainer (many-to-one), Course ↔ AssignmentHistory (one-to-many).

---

## Implementation Details

**Conflict detection**  
- Overlap check on dates for location conflicts and trainer double-booking; ignores soft-deleted rows and self on update.  
- Returns reasons; 409 unless `allowOverride` is passed. Complexity O(k) on filtered overlaps; relies on date/location indexes.

**AI-powered trainer matching**  
- Structured prompt with course + trainer context; expects JSON `{ suggestions: [{trainerId, score, confidence, reasons[]}] }`.  
- OpenAI chat completions (15s timeout, 3 retries). 5-minute cache keyed by course + trainer updatedAt.  
- Parses/clamps scores/confidence, validates trainer IDs.  
- On failure/empty, falls back to heuristic scoring (subject overlap, location, availability fit, rating, workload, cost bias).  
- Response tags source (`ai`/`fallback`/`cached`), model, fallbackReason/error.

**Trainer assignment & email**  
- `POST /api/courses/:id/assign`: auth + CSRF + conflict check → update course → write assignment history → send nodemailer email (HTML/text) via Mailhog.  
- Email failures reported in response but do not block assignment.

**Security measures**  
- Auth: JWT (HS256) 12h, httpOnly SameSite=Lax cookie; bcrypt against env admin creds.  
- CSRF: double-submit (cookie `csrfToken` + header `x-csrf-token`) on all mutating `/api/*` except login/CSRF fetch.  
- Rate limiting: token bucket (default 120 req / 60s per client key).  
- Validation: Zod on inputs; Prisma parameterization mitigates SQLi.  
- Secure cookies in production; env schema validation; no client-side secret exposure.

**Error handling**  
- API returns `{ error: { message, status } }`; 409 for conflicts, 401 for auth.  
- Client shows inline errors/toasts; conflicts rendered with override CTA.  
- AI retries/backoff + fallback; email errors surfaced but non-fatal.

---

## Technical Questions

**Start command**  
- `docker compose up -d` (DB + Mailhog), then `npm install && npx prisma migrate dev && npm run seed && npm run dev`

**Scaling to 10k+ courses**  
- Add server-side pagination/filter/sort; maintain/extend indexes (date, status, location, subjects via GIN if needed).  
- Cache list endpoints; use connection pooling/read replicas.

**Concurrent trainer assignments**  
- Wrap assignment in a transaction/row lock on the course; re-check conflicts inside the tx.  
- Or `UPDATE ... WHERE id=:id AND (assignedTrainerId IS NULL OR assignedTrainerId=:same)`; return 409 if no row updated.

**Testing strategy**  
- Unit: validation schemas, conflict detector, AI parser/fallback, CSRF helpers.  
- Integration: API routes (auth, CRUD, assign, match) vs test DB.  
- E2E: login, create/edit course, conflict override, assign, verify Mailhog email, AI fallback path.  

---

## Reflection

**If more time**  
- Add pagination/filters, restore for soft-deletes, structured logs/metrics (AI cost, mail), multi-role auth, richer availability-aware conflicts, job queue for AI/email, full test suite + CI.

**Proud of**  
- Resilient AI matching (structured prompt, caching, fallback) spend some money on that :-).  
- Conflict-aware assignment with override + history + email.  
- Security middleware (CSRF + rate limit) paired with validation.

**Most time / challenging**  
- Robust AI parsing/fallback and keeping UX clear on source/errors.  
- Designing conflict checks to be safe yet overrideable.  
- Wiring auth + CSRF + rate limiting cleanly across APIs.

**Trade-offs**  
- Single-admin env-based auth vs full user system.  
- No backend pagination
- minimal logging/observability
- no tests due to time.  
- Heuristic availability handling vs full scheduling engine.

**AI integration approach**  
- OpenAI JSON-mode; explicit rules (subject > location > availability > rating > cost) and trainer IDs only.  
- Retries + timeout + cache for latency/cost; heuristic fallback for resilience.  
- Model/base URL configurable via env; cost kept low by small model + caching; could swap to other compatible providers.

---

## Feedback

**Assessment experience**  
- Clear, realistic scope; 
- Time tight mainly for tests/observability.

**Suggestions**  
- Clarify expected depth of tests/CI and whether multi-user auth is required.  
- Provide an example AI response shape to align expectations.


