# Recording Workspace Migration Plan

## Objectives
- Rebuild the legacy recording experience inside the new Next.js dashboard.
- Keep the fresh UI while preserving the dual transcript panes (live + finalized) and speaker metadata.
- Remove BYOK storage: Soniox/OpenAI keys live in server env vars; clients receive only short-lived credentials.
- Maintain the existing Supabase persistence flow (sessions table, auto-summary trigger).

## Legacy Flow Highlights (from `index.html`)
1. **Audio pipeline**
   - `buildMixedStream()` opens mic plus optional system/tab audio, mixes via `AudioContext`, and applies gain controls.
   - Permission failures and screen-share endings stop the transcription gracefully.
2. **Soniox streaming**
   - `SonioxClient` instantiated in the browser with BYOK key from `localStorage`.
   - `onPartialResult` merges tokens into `liveEl` (non-final) and `finalEl` (finalized with diarization labels).
   - `onFinished` saves the session to Supabase, kicks off summary/homework generation, updates UI badges.
3. **UI contract**
   - Controls: start/stop/cancel buttons, capture toggles, gain sliders, timer, status pill.
   - Panels: live transcript, finalized transcript, speaker count, session metadata.
   - Student flow: pre-record picker, per-student session management, history list actions.

## Proposed Architecture
### Server
- **Env Secrets**: `SONIOX_API_KEY`, `OPENAI_API_KEY` stored in Vercel env.
- **Short-Lived Soniox Token endpoint** (`POST /api/soniox/token`):
  1. Authenticate request (ensure Supabase session exists).
  2. Call Soniox REST API to mint a temporary WebSocket token (expires ~1h).
  3. Return only the ephemeral token + connection info to the client.
- **Session persistence**: reuse existing Supabase inserts; optionally move heavy work (summary/homework) to background job queue later.

### Client (Recordings Workspace)
- **React components**
  - `RecordingPage` (server) ? loads recent sessions; renders the client component with props.
  - `RecordingConsole` (client): handles state machine (idle ? requesting permissions ? connecting ? live ? finished/error).
  - `TranscriptPane` (live/final) & `StatusBar`, `DeviceControls`, `StudentPicker` etc.
- **State & Hooks**
  - `useAudioMixer` to encapsulate `AudioContext`, mic/system capture, gain adjustments, cleanup.
  - `useSonioxStream` to request a token from `/api/soniox/token`, open the WebSocket, and emit partial/final tokens.
  - `useSessionRecorder` to aggregate transcripts, update Supabase via server actions when recording stops.
- **UI Updates**
  - Live pane updates on every partial token; final pane adds diarized text on `is_final` tokens.
  - Status pill & timer driven by stream callbacks.
  - History list refresh after save (reuse existing loader + `renderHistoryRefresh`).

## Data Flow (Start ? Finish)
1. User clicks **Start Recording**.
2. Client requests `/api/soniox/token`; server returns a short-lived token (or error if unavailable).
3. Client obtains media streams via `useAudioMixer`, builds mixed `MediaStream`.
4. `useSonioxStream` connects to Soniox with token, pushes audio frames, receives transcripts.
5. UI renders live/final transcripts in real time; speaker map maintained client-side.
6. User stops recording or Soniox signals completion.
7. Client stops audio tracks, sends final transcript + metadata to server action ? Supabase `sessions` table.
8. Server schedules summary/homework (existing `autoGenerateContent` triggered via server-side queue or background call).
9. UI refreshes session history, shows generation status chips.

## Incremental Build Plan
1. **Blueprint UI & Hooks**
   - Create `RecordingConsole` component with placeholder data + state machine (no audio yet).
   - Implement `TranscriptPane`, `StatusIndicator`, `ControlBar` components using Tailwind styling consistent with current design.
2. **Audio Capture Layer**
   - Port `buildMixedStream`, `stopAllTracks`, gain sliders into a reusable hook.
   - Add device permission handling + error states.
3. **Server Endpoint for Tokens**
   - Implement `/api/soniox/token` using env `SONIOX_API_KEY`, returning `{ token, expiresAt, url }`.
   - Protect endpoint via Supabase auth check.
4. **Soniox Streaming Hook**
   - Integrate Soniox Web SDK (or websocket wrapper) to send mixed audio and receive tokens.
   - Parse partial/final tokens, update client state similarly to `appendFinalToken`/`buildLiveFromNonfinal`.
5. **Persistence Integration**
   - Replace placeholder save with server action that inserts session + triggers generation (existing logic reused/ported).
   - Refresh history upon completion.
6. **QA & Hardening**
   - Ensure token refresh if recording spans >1h (before expiry).
   - Handle websocket disconnects, Soniox errors, and user cancellations.
   - Cross-browser testing for audio capture (Chrome, Edge, Safari).

## Open Questions / To Validate
- Confirm Soniox API for issuing short-lived tokens (endpoint, payload, expiry).
- Decide whether to proxy the entire websocket through Next.js (for stricter control) or connect directly with the temporary token.
- Determine how to throttle or queue auto-generation if multiple sessions finish at once (future enhancement).

## Next Action
Start with step 1: scaffold the `RecordingConsole` client component and related UI pieces so we can plug in audio/streaming afterwards.
