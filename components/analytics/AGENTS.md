# Analytics Components

This area owns client analytics boundaries only.

- `PostHogProvider.tsx` is a Client Component wrapper. It should return children unchanged and only call `initPostHog()` from `lib/posthog-client.ts`.
- Keep PostHog event names in `lib/posthog-client.ts`, not in UI components.
- The only approved product event names are listed in `context/code-standards.md`.

_Drafted by /sync from the introducing change, worth a quick human pass._
