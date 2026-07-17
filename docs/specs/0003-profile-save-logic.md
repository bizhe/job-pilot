# 0003. Profile save logic

**Date**: 2026-07-16
**Status**: Accepted

## Summary

JobPilot will turn the existing profile screen from a mock form into a real saved profile. The page will use the current InsForge browser session to load and update the signed in user's `profiles` row, upload a PDF resume, and calculate completion status. This keeps Feature 06 aligned with the auth slice that already shipped, while leaving a later server auth bridge as a separate decision.

## Context

> Premise note: `context/build-plan.md` says Feature 06 should use a Server Action in `actions/profile.ts`. The current accepted auth spec uses the InsForge browser SDK as the active session source, and the app does not yet have a server auth helper that can prove the current InsForge user inside a Server Action. For this feature, the right framing is saved profile data under the current browser session, not a partial server rewrite.

Feature 05 built the profile page UI from `context/designs/profile.png` with mock values only. The next user problem is persistence. A signed in user needs to leave the page, return later, and see their real profile data instead of sample content.

The database and storage foundation already exists in spec 0002. It defines one `profiles` row per InsForge auth user, private resume storage, row level security, `resume_pdf_url`, `resume_pdf_key`, `is_complete`, `completion_percentage`, and `missing_fields`.

The feature touches private personal data, including contact details, work history, education, job preferences, and resume files. The database owns access control through row level security, but the application still needs to scope every read and write to the authenticated user id and avoid exposing raw backend errors in the UI.

## Requirements

**User stories**:

1. As a signed in user, I want my profile form to save so that JobPilot can use my real experience and preferences.
2. As a returning user, I want the profile page to prefill with my saved data so that I can update it instead of starting over.
3. As a signed in user, I want to upload my resume PDF so that later resume and extraction features can use the latest document.
4. As a signed in user, I want clear completion feedback so that I know what information JobPilot still needs.

**Acceptance criteria**:

1. **AC-1**: `/profile` loads the signed in user's existing `profiles` row after session confirmation and prefills all saved fields in the current profile UI.
2. **AC-2**: If no profile row exists, `/profile` creates a row for the current InsForge user using the auth user id and email, then shows an empty editable profile with the email locked.
3. **AC-3**: Clicking Save Profile validates, normalizes, and saves every supported form field to the `profiles` table for the current user.
4. **AC-4**: The completion banner uses the saved `completion_percentage` and `missing_fields` values, and `is_complete` becomes true only when the required matching fields are present.
5. **AC-5**: Selecting a PDF uploads it to the private `resumes` bucket, stores the returned `resume_pdf_url` and `resume_pdf_key` on the profile, rejects non PDF files, and shows readable upload errors.
6. **AC-6**: Unauthenticated visitors are redirected to `/login`, and authenticated users cannot read or write another user's profile through the profile page.
7. **AC-7**: Loading, saving, validation, and upload failures show readable UI states, do not expose raw secrets or backend payloads, and leave the previous saved profile intact.

## Options considered

### Option 1: Browser SDK profile service

Use the existing InsForge browser client after `getCurrentUser()` succeeds. Put profile read, save, completion calculation, and resume upload helpers outside the visual components, then call them from the profile page client boundary.

**Pros**:

1. Fits the accepted auth design without adding a second session model.
2. Row level security still protects every profile row at the database layer.
3. Keeps Feature 06 small enough to ship after the mock UI slice.

**Cons**:

1. It is an explicit exception to the broader project preference for Server Actions.
2. The profile client boundary owns more state until the project adds server readable auth cookies.

### Option 2: Server Actions with a new server auth bridge

Create server side InsForge session support first, then implement `actions/profile.ts` for profile save and resume update.

**Pros**:

1. Matches the generic architecture notes for UI mutations.
2. Would make future server loaded profile pages cleaner.

**Cons**:

1. It expands Feature 06 into an auth architecture change.
2. A wrong server bridge would risk breaking the working OAuth flow from spec 0001.

### Option 3: API route proxy

Add `/api/profile` and `/api/profile/resume` route handlers, have the browser call those routes, and have the routes proxy writes to InsForge.

**Pros**:

1. Keeps backend writes behind application routes.
2. Gives the UI a stable local API surface.

**Cons**:

1. It still needs a trustworthy way to pass or recover the user's InsForge session on the server.
2. It adds an extra layer without solving the current missing server auth prerequisite.

## Decision

**Chosen option**: Option 1: Browser SDK profile service

Build Feature 06 with a browser side profile data service that uses the current InsForge SDK session, the existing `profiles` schema, and the private `resumes` bucket.

**Implementation skills**: `architect` (`local/project`, `.agents/skills/architect/`) · `develop` (`local/project`, `.agents/skills/develop/`)

## Rationale

The current product has a working browser session model from spec 0001, and Feature 06 needs to make the profile page real rather than redesign auth. The browser SDK can read the current user, query `profiles`, upload to storage, and write the row while InsForge row level security enforces ownership.

The server action path is still the cleaner long term architecture once the app has a server readable InsForge session. It should not be mixed into this feature without that prerequisite, because a Server Action that cannot reliably identify the current user would either fail or tempt the implementation toward unsafe trust in client supplied user ids.

The storage behavior follows the current InsForge SDK docs. Upload returns the authoritative `url` and `key`, and the application must save those returned values. If an old resume key exists, the implementation should attempt to remove it before storing the new one, but upload success is defined by the new returned key and URL being saved.

## Feature design

**Data model sketch**:

| Entity | Key fields | Relationships and rules |
|---|---|---|
| `profiles` | `id`, `email`, identity fields, professional fields, `work_experience`, `education`, preference arrays, `resume_pdf_url`, `resume_pdf_key`, `is_complete`, `completion_percentage`, `missing_fields`, timestamps | One row per InsForge auth user. `id` equals the authenticated user id. Existing row level security from spec 0002 limits access to the owner. |
| Resume object | returned storage `key`, returned storage `url`, file metadata | Stored in private bucket `resumes`. Profile row saves the returned URL and key. The current feature accepts PDF files only. |
| Work experience item | `company_name`, `job_title`, `start_date`, `end_date`, `current_role`, `key_responsibilities` | Stored inside `profiles.work_experience` as a JSON array. Feature 06 supports up to 3 items. Empty items are dropped before save. |
| Education object | `highest_degree`, `field_of_study`, `institution_name`, `graduation_year` | Stored inside `profiles.education` as JSON. Empty optional values stay null or empty strings inside the object. |

**State transitions**:

| State | Transition |
|---|---|
| Profile row missing | `getCurrentUser()` succeeds, no `profiles` row is found, create `profiles.id = user.id` and `profiles.email = user.email`. |
| Profile incomplete | Save adds all required matching fields, completion calculation sets `is_complete = true`. |
| Profile complete | Save removes a required matching field, completion calculation sets `is_complete = false`. |
| Resume absent | PDF upload succeeds, profile stores returned `resume_pdf_url` and `resume_pdf_key`. |
| Resume present | New PDF upload succeeds, profile stores the new returned values. Old key removal is attempted when available. |

**API surface**:

| Surface | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `loadProfileForUser` | browser helper | `user.id`, `user.email` | normalized profile form state, created flag | authenticated browser session | unauthenticated, forbidden, profile create failure |
| `saveProfileForUser` | browser helper | `user.id`, normalized profile form state | saved profile, completion result | authenticated browser session | validation failed, forbidden, database error |
| `uploadResumeForUser` | browser helper | `user.id`, PDF `File`, previous `resume_pdf_key` | returned `url`, returned `key`, saved profile resume fields | authenticated browser session | invalid file type, file too large, upload failed, profile update failed |
| `computeProfileCompletion` | pure function | normalized profile form state | `is_complete`, `completion_percentage`, `missing_fields` | none | none |

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Confirm profile access | Current user id | InsForge `auth.getCurrentUser()` from the browser SDK |
| Confirm profile access | Current user email | InsForge auth user email |
| Load profile | Existing profile fields | `profiles` row where `id = current user id` |
| Create missing profile | `profiles.id` | Current InsForge user id |
| Create missing profile | `profiles.email` | Current InsForge user email |
| Render form | Email locked field | `profiles.email`, falling back to auth user email only during initial row creation |
| Render form | Personal and professional field values | Matching `profiles` columns |
| Render form | Work experience fields | `profiles.work_experience` JSON array |
| Render form | Education fields | `profiles.education` JSON object |
| Render form | Skill and industry chips | `profiles.skills` and `profiles.industries` arrays |
| Render banner | Completion percent | `profiles.completion_percentage` after save, or computed from normalized loaded profile before first save |
| Render banner | Missing field labels | `profiles.missing_fields` after save, or computed from normalized loaded profile before first save |
| Save profile | `skills`, `industries`, `job_titles_seeking`, `preferred_locations` | Trimmed chip state and comma separated input values, empty strings removed |
| Save profile | `years_experience` | Number input parsed as integer zero or greater |
| Save profile | `work_authorization` | Select value mapped to schema values `citizen`, `permanent_resident`, or `visa_required` |
| Save profile | `remote_preference` | Select value mapped to schema values `remote`, `onsite`, `hybrid`, or `any` |
| Save profile | Completion fields | `computeProfileCompletion` result |
| Upload resume | Storage path | `${current user id}/resume.pdf` requested path |
| Upload resume | Stored resume URL | InsForge storage upload returned `url` |
| Upload resume | Stored resume key | InsForge storage upload returned `key` |
| Show errors | User facing message | Internal error category mapped to friendly copy |

**Key invariants**:

1. The profile page never accepts a user id from form input.
2. Every `profiles` query filters by `id = current user id`.
3. Email is displayed from auth or the profile row, but the form cannot change it in Feature 06.
4. Resume upload accepts `application/pdf` files only and keeps the 5 MB limit shown in the UI.
5. The app saves the storage returned `key` and `url`, never a guessed URL.
6. Required completion fields are `full_name`, `email`, `phone`, `location`, `current_title`, `experience_level`, `years_experience`, at least one skill, at least one target role, `remote_preference`, `work_authorization`, and at least one work experience item or education object.
7. `completion_percentage` is `Math.round(met_required_count / required_count * 100)`.
8. `is_complete` is true only when every required completion field is met.
9. `missing_fields` stores stable display labels for unmet required fields.
10. Validation failure does not mutate the saved profile row.

**Security model**:

Profile data and resume files are private personal data. Only an authenticated InsForge user can load, create, update, or upload for their own profile.

The browser helper gets the user id only from `auth.getCurrentUser()`. Database row level security from spec 0002 enforces `profiles.id = auth.uid()`, and application queries also filter by the same id. The profile page does not expose an admin mode, shared profile view, team access, or public resume URL sharing in this feature.

The UI maps backend and storage failures to friendly messages. Raw SDK errors, anon keys, access tokens, resume object keys for other users, and stack traces must not appear in visible UI.

**Configuration required**:

No new environment variables are required. Feature 06 uses the existing InsForge public URL and anon key from spec 0001, the `profiles` table from spec 0002, and the private `resumes` bucket from spec 0002.

**Critical test scenarios**:

1. Happy path: a signed in user with no profile row opens `/profile`, the app creates a row from auth id and email, the user fills required fields, saves, and the banner shows 100 percent complete, verifies **AC-1**, **AC-2**, **AC-3**, and **AC-4**.
2. Return path: a signed in user with a saved profile opens `/profile` and every supported field is prefilled from the row, verifies **AC-1**.
3. Resume path: a signed in user selects a valid PDF under 5 MB, upload succeeds, and the profile row stores the returned URL and key, verifies **AC-5**.
4. Validation failure: a signed in user enters an invalid years value or non PDF file and sees a readable error with no database mutation, verifies **AC-5** and **AC-7**.
5. Auth permission: an unauthenticated visitor is redirected to `/login`, and a signed in user cannot force the page to load or save another profile id, verifies **AC-6**.
6. Backend failure: a database or storage error shows readable feedback and keeps the previously loaded profile state visible, verifies **AC-7**.

## Build plan

The project has been using a facade path for UI first work, but this feature should be a narrow end to end slice because the UI already exists. Build the browser session read path first, then save, then resume upload, so each step can be verified against the live InsForge surface.

1. Add shared profile types, field normalization, enum mapping, validation, and `computeProfileCompletion`, satisfies **AC-3**, **AC-4**, and **AC-7**.
2. Add a browser profile data helper that loads the current user's row, creates the missing row from auth id and email, and filters every query by current user id, satisfies **AC-1**, **AC-2**, and **AC-6**.
3. Convert `components/profile/ProfilePageContent.tsx` from mock defaults to state driven values with loading, empty, dirty, saving, saved, and error states, satisfies **AC-1**, **AC-3**, **AC-4**, and **AC-7**.
4. Wire Save Profile to validate, normalize, save all supported profile fields, and refresh the completion banner from the saved result, satisfies **AC-3**, **AC-4**, and **AC-7**.
5. Wire Select Resume to accept PDF files only, enforce the 5 MB limit, upload to the private `resumes` bucket, save the returned URL and key, and show upload states, satisfies **AC-5** and **AC-7**.
6. Add focused tests for completion calculation, form normalization, profile load or create behavior, save failure handling, and resume file validation, satisfies **AC-2**, **AC-3**, **AC-4**, **AC-5**, and **AC-7**.
7. Verify the protected page behavior and user scoping with mocked InsForge responses or Playwright route stubs, then update `context/progress-tracker.md` and `context/ui-registry.md`, satisfies **AC-1** through **AC-7**.

## Consequences

**Positive**:

1. Feature 06 can ship without destabilizing the OAuth flow.
2. The profile page becomes useful immediately for later job matching and resume features.
3. Completion logic becomes one named function instead of scattered UI guesses.

**Negative / tradeoffs**:

1. This keeps profile persistence in a browser side helper for now, which is not the final server first shape described in the older architecture notes.
2. The profile component will remain a client boundary until a later server auth bridge exists.
3. Storing completion fields means derived data can go stale if future code writes profiles without using the same calculation helper.

**Neutral**:

1. The build plan's `revalidatePath('/profile')` note does not apply to this browser SDK slice.
2. Later Features 07 and 08 can reuse the stored resume key and profile fields, but they still need their own extraction and PDF generation designs.
3. A later server auth bridge can move the same validation and completion helper behind Server Actions without changing the database shape.

## Follow-up

1. [ ] Design the InsForge server auth bridge before moving profile mutations to Server Actions.
2. [ ] Reconcile `context/library-docs.md` storage guidance with the current SDK behavior that upload returns the authoritative key and URL.
