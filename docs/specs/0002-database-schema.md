# 0002. Database schema

**Date**: 2026-07-16
**Status**: Accepted

## Summary

JobPilot will create the InsForge database tables and resume storage bucket before any feature writes data. The schema is full enough for the planned product, but it avoids dormant fields for out of scope features. Every user owned row is protected by row level security, which means the database checks who may read or write a row.

## Context

Feature 04 in `context/build-plan.md` needs all application tables and the resume storage bucket before profile, job search, job detail, company research, and dashboard features begin writing data. The live InsForge backend currently has OAuth providers enabled, but no application tables and no storage buckets.

The product stores personal profile data, resume files, job matches, company research, and agent run logs. These are user private records. Later features depend on predictable ownership rules, useful indexes, and schema constraints rather than hand filtering every query by convention alone.

The project scope excludes manual job URL import, resume tailoring, multiple saved resumes, and team accounts. The schema should not create product surface for those flows yet. If those features return later, they deserve their own specs and migrations.

## Requirements

**User stories**:

1. As a builder of the profile flow, I want the `profiles` table and resume bucket to exist so that profile save and resume upload can write real data.
2. As a builder of the job search flow, I want `agent_runs`, `jobs`, and `agent_logs` to exist so that agent work can be tracked and debugged.
3. As a signed in user, I want my profile, resume, jobs, and research to stay private so that another user cannot read or change them.

**Acceptance criteria**:

1. **AC-1**: The InsForge backend has `profiles`, `agent_runs`, `jobs`, and `agent_logs` tables with the fields, constraints, defaults, and indexes named in this spec.
2. **AC-2**: The schema omits dormant fields for manual URL import and resume tailoring. Job records use `source = 'search'` for the current Adzuna flow.
3. **AC-3**: Row level security is enabled on all four tables, and policies use `auth.uid()` so authenticated users can only read and write rows they own.
4. **AC-4**: The `resumes` storage bucket exists as a private bucket, and resume records can save both `resume_pdf_url` and `resume_pdf_key`.
5. **AC-5**: The migration is safe to run more than once by using guarded creation, named constraints, and non destructive checks.
6. **AC-6**: Verification uses InsForge metadata tools to prove the four tables, row level security policies, indexes, and the private `resumes` bucket exist.

## Options considered

### Option 1: Full lean product schema

Create the four planned tables and the private `resumes` bucket now, with current scope fields only. Add ownership policies, constraints, indexes, and verification as part of the feature.

**Pros**:

1. Later product slices can write real data without redesigning ownership each time.
2. The schema stays aligned with the current product scope.
3. Verification catches missing policies before application code depends on them.

**Cons**:

1. It creates tables for later phases before their UI and agent code exist.
2. Any wrong field choice affects several later features.

### Option 2: Profile only schema

Create only `profiles` and the `resumes` bucket now. Defer job and agent tables until the job search phase.

**Pros**:

1. The immediate migration is smaller.
2. Less schema exists before it is used.

**Cons**:

1. The dashboard, job search, job details, and agent logging work would each reopen the foundation decision.
2. Ownership and indexing could drift across later migrations.

### Option 3: Broad future schema

Create the full build plan schema including dormant manual URL import values, tailoring fields, and extensibility columns for future product ideas.

**Pros**:

1. Fewer migrations may be needed if those ideas return soon.
2. Later experiments have columns ready.

**Cons**:

1. It exposes out of scope concepts to later code.
2. Dormant columns make tests, types, and policies harder to reason about.
3. Future requirements may not match the guessed fields.

## Decision

**Chosen option**: Option 1: Full lean product schema

Create the four application tables and the private `resumes` bucket now, with strict user ownership and only current scope fields.

**Implementation skills**: `architect` (`local/project`, `.agents/skills/architect/`) · `develop` (`local/project`, `.agents/skills/develop/`)

## Rationale

The full lean schema is the right foundation because every later data backed feature shares the same ownership model. Creating the tables now lets the project prove row level security once, before profile save, Adzuna discovery, company research, and dashboard reads start layering on top.

The important restraint is omitting dormant product fields. `context/project-overview.md` says manual job import and resume tailoring are out of scope, so this schema should not add `source = 'url'` or tailored resume fields yet. Adding them now would make future code handle states the product does not support.

The storage choice follows the current InsForge storage contract. The database saves both the returned URL and the storage key because the URL is useful for display and the key is needed for later download or delete operations.

## Feature design

**Data model sketch**:

| Entity | Key fields | Relationships and rules |
|---|---|---|
| `profiles` | `id uuid primary key`, `email text required`, profile fields, `resume_pdf_url text nullable`, `resume_pdf_key text nullable`, `is_complete boolean default false`, `completion_percentage integer default 0`, `missing_fields text[] default '{}'`, timestamps | `id` references `auth.users(id)`. One profile per auth user. Arrays default to empty arrays. JSON profile sections use `jsonb` and must be arrays or objects as named below. |
| `agent_runs` | `id uuid primary key`, `user_id uuid required`, `status text required`, `job_title_searched text required`, `location_searched text nullable`, `jobs_found integer default 0`, `error_message text nullable`, timestamps | `user_id` references `profiles(id)`. `status` is one of `running`, `completed`, or `failed`. |
| `jobs` | `id uuid primary key`, `user_id uuid required`, `run_id uuid nullable`, Adzuna fields, extracted job text fields, match fields, `company_research jsonb nullable`, timestamps | `user_id` references `profiles(id)`. `run_id` references `agent_runs(id)` with delete set null. `source` is required and checked as `search`. `match_score` is an integer from 0 to 100. |
| `agent_logs` | `id uuid primary key`, `user_id uuid required`, `run_id uuid nullable`, `job_id uuid nullable`, `level text required`, `message text required`, `context jsonb default '{}'`, `created_at timestamptz default now()` | `user_id` references `profiles(id)`. Optional links to run and job. `level` is one of `info`, `warning`, or `error`. Logs must not store secrets. |
| `resumes` bucket | object key `{user_id}/resume.pdf` | Private bucket. Application code saves both returned URL and returned key in `profiles`. |

`profiles` fields:

| Field | Type and rule |
|---|---|
| `id` | `uuid primary key references auth.users(id) on delete cascade` |
| `full_name`, `email`, `phone`, `location`, `current_title`, `salary_expectation`, `linkedin_url`, `portfolio_url` | `text`, nullable except `email` |
| `experience_level` | `text`, nullable, checked as `junior`, `mid`, `senior`, or `lead` |
| `years_experience` | `integer`, nullable, checked as zero or greater |
| `skills`, `industries`, `job_titles_seeking`, `preferred_locations`, `missing_fields` | `text[] not null default '{}'` |
| `work_experience` | `jsonb not null default '[]'`, checked as array |
| `education` | `jsonb nullable`, checked as object when present |
| `remote_preference` | `text`, nullable, checked as `remote`, `onsite`, `hybrid`, or `any` |
| `cover_letter_tone` | `text`, nullable, checked as `formal`, `casual`, or `enthusiastic` |
| `work_authorization` | `text`, nullable, checked as `citizen`, `permanent_resident`, or `visa_required` |
| `resume_pdf_url`, `resume_pdf_key` | `text nullable` |
| `is_complete` | `boolean not null default false` |
| `completion_percentage` | `integer not null default 0`, checked from 0 to 100 |
| `created_at`, `updated_at` | `timestamptz not null default now()` |

`agent_runs` fields:

| Field | Type and rule |
|---|---|
| `id` | `uuid primary key default gen_random_uuid()` |
| `user_id` | `uuid not null references profiles(id) on delete cascade` |
| `status` | `text not null default 'running'`, checked as `running`, `completed`, or `failed` |
| `job_title_searched` | `text not null` |
| `location_searched` | `text nullable` |
| `jobs_found` | `integer not null default 0`, checked as zero or greater |
| `error_message` | `text nullable` |
| `started_at` | `timestamptz not null default now()` |
| `completed_at` | `timestamptz nullable` |

`jobs` fields:

| Field | Type and rule |
|---|---|
| `id` | `uuid primary key default gen_random_uuid()` |
| `user_id` | `uuid not null references profiles(id) on delete cascade` |
| `run_id` | `uuid nullable references agent_runs(id) on delete set null` |
| `external_job_id` | `text nullable` |
| `source` | `text not null default 'search'`, checked as `search` |
| `source_url`, `external_apply_url` | `text not null` |
| `title`, `company`, `location` | `text not null` |
| `salary`, `job_type`, `about_company` | `text nullable` |
| `about_role` | `text not null` |
| `responsibilities`, `requirements`, `nice_to_have`, `benefits` | `text[] not null default '{}'` |
| `match_score` | `integer not null`, checked from 0 to 100 |
| `match_reason` | `text not null` |
| `matched_skills`, `missing_skills` | `text[] not null default '{}'` |
| `company_research` | `jsonb nullable`, checked as object when present |
| `found_at`, `created_at`, `updated_at` | `timestamptz not null default now()` |

`agent_logs` fields:

| Field | Type and rule |
|---|---|
| `id` | `uuid primary key default gen_random_uuid()` |
| `user_id` | `uuid not null references profiles(id) on delete cascade` |
| `run_id` | `uuid nullable references agent_runs(id) on delete set null` |
| `job_id` | `uuid nullable references jobs(id) on delete set null` |
| `level` | `text not null`, checked as `info`, `warning`, or `error` |
| `message` | `text not null` |
| `context` | `jsonb not null default '{}'`, checked as object |
| `created_at` | `timestamptz not null default now()` |

Indexes and uniqueness:

1. `profiles(email)`.
2. `agent_runs(user_id, started_at desc)`.
3. `agent_runs(user_id, status)`.
4. `jobs(user_id, found_at desc)`.
5. `jobs(user_id, match_score desc)`.
6. `jobs(user_id, company)`.
7. `jobs(user_id, title)`.
8. `jobs(user_id, external_job_id) unique where external_job_id is not null`.
9. `agent_logs(user_id, created_at desc)`.
10. `agent_logs(run_id, created_at desc) where run_id is not null`.
11. `agent_logs(job_id, created_at desc) where job_id is not null`.

Timestamp behavior:

1. `created_at` is set once with `now()`.
2. `updated_at` is set with `now()` on insert and refreshed by a shared database trigger on every update for `profiles`, `jobs`, and any future table that carries the column.

Row policies:

| Table | Select | Insert | Update | Delete |
|---|---|---|---|---|
| `profiles` | `id = auth.uid()` | `id = auth.uid()` | `id = auth.uid()` | `id = auth.uid()` |
| `agent_runs` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` |
| `jobs` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` |
| `agent_logs` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` |

**State transitions**:

| Entity | Transitions |
|---|---|
| `agent_runs.status` | `running` to `completed`, or `running` to `failed`. Completed and failed runs are terminal. |
| `profiles.is_complete` | `false` to `true` when required fields are present. It can return to `false` if a later profile edit removes required data. |
| `jobs.company_research` | `null` to object when company research succeeds. It remains `null` when research has not run. |

**API surface**:

| Surface | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| InsForge raw SQL migration | MCP action | guarded SQL for tables, constraints, indexes, policies | created or unchanged schema | admin tool access | invalid SQL, missing auth function, policy conflict |
| InsForge bucket creation | MCP action | bucket name `resumes`, private flag | created or existing bucket | admin tool access | bucket conflict, insufficient permission |
| InsForge schema verification | MCP action | table names and bucket name | table details, policy details, bucket list | admin tool access | missing table, missing policy, missing bucket |
| Later application reads and writes | SDK calls | authenticated user, table data | `{ data, error }` result | authenticated InsForge user | unauthenticated, forbidden by policy, validation error |

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Create profile row | Profile owner id | InsForge `auth.uid()` and `auth.users(id)` |
| Create profile row | Email | Current InsForge auth user email |
| Save resume reference | Resume URL | InsForge storage upload result `url` |
| Save resume reference | Resume key | InsForge storage upload result `key` |
| Create agent run | User id | Authenticated user id |
| Create agent run | Search title and location | Find Jobs form input |
| Complete agent run | Jobs found count | Count of jobs saved for the run |
| Save job | Source | Constant `search`, because only Adzuna discovery is in scope |
| Save job | External apply URL and source URL | Adzuna `redirect_url` |
| Save job | External job id | Adzuna job `id` when present |
| Save job | Title, company, location, salary, job type, found date | Adzuna response fields |
| Save job | About role | Adzuna description snippet |
| Save job | Structured job text | GPT extraction in later agent slice |
| Save job | Match score and reason | GPT matching in later agent slice |
| Save job | Matched and missing skills | GPT matching in later agent slice |
| Save company research | Company research dossier | Browserbase, Stagehand, and GPT synthesis in later company research slice |
| Write agent log | Message and context | Catch block in the agent operation |
| Update mutable rows | `updated_at` timestamp | Shared database trigger using `now()` |
| Verify schema | Table and policy details | InsForge `get_table_schema` |
| Verify storage | Bucket existence and privacy | InsForge `list_buckets` |

**Key invariants**:

1. Every user owned table has a `user_id` or user id primary key that maps to `auth.uid()`.
2. No table policy permits one authenticated user to read or write another user's rows.
3. `profiles.id` is the InsForge auth user id.
4. `jobs.source` is `search` until a manual import feature is designed.
5. `match_score` and `completion_percentage` stay in the range 0 to 100.
6. JSON fields that represent arrays or objects are checked at the database layer.
7. Agent logs never store API keys, OAuth tokens, resume contents, or raw secret values.
8. Resume objects use the key shape `{user_id}/resume.pdf`.
9. `updated_at` changes whenever a mutable row changes.

**Security model**:

JobPilot data is private to the owning authenticated user. The database enforces this with row level security and policies based on `auth.uid()`.

For `profiles`, the owner is `profiles.id = auth.uid()`. For `agent_runs`, `jobs`, and `agent_logs`, the owner is `user_id = auth.uid()`. The first implementation has no admin role, team role, shared workspace, or public read policy.

The `resumes` bucket is private. Application code must write files under the authenticated user's id prefix and save the returned key. If InsForge storage policies support path scoped rules, the bucket policy should also enforce that the first path segment equals `auth.uid()`.

This feature touches personal data, but it does not add payments, health records, or access control changes. Dedicated audit logs are not required in this slice, but `agent_logs` are required for agent failures.

**Configuration required**:

No new environment variables are required for the schema itself. The existing InsForge backend configuration from Feature 02 is the prerequisite.

**Critical test scenarios**:

1. Happy path: run the guarded migration and create the private `resumes` bucket on an empty backend, then metadata shows all four tables and the bucket, verifies **AC-1**, **AC-4**, and **AC-6**.
2. Repeat path: run the migration a second time and it completes without dropping data or duplicating constraints, verifies **AC-5**.
3. Scope control: inspect `jobs` constraints and confirm `source` only allows `search`, verifies **AC-2**.
4. Auth permission: inspect row level security and policies for every table, and confirm each policy is based on `auth.uid()`, verifies **AC-3**.
5. Failure case: try to create an invalid job match score or an invalid agent run status and the database rejects it, verifies **AC-1**.

## Build plan

The project build approach is Facade, but this feature is pure backend foundation. It should be built as a small infrastructure slice first, because later UI shells have already been created and the next product slices need real persistence.

1. Write a guarded SQL migration for the four tables, check constraints, foreign keys, defaults, timestamp trigger, and indexes, satisfies **AC-1**, **AC-2**, and **AC-5**.
2. Enable row level security and add owner scoped policies for select, insert, update, and delete on each table, satisfies **AC-3** and **AC-5**.
3. Create the private `resumes` storage bucket, and document the required key shape `{user_id}/resume.pdf`, satisfies **AC-4**.
4. Run the migration and bucket creation against the InsForge backend, satisfies **AC-1**, **AC-4**, and **AC-5**.
5. Verify tables, constraints, indexes, row level security, and storage through InsForge metadata tools, satisfies **AC-3** and **AC-6**.
6. Record the exact schema result in the progress tracker after verification, satisfies **AC-6**.

## Consequences

**Positive**:

1. Later features can build against real tables instead of mock data.
2. User ownership is enforced by the database, not only by application discipline.
3. Resume storage will support later download and delete work because the key is saved.

**Negative / tradeoffs**:

1. Several tables will exist before their feature pages and agents are built.
2. The current `jobs.source` constraint intentionally blocks manual URL import until a future migration changes it.
3. The schema has many constraints, so early test data must be realistic enough to satisfy them.

**Neutral**:

1. The current project docs still contain older InsForge storage examples that mention overwrite behavior. The current SDK docs say uploads return a key and may auto rename on conflict, so later resume upload work must use the returned key.
2. Server side application data access remains a later implementation concern. This feature creates the backend surface, not every server action that will use it.

## Follow-up

1. [ ] Reconcile `context/library-docs.md` before Feature 06 so the storage section reflects the current InsForge SDK behavior of saving the returned key and URL.
2. [ ] Feature 06 should design the server side data access helper for authenticated profile writes if the browser first auth model from spec 0001 is still the only session path.
