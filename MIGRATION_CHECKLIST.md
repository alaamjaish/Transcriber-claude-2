# Migration Checklist

## ? Completed
- Next.js 15 + TypeScript app scaffolded at `webapp/` with Tailwind, ESLint, and npm scripts.
- Auth flows wired to Supabase (sign-in, sign-up, sign-out) with guarded dashboard layout.
- Server data loaders fetch Supabase rows for authenticated users (`src/lib/data-loaders.ts`).
- Recording console UI scaffolded with audio mixer, Soniox token + stream hooks (`src/app/(dashboard)/recordings/**`).
- Soniox short-lived token API route + helper implemented (`src/app/api/soniox/token`, `src/lib/soniox.ts`).

## ?? Next Up
- Implement actual Soniox websocket integration in `useSonioxStream` once token semantics confirmed.
- Persist completed sessions and trigger summary/homework generation from the new pipeline.
- Build settings page for profile & credential management.
- Add integration tests around recording start/stop flows.
