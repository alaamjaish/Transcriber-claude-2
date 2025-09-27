# Complete Migration Checklist

## Purpose
Build feature parity between the legacy browser-only prototype and the Next.js workspace while adopting production-ready key management. Keys stay server-managed (no BYOK modal parity needed) but every teacher-facing workflow present in `index.html` and `student.html` must exist in the new UI.

---

## Phase P0 – Restore End-to-End Recording Loop
Focus on the two blockers: student targeting and session persistence with transcript access.

- [ ] **Student selection modal before recordings**
  - Current gap: `webapp/src/app/(dashboard)/recordings/components/RecordingControls.tsx:22` invokes `onStart` immediately; `RecordingWorkspaceShell.tsx:22` never checks for a selected student.
  - Legacy reference: modal workflow lives in `index.html:828` (picker build), `index.html:871` (auto-select last student), and `index.html:967` (block start until `currentStudentId` exists).
  - Implementation notes:
    - Add a client-side context or hook (`SelectedStudentProvider`) to keep track of `currentStudentId`, backed by a Supabase preference row (for example a new `teacher_preferences.current_student_id`) so the choice persists without using local storage.
    - Build a `StudentPickerDialog` component (new file under `webapp/src/app/(dashboard)/recordings/components/`) styled to match the Next.js design. Trigger it from the Start button when no student is set.
    - Provide create/search within the modal by wiring Supabase insert calls (see task below) and preselect the stored student when reopening.
    - [x] Added `SelectedStudentProvider` to sync `currentStudentId` with Supabase preferences (`src/components/layout/SelectedStudentProvider.tsx`, `src/app/(dashboard)/layout.tsx`).
    - [x] Wired `StudentPickerDialog` + start gating in `RecordingWorkspaceShell.tsx` so recording cannot start without a chosen student.
    - [x] Start flow always routes through the picker (preselecting the last student for quick confirmation).

- [ ] **Create student server actions / API**
  - There is no Supabase insert anywhere in the web app (`Select-String` over `webapp/src/**/*.ts*` finds no `.insert(` for `students`).
  - Legacy logic for deduped creation sits in `index.html:472` and `student.html:510`; reproduce this on the server via a route or Server Action (e.g. `webapp/src/app/api/students/route.ts`).
  - Ensure the handler injects `owner_user_id` from the authenticated session and returns the new row for picker preselection.
  - [x] Added `listStudentsAction` + `createStudentAction` server actions (`src/app/actions/students.ts`) for modal data/creation.

- [x] **Persist sessions when stopping Soniox**
  - Current stop path (`RecordingWorkspaceShell.tsx:63`) just calls `cleanupRecording` with no Supabase write.
  - Legacy persistence lives in `index.html:737` (`saveSession`) and is invoked from both `stopTranscription()` and Soniox `onFinished` (`index.html:991`).
  - Required changes:
    - Capture the finalised transcript and duration from `RecordingConsole`. Extend its API so `onStop` receives `{ finalText, durationMs, speakerCount }` (state is held around `RecordingConsole.tsx:35-144`).
    - Implement a Server Action or API (`/api/sessions`) that inserts `timestamp`, `duration_ms`, `transcript`, `student_id`, and `owner_user_id` using the authenticated Supabase client (`webapp/src/lib/supabase/server.ts:1`).
    - [x] Added `saveSessionAction` for Supabase persistence and wired `RecordingWorkspaceShell` stop flow to call it (`src/app/actions/sessions.ts`, `src/app/(dashboard)/recordings/components/RecordingWorkspaceShell.tsx`).
    - [x] UI now surfaces saving status/errors during stop (same shell component).
    - [x] Duration now computed from Soniox start timestamp fallback so Supabase rows show accurate minutes (`useSonioxStream.ts`, `saveSessionAction`).

- [ ] **Refresh session lists after insert**
  - `RecordingsPage` relies on `loadRecentSessions` (`webapp/src/lib/data-loaders.ts:112`), but there is no client-side refresh post-insert.
  - Provide a mutation hook or revalidation strategy (e.g. `useRouter().refresh()` after the Server Action resolves) so the new session appears in `/recordings` without a manual reload.
  - [x] `RecordingWorkspaceShell` now triggers `router.refresh()` after saving, and server action revalidates `/recordings` + `/students`.

- [x] **Enable transcript viewing in the recordings list**
  - Buttons rendered at `webapp/src/app/(dashboard)/recordings/page.tsx:83-90` are static; no handlers or data fetch for full text.
  - Bring over the legacy behaviours from `index.html:1207` (view), `index.html:1222` (copy), and `index.html:1231` (download) using Next.js patterns (modals or drawers).
  - Ensure these actions read the transcript that was just saved (avoid duplicating `loadRecentSessions`; consider on-demand fetch via `/api/sessions/[id]`).
  - [x] Replaced the static list with interactive `SessionList` client component (view/copy/export) backed by transcripts from Supabase (`loadRecentSessions`, `src/app/(dashboard)/recordings/components/SessionList.tsx`).

- [ ] **Student workspace transcript drill-down**
  - `students/[studentId]/page.tsx:78-86` renders Transcript/Summary/Homework buttons with no logic.
  - Replicate legacy per-session controls from `student.html:470-552`, at minimum enabling transcript preview toggles and delete operations (move can fall into P1, but deletion is part of the MVP workflow).
  - Use the same data fetch improvements as above so the transcript is consistent between `/recordings` and `/students/:id`.
  - [x] Added client `StudentSessionList` to view/copy/export transcripts per session (no delete/move yet).

- [ ] **Supabase delete + re-fetch hook-up**
  - Legacy deletion is handled at `student.html:514` and `index.html:1244`. Implement Server Actions to delete sessions and wire them to the buttons rendered in both new views.
  - After deletion, refresh the loaders to keep counts accurate.

---

## Phase P1 – Student Management Parity
Once the core loop works, port the remaining student utilities.

- [ ] **Students directory toolbox**
  - `students/page.tsx:23-60` shows each student with a “Set as current” button that does nothing.
  - Reuse the selection context from Phase P0 so clicking the button updates `currentStudentId`, gives feedback, and refreshes the pill in the recorder header.
  - Add UI affordances for opening the workspace and inline rename/delete actions similar to `student.html:557-687` (can be modals or dropdown menus).

- [ ] **Rename student**
  - Legacy rename flow lives at `student.html:557-571`. Implement a Server Action to update `students.name` and propagate to the directory list and picker.

- [ ] **Delete / reassign student**
  - The legacy delete modal (`student.html:604-685`) supports reassignment and an “Unassigned” helper.
  - Rebuild this modal with modern UI primitives, ensuring the reassignment logic calls Supabase updates for each session before deleting the student row.

- [ ] **Session move between students**
  - Port the move-control logic from `student.html:497-552` into the new student workspace so a session can be re-tagged and the page refreshed.

---

## Phase P2 – AI Automation & Status Surfacing
With persistence handled, migrate the OpenAI hooks and status UX.

- [ ] **Server-side summary/homework generation**
  - Existing AI module (`ai-features/summarizer.js:1-240`) runs in-browser with BYOK keys. Replace it with server code that reads managed keys and runs via a Route Handler or Server Action.
  - Trigger auto-generation right after session insert (Phase P0 task) and persist results back to Supabase (`sessions.summary_md`, `sessions.homework_md`).
  - Provide manual regenerate buttons in both `/recordings` and `/students/:id`, following the legacy contract at `index.html:1110-1188` and `student.html:520-583`.

- [ ] **Generation status tracking**
  - Implement status columns in Supabase or move the local storage keys defined in `ai-features/summarizer.js:254-332` to the server.
  - Update UI badges (`statusLabel` usage at `recordings/page.tsx:71` and `students/[studentId]/page.tsx:81`) to reflect real job states (queued, generating, empty, complete).

- [ ] **Export workflows**
  - Restore `.txt`/`.md` export and clipboard actions from `index.html:1213-1259` and `student.html:474-551` using Next.js-friendly APIs (e.g. blob downloads via route handlers).

---

## Phase P3 – Polish & Testing
- [ ] **Unit/integration coverage** for audio pipeline hooks (`useAudioMixer.ts:1-106`, `useSonioxStream.ts:1-176`) and server actions, mirroring the scenarios exercised in the legacy UI.
- [ ] **Settings surface**: replace placeholder cards in `settings/page.tsx:1-37` with actual forms for managed credentials and recording defaults (mic/system gain presets, notification toggles).
- [ ] **Performance & error UX**: add toast/error banners when Soniox token issuance fails (`RecordingWorkspaceShell.tsx:15`, `useSonioxToken.ts:1-56`) or when Supabase mutations reject.

---

## Reference Map
- Legacy prototype sources: `index.html` (student picker, session history, summary/homework) and `student.html` (per-student management, delete/move flows).
- New Next.js surfaces:
  - Recorder: `webapp/src/app/(dashboard)/recordings/**`
  - Students: `webapp/src/app/(dashboard)/students/**`
  - Data loaders: `webapp/src/lib/data-loaders.ts`
  - Supabase helpers: `webapp/src/lib/supabase/server.ts`

Keep this checklist updated as tasks land so collaborating agents can jump in with full context.
