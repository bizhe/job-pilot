# PostHog post-wizard report

PostHog has been integrated into the Next.js App Router application. The browser SDK is initialized through the shared `lib/posthog-client.ts` helper from both `instrumentation-client.ts` and the root `PostHogProvider`, with an idempotent guard so it only starts once. Automatic pageviews are disabled so product events stay explicit.

| Event name | Description | File |
| --- | --- | --- |
| `job_search_started` | User starts a job search. | `lib/posthog-client.ts`, `lib/posthog-server.ts` |
| `job_found` | A discovered job is saved with a match score. | `lib/posthog-client.ts`, `lib/posthog-server.ts` |
| `profile_completed` | User completes their profile for the first time. | `lib/posthog-client.ts`, `lib/posthog-server.ts` |
| `company_researched` | Company research is generated for a job. | `lib/posthog-client.ts`, `lib/posthog-server.ts` |

## Next steps

We've built an analytics workspace for the newly instrumented events:

- [Analytics basics (wizard) dashboard](https://eu.posthog.com/project/225311/dashboard/825884)

The typed custom event helpers are ready, but most event call sites depend on later job, profile, and research features. Auth pages identify the user after session confirmation but do not emit custom auth events, because this project only allows the four product events listed above.

## Verify before merging

- [ ] Run a full production build and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` to `.env.example` and any bootstrap scripts so collaborators know what to set.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or the bundler upload step) into CI so production stack traces de-minify.
- [x] Confirm the returning-visitor path also calls `identify` — the protected-page session check provides this coverage.

### Agent skill

An agent skill folder remains in the project for future PostHog integration work, helping coding agents apply current framework-specific guidance.
