# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** Phase 1 — Foundation
**Last completed:** 01 Homepage
**In progress:** 02 Auth
**Next:** Finish auth live OAuth verification, then 03 PostHog Initialization

---

## Progress

### Phase 1 — Foundation

- [x] 01 Homepage
- [ ] 02 Auth
- [ ] 03 PostHog Initialization
- [ ] 04 Database Schema

### Phase 2 — Profile Page

- [ ] 05 Profile Page — Full UI
- [ ] 06 Profile Save Logic
- [ ] 07 AI Profile Extraction from Resume
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

---

## Notes

- Session handoff (2026-07-16): Fetched and reviewed InsForge's essential `instructions` documentation through MCP. Backend URL is `https://pm5ayshf.eu-central.insforge.app`. No implementation changes were made in this session. Next planned feature remains **02 Auth**; fetch the current InsForge Next.js auth documentation before implementing it.
- 02 Auth implementation (2026-07-16): Auth code, protected route shells, and route proxy are built. `npm run lint` and `npm run build` pass. Live OAuth verification still needs `NEXT_PUBLIC_INSFORGE_ANON_KEY` in `.env.local`.
- 02 Auth recovery (2026-07-16): Removed `proxy.ts` auth redirects because they run before the InsForge browser SDK can restore the OAuth session and were sending signed in users back to `/login`. Protected route shells now rely on the client guard for this auth slice.
