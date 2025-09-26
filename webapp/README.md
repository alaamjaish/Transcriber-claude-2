# Transcriber Studio Web

Modern Next.js frontend for the lesson recording platform. The app now includes authenticated dashboards, Supabase-backed data loaders, and placeholders for the audio/AI workflows.

## Requirements
- Node.js 20+
- npm 10+
- Supabase project with the auth + tables from `schema.sql`

## Setup
1. `npm install`
2. Copy `.env.example` ? `.env.local` and populate:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (optional for local scripts, not required at runtime)
3. (Optional) Disable email confirmations in Supabase auth settings during local development so sign-up flows create a session immediately.

## Scripts
- `npm run dev` - start the Next.js dev server on http://localhost:3000
- `npm run lint` - run ESLint against the project
- `npm run build` / `npm start` - production build & run

## Project Map
- `src/app/page.tsx` - marketing/landing view
- `src/app/auth/*` - auth layout + forms powered by Supabase server actions
- `src/app/(dashboard)/*` - authenticated workspace surfaces (recordings, students, settings)
- `src/lib/supabase/*` - SSR/browser helpers
- `src/lib/data-loaders.ts` - server data loaders with graceful fallbacks to mock data
- `src/components/**` - shared UI primitives and layout shell

## Current Capabilities
- Email/password sign-in & sign-up via Supabase auth
- Dashboard layout gated behind an active session (redirects to `/auth/sign-in` when unauthenticated)
- Sessions/students fetched for the logged-in user when Supabase config is present, otherwise mocked locally for design work

## Next Steps
- Wire the audio capture/transcription pipeline into `/recordings`
- Expand settings for profile & credential management
- Replace mock AI status with real job polling once the backend queue is available

