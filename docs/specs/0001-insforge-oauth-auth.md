# 0001. InsForge OAuth auth

**Date**: 2026-07-16
**Status**: In Progress

## Summary

JobPilot will use InsForge OAuth for Google and GitHub sign in. The browser SDK owns OAuth start, callback code exchange, session restore, and sign out. Client guards confirm the restored browser session before showing protected page content.

## Context

Feature 02 in `context/build-plan.md` requires a login page, Google and GitHub OAuth, a callback handler, session management, protected app routes, and a successful login redirect to `/dashboard`.

The project context has older InsForge examples based on `@insforge/ssr`, but the current InsForge MCP auth docs require `@insforge/sdk` with `createClient`, `signInWithOAuth`, `getCurrentUser`, and `signOut`. The live backend metadata shows Google and GitHub are both enabled OAuth providers.

This feature does not add JobPilot database tables. Identity and sessions live in InsForge auth. Profile data comes later in Feature 04 and Feature 06.

## Requirements

**User stories**:
- As a visitor, I want to sign in with Google or GitHub so that I can reach the JobPilot app.
- As an authenticated user, I want login to send me to the dashboard so that I can start from the main workspace.
- As a visitor, I want protected app routes to send me to login so that private pages are not exposed.

**Acceptance criteria**:
- **AC-1**: `/login` renders Google and GitHub OAuth buttons that start the InsForge OAuth flow.
- **AC-2**: The OAuth callback route lets the InsForge browser SDK exchange `insforge_code`, restore the session, and redirect successful login to `/dashboard`.
- **AC-3**: `/dashboard`, `/profile`, `/find-jobs`, and `/find-jobs/[id]` redirect unauthenticated visitors to `/login` from the client guard before protected content renders.
- **AC-4**: Authenticated users who visit `/login` are redirected to `/dashboard`.
- **AC-5**: OAuth errors and missing configuration show readable UI feedback and do not expose raw secrets.

## Options considered

### Option 1: Current InsForge browser SDK with custom UI

Use `@insforge/sdk`, create a browser client from public env vars, build the JobPilot login UI, and let the SDK handle OAuth redirect and callback exchange in the browser.

**Pros**:
- Matches the current InsForge MCP docs.
- Keeps the UI aligned with JobPilot instead of importing generic auth screens.
- Uses the enabled Google and GitHub providers already present in backend metadata.

**Cons**:
- Server route protection can only be an entry check until the browser SDK restores the session.
- The project must add a dependency and public env vars before OAuth can run locally.

### Option 2: Older `@insforge/ssr` server client pattern

Use the pattern documented in the repo context files, with separate browser and server clients.

**Pros**:
- Fits the older architecture notes.
- Would make server side checks feel more direct if that package still matched current InsForge auth.

**Cons**:
- It conflicts with the current InsForge MCP auth docs for this backend.
- The package is not installed in the project.

### Option 3: Add a different auth provider

Use a hosted auth provider or a self hosted auth library instead of InsForge auth.

**Pros**:
- Some providers have mature Next.js server helpers.

**Cons**:
- Adds a second identity system to a project that already chose InsForge.
- Duplicates backend capability and complicates future profile and user scoped data work.

## Decision

**Chosen option**: Option 1: Current InsForge browser SDK with custom UI

Build auth with `@insforge/sdk`, custom JobPilot login UI, an OAuth callback page, a shared browser client helper, and a client session guard.

**Implementation skills**: `architect` (`local/project`, `.agents/skills/architect/`) · `develop` (`local/project`, `.agents/skills/develop/`)

## Rationale

The live InsForge docs are the authority for application auth code. They say OAuth starts with `signInWithOAuth(provider, { redirectTo })`, the callback includes `insforge_code`, and the SDK automatically exchanges that code and saves the session when the client starts. Building on that shape is less risky than forcing the older SSR examples to fit a package that is not installed.

The tradeoff is that protected page rendering needs a small browser guard for the current SDK session model. A server proxy cannot see the SDK memory session immediately after OAuth callback, so the browser SDK is the source of truth for session restore and refresh in this slice.

## Feature design

**Data model sketch**:
- No JobPilot data tables in this feature.
- InsForge auth owns user identity, OAuth provider links, access token, and refresh cookie.
- Browser code treats the current user as nullable until `getCurrentUser()` resolves.

**API surface**:
| Surface | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/login` | page | optional `error` query | OAuth buttons, loading and error states | public | missing env, provider start failure |
| `/callback` | page | `insforge_code` query set by InsForge, optional error query | redirect to `/dashboard` or visible retry link | public | exchange failure, timeout |
| `getCurrentUser()` | SDK call | browser session storage and refresh cookie | current InsForge user or null | browser session | expired or missing session |
| `signInWithOAuth()` | SDK call | provider, redirect URL | provider redirect | public | provider disabled, bad redirect |

**Value sourcing**:
| Action | Value produced or displayed | Source |
|---|---|---|
| Render login | Provider labels | Build plan, Google and GitHub only |
| Start OAuth | Provider key | Button choice, `google` or `github` |
| Start OAuth | Redirect URL | `window.location.origin + "/callback"` |
| Create client | Base URL | `NEXT_PUBLIC_INSFORGE_URL` |
| Create client | Anon key | `NEXT_PUBLIC_INSFORGE_ANON_KEY` |
| Callback redirect | Success destination | Build plan, `/dashboard` |
| Session guard | Current user | InsForge `auth.getCurrentUser()` |
| Error UI | Human readable error | SDK error message mapped to generic UI copy |

**Key invariants**:
- Public env vars are required before OAuth can run.
- The anon key is not printed to logs or UI.
- OAuth provider keys are limited to `google` and `github`.
- Successful login always lands on `/dashboard` for this feature.

**Security model**:
- `/login` and `/callback` are public.
- `/dashboard`, `/profile`, `/find-jobs`, and nested find job routes require an authenticated InsForge user.
- Browser session confirmation happens before protected page content renders.

**Configuration required**:
- `NEXT_PUBLIC_INSFORGE_URL`: InsForge backend URL, currently `https://pm5ayshf.eu-central.insforge.app`.
- `NEXT_PUBLIC_INSFORGE_ANON_KEY`: public anon key from InsForge backend setup.

**Critical test scenarios**:
- Happy path: click Google or GitHub, complete OAuth, return through `/callback`, and land on `/dashboard`, verifies **AC-1** and **AC-2**.
- Failure case: missing env vars or OAuth error shows readable feedback on the auth screen, verifies **AC-5**.
- Auth permission: visit `/dashboard`, `/profile`, or `/find-jobs` without a session and land on `/login`, verifies **AC-3**.
- Existing session: visit `/login` with a restored user and land on `/dashboard`, verifies **AC-4**.

## Build plan

1. Install `@insforge/sdk` and add a typed browser client helper with env validation, satisfies **AC-1**, **AC-2**, **AC-5**.
2. Build the `/login` page with Google and GitHub buttons, provider loading states, and readable error states, satisfies **AC-1**, **AC-4**, **AC-5**.
3. Build the `/callback` page that starts the SDK session restore and redirects to `/dashboard`, satisfies **AC-2**, **AC-5**.
4. Add a reusable client auth guard for protected placeholder routes, satisfies **AC-3**, **AC-4**.
5. Add minimal protected placeholder pages for routes named in the auth feature when they do not exist yet, satisfies **AC-3**.
6. Update `context/progress-tracker.md` and `context/ui-registry.md` after verification, satisfies **AC-1** through **AC-5**.

## Consequences

**Positive**:
- Auth matches the current InsForge contract.
- JobPilot keeps full control over its login page styling.
- Future profile and job pages can reuse the same session guard.

**Negative / tradeoffs**:
- The current SDK shape makes browser session restore the practical source of truth for this first slice.
- Server side route redirects are deferred until the project uses an InsForge server cookie flow that the server can verify.
- Local OAuth cannot be fully tested until the anon key and allowed redirect setup are available.

**Neutral**:
- The old architecture notes should be reconciled later if the project fully standardizes on `@insforge/sdk`.

## Follow-up

- [ ] Reconcile `context/library-docs.md` and `context/architecture.md` once the team confirms the old `@insforge/ssr` notes are obsolete for this app.
- [ ] If server first protection is required later, design an InsForge server callback flow that writes first party auth cookies before reintroducing `proxy.ts` redirects.
