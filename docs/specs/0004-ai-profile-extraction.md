# 0004. AI profile extraction

**Date**: 2026-07-17
**Status**: Accepted

## Summary

JobPilot will let a signed in user extract profile fields from a resume PDF they just selected in the profile page. The PDF text is read on the server, GPT-4o returns structured profile data, and the browser overwrites the matching form fields so the user can review before saving. No extracted profile data is saved until the user clicks Save Profile.

## Context

Feature 07 follows the completed profile save flow from spec 0003. The profile page can already load, save, and upload a resume PDF through the browser InsForge session. The next user problem is speed. A user with an existing resume should not have to retype their work history, skills, education, and preferences when the resume already contains most of that information.

This feature touches private personal data. Resume files may include contact details, work history, education, immigration hints, and other sensitive text. The OpenAI API key is present in `.env.local`, and it must stay server side. The browser may send the selected PDF to the app route, but it must never see the API key or raw model prompt internals.

The extraction result is useful but not authoritative. A resume can be old, incomplete, or formatted in a way that causes parsing mistakes. The right product behavior is to treat extracted fields as a draft that fills the visible form. The user reviews and edits the draft, then saves through the existing Feature 06 path.

The engineer chose three load bearing rules. Extracted fields overwrite matching form fields. Extraction works from the PDF selected in the current browser session, not from the stored `resume_pdf_key` on return visits. Agent Skill and MCP discovery for `openai` and `pdf-parse` is skipped for this feature.

## Requirements

**User stories**:

1. As a signed in user, I want to extract profile details from my uploaded resume so that I can fill the profile form faster.
2. As a signed in user, I want to review extracted fields before saving so that incorrect resume parsing does not change my saved profile.
3. As a signed in user, I want clear feedback when extraction fails so that I know whether to try another PDF or fill the form manually.

**Acceptance criteria**:

1. **AC-1**: After a user selects a valid PDF in the current profile page session, the Resume card shows an Extract from Resume button.
2. **AC-2**: Clicking Extract from Resume sends the selected PDF to `POST /api/resume/extract`, which authenticates the current user before parsing or calling OpenAI.
3. **AC-3**: The route rejects missing files, non PDF files, files over the existing 5 MB limit, unauthenticated requests, empty PDF text, and very short PDF text with readable error messages.
4. **AC-4**: `pdf-parse` extracts raw text from the PDF buffer on the server, and GPT-4o returns JSON that matches the existing `ProfileFormState` field names and allowed enum values.
5. **AC-5**: A successful extraction overwrites every matching editable form field in the browser, keeps the locked email field from the current profile or auth session, and recalculates the completion banner from the draft state.
6. **AC-6**: Extracted data is not saved to InsForge until the user clicks Save Profile. A failed extraction leaves the last visible form state unchanged.
7. **AC-7**: Loading, success, and failure states are visible and accessible. Raw PDF text, OpenAI errors, API keys, access tokens, storage keys, and stack traces are never shown in the UI or stored in agent logs.
8. **AC-8**: Tests cover file validation, short text rejection, model JSON validation, form overwrite behavior, auth rejection, and safe error copy.

## Options considered

### Option 1: Current session file extraction

The browser keeps the selected PDF `File` in component state. Upload may save the file to InsForge Storage, and extraction sends that same file to `POST /api/resume/extract`.

**Pros**:

1. Avoids a new server storage download path.
2. Uses the exact file the user just selected.
3. Keeps the feature small and easy to verify in the profile page.

**Cons**:

1. The Extract from Resume button is not available after a page reload unless the user selects the PDF again.
2. The browser must hold the selected `File` while the user is on the page.

### Option 2: Stored resume extraction

The route reads `profiles.resume_pdf_key`, downloads the stored PDF from the private `resumes` bucket, and extracts from that stored object.

**Pros**:

1. Extraction could work on return visits without selecting the file again.
2. The feature would reuse the saved resume as the source of truth.

**Cons**:

1. It requires a server side storage read path before the app has a general server InsForge helper.
2. It couples extraction to storage behavior and adds more places for authorization to be wrong.

### Option 3: Client side PDF parsing

The browser parses the PDF text and sends text to a server route for OpenAI structuring.

**Pros**:

1. The server route receives text rather than binary file data.
2. It can reduce server CPU work for parsing.

**Cons**:

1. It adds heavier browser code and exposes raw resume text to more client side state.
2. It still needs a server route for OpenAI, so it does not remove the sensitive server boundary.

## Decision

**Chosen option**: Option 1: Current session file extraction

Build Feature 07 as a profile page extraction flow that sends the currently selected PDF to an authenticated server route, parses it with `pdf-parse`, asks GPT-4o for strict profile JSON, and overwrites matching editable form fields in the browser draft.

**Implementation skills**: `architect` (`local/project`, `.agents/skills/architect/`) · `develop` (`local/project`, `.agents/skills/develop/`)

## Rationale

The current session file path is the smallest safe feature. It keeps the OpenAI key and PDF parsing on the server while avoiding a broader storage download and server profile read design. That matters because spec 0003 explicitly left full Server Action profile mutation and server auth bridging as later work.

Overwriting matching form fields is more aggressive than filling only blanks, but it matches the engineer's choice and gives a clear mental model. The resume becomes the latest draft source for editable fields, while Save Profile remains the only persistence action. This preserves the important safety line: extraction changes the form, not the database.

The route should authenticate before doing expensive or sensitive work. A local API route that accepts any PDF and calls OpenAI would become an abuse target and a privacy risk. The build should use InsForge server side auth cookies through `@insforge/sdk/ssr` where available, return `401` when the server cannot prove the user, and never trust a user id from form data.

## Feature design

**Data model sketch**:

No database migration is required.

1. `profiles` remains the saved profile entity from spec 0003. Feature 07 reads the current browser draft and later uses the existing Save Profile behavior to persist.
2. `Resume extraction request` is transient. Fields are `resume` as a required PDF `File`, authenticated request cookies, and no stored row.
3. `Resume extraction result` is transient. It has the same editable field names as `ProfileFormState`, excluding `email`, `resumePdfUrl`, `resumePdfKey`, `isComplete`, `completionPercentage`, and `missingFields`.

**State transitions**:

1. `no selected file` to `file selected`, when Select Resume receives a valid PDF.
2. `file selected` to `extracting`, when the user clicks Extract from Resume.
3. `extracting` to `draft applied`, when the route returns valid extracted fields and the browser overwrites matching editable fields.
4. `extracting` to `extract failed`, when auth, PDF parsing, model output, or validation fails. The previous form state stays visible.
5. `draft applied` to `saved`, only when the user clicks Save Profile and the existing save path succeeds.

**API surface**:

| Surface | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/resume/extract` | `POST` | `resume: File` required, current auth cookies | `{ success: true, data: extractedProfile }` | authenticated InsForge user proven on server | `401` unauthenticated, `400` invalid file, `422` no usable text or invalid model JSON, `500` extraction failed |
| `extractProfileFromResume` | browser helper | PDF `File` | extracted editable profile fields | current page auth state plus server route auth | network failure, safe route error |
| `applyExtractedProfile` | pure browser helper | current `ProfileFormState`, extracted fields | next `ProfileFormState` with completion recalculated | none | none |

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Show Extract button | Button visibility | Selected PDF `File` held in profile page state |
| Send extraction request | PDF bytes | Selected PDF `File` from current browser session |
| Authenticate extraction | Current user | InsForge server side auth from request cookies |
| Validate file | File type | `File.type` and PDF filename extension |
| Validate file | File size | `File.size`, limit from spec 0003, 5 MB |
| Parse PDF | Raw resume text | `pdf-parse` result from `Buffer.from(await file.arrayBuffer())` |
| Reject weak PDF text | Minimum usable text | Trimmed `pdfData.text`, with a short text threshold defined in `lib/profile` or the route helper |
| Call OpenAI | Model name | Project rule, `gpt-4o` |
| Call OpenAI | API key | Server env `OPENAI_API_KEY` |
| Structure result | Profile field names | Existing `ProfileFormState` type in `lib/profile.ts` |
| Structure result | Allowed enum values | Existing profile enum types in `lib/profile.ts` |
| Apply result | Editable profile fields | Validated extraction JSON |
| Preserve email | Email field | Current visible profile or auth created profile from spec 0003 |
| Recalculate banner | Completion percentage and missing fields | `computeProfileCompletion` applied to the next draft profile |
| Show success | Success message | Successful route response |
| Show failure | User facing error | Safe error category mapped to readable copy |

**Key invariants**:

1. The OpenAI API key is never imported into a Client Component and never sent to the browser.
2. `POST /api/resume/extract` authenticates before parsing the PDF or calling OpenAI.
3. The route accepts only PDF files under 5 MB.
4. Raw extracted PDF text is never stored in InsForge and never shown in UI.
5. Extracted JSON must pass runtime validation before it can update the form.
6. Extraction can overwrite editable form fields, but it cannot overwrite the locked email field.
7. Extraction does not save `profiles`. Only the existing Save Profile path persists profile changes.
8. If extraction fails, the previous form state remains unchanged.
9. Work experience is capped at the existing limit of 3 roles.
10. Unknown enum values from the model become empty values rather than unsafe strings.

**Security model**:

Resume content is private personal data. Only a signed in InsForge user may call the extraction route. The server route must prove the user through InsForge server side auth cookies or return `401`; it must not accept a user id, email, profile id, storage key, or auth token from form data.

The route performs no database write. This keeps a model mistake from becoming saved data without user approval. Console logs may include a route prefix and a coarse error category, but must not include raw resume text, prompt content, OpenAI response content, API keys, cookies, tokens, or stack traces in user visible output.

**Configuration required**:

1. `OPENAI_API_KEY`: server side OpenAI API key for GPT-4o profile extraction. The user has confirmed it is already present in `.env.local`.

**Critical test scenarios**:

1. Happy path: a signed in user selects a valid PDF, clicks Extract from Resume, receives extracted profile fields, sees editable fields overwritten, and saves manually afterward, verifies **AC-1**, **AC-2**, **AC-4**, **AC-5**, and **AC-6**.
2. Failure case: an image based or nearly empty PDF returns the readable message `Could not extract text from this PDF. Please try a different file.` and leaves the form unchanged, verifies **AC-3**, **AC-6**, and **AC-7**.
3. Validation case: model JSON with invalid enum values or excess work roles is normalized or rejected before touching the form, verifies **AC-4**, **AC-5**, and **AC-8**.
4. Auth case: an unauthenticated request to `POST /api/resume/extract` returns `401` and does not parse the PDF or call OpenAI, verifies **AC-2**, **AC-3**, and **AC-7**.
5. UI state case: the Extract from Resume button appears only after a PDF is selected, shows an extracting state while pending, and restores an actionable state on failure, verifies **AC-1** and **AC-7**.

## Build plan

The project used a UI first facade path earlier, but Feature 07 should be a narrow end to end slice because the profile UI and save flow already exist. Build one authenticated extraction thread first, then harden validation and tests around it.

1. Install `openai` and `pdf-parse`, and add the extraction result types plus runtime validators beside the existing profile helpers, satisfies **AC-4** and **AC-8**.
2. Add a small InsForge server auth helper for route handlers using `@insforge/sdk/ssr`, then prove `POST /api/resume/extract` returns `401` when no server verified user exists, satisfies **AC-2**, **AC-3**, and **AC-7**.
3. Build `POST /api/resume/extract` with file validation, PDF buffer parsing, short text rejection, GPT-4o JSON extraction, runtime validation, and safe response wrapping, satisfies **AC-2**, **AC-3**, **AC-4**, **AC-7**, and **AC-8**.
4. Update the profile page resume state so the selected PDF is retained for the current session, the Extract from Resume button appears after selection, and loading and error states are accessible, satisfies **AC-1** and **AC-7**.
5. Add browser helpers to call the extraction route and apply extracted fields by overwriting editable profile fields, preserving email, capping work history, and recalculating completion, satisfies **AC-5** and **AC-6**.
6. Add focused unit tests for validators, short text rejection, invalid model JSON, enum normalization, overwrite behavior, and unchanged state on failure, satisfies **AC-3**, **AC-4**, **AC-5**, **AC-6**, and **AC-8**.
7. Add route or Playwright coverage with mocked auth and mocked OpenAI so the happy path and unauthenticated path are verified without exposing real secrets, satisfies **AC-1**, **AC-2**, **AC-5**, and **AC-7**.
8. Update `context/progress-tracker.md` and `context/ui-registry.md` after implementation, satisfies **AC-8**.

## Consequences

**Positive**:

1. The user gets a fast profile draft from a resume without losing the manual review step.
2. The OpenAI key stays on the server.
3. The feature does not add database schema or storage complexity.
4. Later job matching benefits from richer profile data once the user saves.

**Negative / tradeoffs**:

1. Extraction is not available from a stored resume after a page reload. The user must select the PDF again.
2. Overwriting fields can replace useful manual edits in the current draft. The user can still review before saving, but there is no field by field merge UI.
3. A small server auth helper is now needed before the broader Server Action auth bridge exists.
4. `openai` and `pdf-parse` add new dependencies that must be installed and tested in the Next.js route runtime.

**Neutral**:

1. This feature does not fire a PostHog event because the project event contract currently allows only `job_search_started`, `job_found`, `profile_completed`, and `company_researched`.
2. The extraction prompt and schema should stay close to the profile type definitions so future profile fields do not drift.
3. Tool discovery for `openai` and `pdf-parse` was intentionally skipped for this feature and can be revisited later.

## Follow-up

1. [ ] Consider a stored resume extraction mode after the project has a settled server InsForge helper for storage reads.
2. [ ] Consider a field by field review merge UI if users often lose useful manual edits after extraction.
3. [ ] Record the skipped Agent Skill and MCP discovery for `openai` and `pdf-parse` during the next `/sync` pass if the team wants no repeat offer.
