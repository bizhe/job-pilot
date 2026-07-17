# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** Phase 2 — Profile Page
**Last completed:** 07 AI Profile Extraction from Resume
**In progress:** None
**Next:** 08 Resume PDF Generation from Profile

---

## Progress

### Phase 1 — Foundation

- [x] 01 Homepage
- [ ] 02 Auth
- [x] 03 PostHog Initialization
- [x] 04 Database Schema

### Phase 2 — Profile Page

- [x] 05 Profile Page — Full UI
- [x] 06 Profile Save Logic
- [x] 07 AI Profile Extraction from Resume
- [ ] 08 Resume PDF Generation from Profile

### Phase 3 — Find Jobs Page

- [ ] 09 Find Jobs Page — Full UI
- [ ] 10 Adzuna Job Discovery
- [ ] 11 Filter + Sort + Pagination

### Phase 4 — Job Details Page

- [ ] 12 Job Details Page — Full UI
- [ ] 13 Company Research Agent

### Phase 5 — Dashboard

- [ ] 14 Dashboard Page — Full UI
- [ ] 15 Stats Bar — Real Data
- [ ] 16 Recent Activity — Real Data
- [ ] 17 Analytics Charts — PostHog Data

---

## Decisions Made During Build

- 2026-07-16: 02 Auth uses `@insforge/sdk` from the latest InsForge MCP auth docs. Google and GitHub are enabled on the backend. Browser session confirmation happens through `auth.getCurrentUser()`. See `docs/specs/0001-insforge-oauth-auth.md`.
- 2026-07-16: 04 Database Schema uses a full lean InsForge schema from `docs/specs/0002-database-schema.md`. The migration lives at `database/migrations/0002-database-schema.sql`, and the live backend now has `profiles`, `agent_runs`, `jobs`, `agent_logs`, and the private `resumes` bucket.

---

## Notes

- Session handoff (2026-07-16): Fetched and reviewed InsForge's essential `instructions` documentation through MCP. Backend URL is `https://pm5ayshf.eu-central.insforge.app`. No implementation changes were made in this session. Next planned feature remains **02 Auth**; fetch the current InsForge Next.js auth documentation before implementing it.
- 02 Auth implementation (2026-07-16): Auth code, protected route shells, and route proxy are built. `npm run lint` and `npm run build` pass. Live OAuth verification still needs `NEXT_PUBLIC_INSFORGE_ANON_KEY` in `.env.local`.
- 02 Auth recovery (2026-07-16): Removed `proxy.ts` auth redirects because they run before the InsForge browser SDK can restore the OAuth session and were sending signed in users back to `/login`. Protected route shells now rely on the client guard for this auth slice.
- 03 PostHog Initialization (2026-07-16): Added idempotent browser setup in `lib/posthog-client.ts`, server setup in `lib/posthog-server.ts`, root layout provider, and typed helpers for the four allowed project events. Auth callback and protected pages identify users after session confirmation. Ad hoc auth event captures were removed to keep the event contract limited to `job_search_started`, `job_found`, `profile_completed`, and `company_researched`.
- 04 Database Schema verification (2026-07-16): Created and applied `database/migrations/0002-database-schema.sql` through InsForge MCP. `/check verify` passed against the live backend. The migration was run twice successfully. Verified live table schemas, foreign keys, indexes, row level security, sixteen owner policies using `auth.uid()`, timestamp triggers, check constraints, and private `resumes` bucket. Negative checks confirmed invalid `agent_runs.status` and invalid `jobs.match_score` are rejected.
- 05 Profile Page UI (2026-07-16): Replaced the protected profile placeholder with the full profile UI from `context/designs/profile.png`. The screen uses mock values only and keeps auth protection. Built sections include the attention banner, resume upload and generate controls, personal info, professional info, work experience, education, job preferences, and Save Profile button. `npm run lint` and `npm run build` pass. Desktop and mobile screenshots were checked with a mocked auth refresh response.
- 06 Profile Save Logic complete (2026-07-17): `/check verify feature 06` passed against the running app with InsForge route stubs. `/test feature 06` added profile helper, component, and Playwright coverage. `npm run lint` and `npm run test` pass. The profile page now loads or creates the signed in user's profile, saves normalized fields, computes completion, uploads PDF resumes, handles safe errors, and redirects unauthenticated visitors.
- 07 AI Profile Extraction from Resume complete (2026-07-17): `/check verify feature 07` passed against the running app with browser and API evidence. Added `POST /api/resume/extract`, server-side InsForge session confirmation, PDF text extraction with `pdf-parse`, OpenAI `gpt-4o` JSON extraction, extracted profile validation, and a profile page extraction action for the currently selected PDF. Draft extraction preserves the auth email and saved resume keys and does not save until the user clicks Save Profile. `npm run test`, `npm run lint`, and `npm run build` pass.
