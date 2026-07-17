# Profile Components

This area owns the profile page UI components used by `app/profile/page.tsx`.

## Local rules

Keep InsForge reads, writes, normalization, resume upload behavior, and resume extraction behavior in `lib/profile.ts`. Profile components may call those helpers after browser session confirmation, but should not inline database, storage, PDF parsing, or OpenAI query chains.

Keep auth confirmation in the page level client boundary. The current user id must come from `auth.getCurrentUser()`, never from form input.

Use named exports for profile components.

Use project tokens from `app/globals.css` through Tailwind classes. Do not use raw Tailwind color classes or hardcoded color values.

Use accessible form markup. Group related fields with `fieldset` and `legend`, connect every input to a visible label, and keep buttons as real `button` elements.

Keep the profile UI aligned with `context/designs/profile.png` and the recorded classes in `context/ui-registry.md`.

## Current files

`ProfilePageContent.tsx` renders the protected profile screen. It includes the app header, attention card, resume card, profile form, browser session loading, save flow, resume upload flow, resume extraction flow, and friendly error states.

`../../lib/profile.ts` owns profile form types, completion calculation, value normalization, load or create behavior, save behavior, resume PDF validation, and the browser helper that calls resume extraction.

_Drafted by /sync from the introducing change, worth a quick human pass._
