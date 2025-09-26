# Production Build Brief

## Purpose
- Deliver a production-ready web app that lets language teachers record lessons, transcribe audio in real time, and generate lesson artifacts (summaries, homework) automatically.
- Replace the current static HTML prototype with a maintainable Node.js/TypeScript codebase that follows modern conventions and can be deployed confidently to Vercel.

## Target Stack & Principles
- Runtime: Node.js 20+, TypeScript-first codebase.
- Framework: Next.js (App Router) with server components for data/API routes and client components for real-time UX.
- Hosting & CI/CD: Vercel projects for web app + background jobs.
- Styling: Tailwind CSS (or equivalent utility-first system) with a shared design tokens file.
- State management: React Query/Server Actions for data fetching, Context only where necessary.
- Testing: Playwright (critical flows), Vitest for unit/logic, ESLint + Prettier enforced.
- Observability: Vercel Analytics + structured logging for server routes.

## Primary User Journey (Teacher)
1. Lands on app, creates an account or signs in.
2. Completes onboarding checklist (microcopy, ability to paste service keys or connect integrations once we manage them centrally).
3. Enters the Recording Workspace, selects an existing student or creates a new one.
4. Starts a session: records mic + optional system/tab audio, sees live transcript and speaker labels.
5. Ends the session: transcript is saved, summary/homework generation kicks off automatically in the background.
6. Reviews recent sessions, opens one to copy/export transcript or AI outputs, optionally regenerates content.
7. Drills into a specific student to manage their sessions, rename, or reassign work.

## Surface Area (v1)
1. **Authentication Shell** – email/password sign-up & sign-in, password reset, minimal branding.
2. **Recording Workspace** – core dashboard with:
   - Current user badge and global actions (logout, settings).
   - Recording controls (start/stop/cancel, mic/system toggles, gain sliders, timer, status pill).
   - Live transcript pane (partial + final text, speaker counts) and session metadata.
   - History list (latest N sessions with actions: view/copy/export/delete, summary/homework status chips).
   - Student picker modal and student management panel.
3. **Student Detail View** – per-student dashboard showing session list with same actions plus move/rename/delete student flows.
4. **Settings Dialogs** – service credential management, audio device selection, feature toggles.
5. **Global overlays** – onboarding checklist, blocking modals when prerequisites (credentials, permissions) are missing.

## Core Capabilities to Implement
- **Auth & Accounts**: secure email-based auth, session management, guarded routes, basic profile settings.
- **Audio Capture Pipeline**: browser capture (mic + optional system audio), mixing to 48k stream, WebSocket bridge to transcription provider, resiliency around permission loss/dropouts.
- **Real-Time Transcript UI**: handle partial/final tokens, diarization labels, speaker map, scroll locking.
- **Session Persistence**: store transcript, duration, timestamps, relationship to teacher + student, track generation state (idle/generating/complete/empty/error).
- **AI Artifact Generation**: server-side job that produces Markdown summary + homework, updates session records, exposes regenerate endpoint, guards against duplicate runs.
- **Student Management**: CRUD for students, assign/unassign sessions, delete with reassign option, maintain “current student” state.
- **Exports & Sharing**: copy to clipboard, download text/Markdown files, shareable links in later phases.

## External Integrations (Initial)
- Speech-to-text vendor providing streaming transcription with diarization (current solution: Soniox Web SDK).
- Large language model provider for summaries/homework (current solution: OpenAI Chat Completions).
- Hosted relational database with row-level security (existing data lives here; continue to use it via server layer).

## Data Model (Conceptual)
- **Teacher** – authenticated user, owns students and sessions.
- **Student** – `{ id, teacherId, name, createdAt }`.
- **Session** – `{ id, teacherId, studentId?, recordedAt, durationMs, transcript, summaryMd?, homeworkMd?, generationStatus }`.
- **Audit/Event Log (future)** – track regenerate/delete actions.

## Non-Functional Requirements
- Secure handling of third-party keys (managed server-side, never exposed in client bundle).
- Responsive, accessible UI (keyboard support for modals, proper aria roles, high contrast).
- Clear error states and retry paths for transcription failures and AI generation.
- Telemetry around recording start/stop, job completion, and critical errors.
- Environment-driven configuration for service endpoints and feature flags.

## Phase 1 Deliverable
- Deployed Next.js app on Vercel with working auth, recording workspace, student view, and automated AI artifact generation.
- Automated test coverage of happy-path recording and session retrieval.
- Deployment pipeline + environment documentation handed off to the team.
