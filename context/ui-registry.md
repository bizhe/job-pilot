# UI Registry

Living document. Updated after every component is built. Read this before building any new component — match existing patterns exactly before inventing new ones.

---

## How to Use

Before building any component:

1. Check if a similar component already exists here
2. If yes — match its exact classes
3. If no — build it following ui-rules.md and ui-tokens.md, then add it here

After building any component — update this file with the component name, file path, and exact classes used.

---

## Components

### Database Schema Feature

**File:** `database/migrations/0002-database-schema.sql`

- No rendered UI or component classes changed
- No registry classes added

### Root Layout

**File:** `app/layout.tsx`

- Body layout: `min-h-full flex flex-col`
- Body uses `suppressHydrationWarning` because browser extensions may inject attributes such as `jf-observer-attached` before React hydration
- App content is wrapped in `PostHogProvider` so browser analytics initializes once at the root without making the layout a Client Component

### PostHog Provider

**File:** `components/analytics/PostHogProvider.tsx`

- Client boundary only, no visible UI classes
- Calls `initPostHog()` in `useEffect`
- Returns `children` unchanged

### Homepage

**File:** `app/page.tsx`

- Page shell: `mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8`
- Primary action: `inline-flex min-h-11 items-center justify-center gap-1 rounded-md bg-text-slate px-5 py-2 text-sm font-medium text-accent-foreground`
- Secondary action: `inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-5 py-2 text-sm font-medium text-text-primary`
- Marketing section edge: `border-x border-t border-border`
- Feature heading row: `flex min-h-56 items-center px-8 py-12 sm:px-14 lg:min-h-64 lg:px-16`
- Feature copy block: `relative px-8 py-7 sm:px-14 lg:px-16`
- Image panel: `flex items-center justify-center bg-surface-muted p-8 sm:p-12 lg:p-16`
- Section separator: `h-12 border-b border-border` with the token based diagonal pattern in `app/globals.css`
- Focus treatment: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`
- Skip link: visually hidden with `sr-only`, revealed only while keyboard focused

### Auth Panel

**File:** `components/auth/AuthPanel.tsx`

- Auth card: `w-full max-w-xl rounded-xl border border-border bg-surface p-6 shadow-preview sm:p-8`
- Eyebrow: `text-xs font-semibold uppercase tracking-widest text-accent`
- Provider button: `group flex min-h-16 w-full items-center justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-70`
- Provider mark: `flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface-secondary text-sm font-semibold uppercase text-text-dark`
- Error message: `rounded-md border border-error bg-surface-secondary px-3 py-2 text-sm text-error`

### Login Page

**File:** `app/(auth)/login/page.tsx`

- Login viewport: `page-shell relative flex min-h-screen items-center justify-center py-12`
- Back link placement: `nav-link absolute left-4 top-8 sm:left-6 lg:left-8`
- Centered card wrapper: `w-full max-w-xl`

### Auth Callback Panel

**File:** `components/auth/AuthCallbackPanel.tsx`

- Callback card: `w-full max-w-xl rounded-xl border border-border bg-surface p-6 text-center shadow-preview sm:p-8`
- State heading: `mt-4 text-3xl font-semibold tracking-tight text-text-primary`
- Status text: `mt-4 text-sm leading-6 text-text-secondary`

### Protected Page Shell

**File:** `components/auth/ProtectedPage.tsx`

- Loading shell: `page-shell flex min-h-screen items-center justify-center py-12`
- Loading card: `w-full max-w-lg rounded-xl border border-border bg-surface p-6 text-center shadow-preview`
- Protected content shell: `page-shell py-8`
- Protected header card: `rounded-xl border border-border bg-surface p-6 shadow-preview`
- Placeholder content card: `rounded-xl border border-border bg-surface p-6 shadow-preview`

### Profile Page

**File:** `app/profile/page.tsx`
**Component:** `components/profile/ProfilePageContent.tsx`

- App header: `border-b border-border bg-surface`
- Header inner shell: `mx-auto flex min-h-16 w-full max-w-[2560px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-10`
- Header nav item: `flex min-h-16 items-center gap-2 border-b-2 border-transparent px-1 text-sm font-semibold text-text-secondary transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:text-base`
- Active profile nav item: `flex min-h-16 items-center gap-2 border-b-2 border-accent px-1 text-sm font-semibold text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:text-base`
- Page shell: `mx-auto flex w-full max-w-[1640px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8 xl:max-w-[1640px] xl:px-0`
- Content stack: `mx-auto flex w-full max-w-6xl flex-col gap-8`
- Attention card: `grid gap-8 rounded-xl border border-error/20 bg-surface p-6 shadow-preview sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center`
- Resume card: `rounded-xl border border-border bg-surface p-6 shadow-preview sm:p-8`
- Upload target: `mt-8 rounded-xl border-2 border-dashed border-border bg-surface-secondary px-6 py-12 text-center sm:py-16`
- Resume action grid: `mt-8 grid gap-5 border-t border-border pt-6 lg:grid-cols-2`
- Resume extraction panel: `flex flex-col gap-4 rounded-lg border border-border bg-surface-secondary p-5`
- Resume extraction button: `inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-accent px-6 py-3 text-base font-bold text-accent-foreground shadow-preview transition-colors hover:bg-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60`
- Profile information card: `rounded-xl border border-border bg-surface p-6 shadow-preview sm:p-8`
- Field grid: `grid gap-6 lg:grid-cols-2`
- Text input: `mt-3 min-h-14 w-full rounded-md border border-border bg-surface-secondary px-4 text-base font-medium text-text-primary shadow-sm transition-colors placeholder:text-text-muted focus:border-accent focus:outline-2 focus:outline-offset-2 focus:outline-accent`
- Select wrapper: `relative mt-3`
- Addable input row: `mt-3 flex gap-3`
- Skill chip: `rounded-md border border-border bg-surface-secondary px-4 py-2 text-base font-bold text-text-primary`
- Work experience panel: `rounded-xl border border-border bg-surface-secondary p-6`
- Primary save button: `min-h-14 w-full rounded-lg bg-accent px-6 py-4 text-base font-bold text-accent-foreground shadow-preview transition-colors hover:bg-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`
- Profile loading card: `rounded-xl border border-border bg-surface p-6 text-center shadow-preview sm:p-8`
- Form status message: `mt-6 rounded-md border border-border bg-surface-secondary px-4 py-3 text-sm font-semibold text-text-dark`
- Resume upload feedback: `mt-4 text-sm font-semibold text-error`
- Disabled action state: `disabled:cursor-not-allowed disabled:opacity-70`
