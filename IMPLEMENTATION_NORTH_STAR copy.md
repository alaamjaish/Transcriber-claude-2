# Final North Star — Two‑Page BYOK Transcriber (Merged)

*A merged, de‑duplicated, reality‑checked guide that combines the best of both drafts. Use this as the single compass before building anything.*

---

## 1) Vision

Build a **tiny, reliable, fast** web app for teachers to:

* **Record** lessons (mic + optional tab/system audio)
* **Transcribe in real time** with **Soniox** (+ diarization)
* **Generate lesson summaries/homework** with **OpenAI**
* **Organize by students** (two simple pages: Main, Student)

**Target users:** \~30–40 non‑technical teachers. **Mindset:** function over flash; stability over features.

**Success (realistic):**

* **High reliability** during lessons (clear errors, safe stops)
* **Low latency** suitable for live teaching
* **Two clicks** from login to recording
* **Predictable costs** via **BYOK** (every teacher brings their own keys)
* **Minimal maintenance** (static hosting + managed DB)

---

## 2) Core Principles

**Simplicity**

* Two pages only: `index.html` (Main) and `student.html?id=…` (reusable Student page)
* Prefer **plain HTML/CSS/JS**; no framework
* Use **boring tech**; minimize dependencies

**Performance**

* Direct **browser → Soniox WebSocket** (no proxy)
* Client‑side audio capture/mix via Web Audio
* Update UI only when text changes

**Reliability**

* Clear status: *idle / LIVE / finished / error*
* Clean start/stop/cancel lifecycles; always stop tracks
* Consistent UX on Chrome/Edge (primary support)

**Security & Cost**

* **BYOK** for Soniox & OpenAI; **keys live in the user’s browser** (localStorage)
* No secrets in repo; no keys in the database
* Supabase **Row Level Security** to isolate user data

**Pragmatism**

* Prefer direct browser→API calls; add a tiny proxy **only if** CORS/rate limits force it (OpenAI only; never for Soniox WS)
* No offline mode (network required)

---

## 3) High‑Level Architecture

**Hosting:** Vercel (static pages over HTTPS)
**Auth & DB:** Supabase (Auth + Postgres + RLS)
**Transcription:** Browser → Soniox SDK (WebSocket) using user’s Soniox key
**Summaries/Homework:** Browser → OpenAI Chat Completions using user’s OpenAI key
**Data Persistence:** Supabase tables for students & sessions

*(Optional later)*: Small serverless function only if OpenAI direct calls hit CORS/rate limits or you need rate‑limit control.

---

## 4) Data Model (conceptual)

**users** (Supabase Auth managed)

**students**

* `id` (uuid)
* `owner_user_id` (uuid → users.id)
* `name` (text)
* `created_at` (timestamptz)

**sessions**

* `id` (uuid)
* `owner_user_id` (uuid → users.id)
* `student_id` (uuid → students.id)
* `timestamp` (timestamptz)
* `duration_ms` (int)
* `transcript` (text)
* `summary_md` (text, nullable)
* `homework_md` (text, nullable)
* `created_at` (timestamptz)

**Indexes:** `(owner_user_id, created_at)` and `(student_id, created_at)`.

---

## 5) UI Shape (two pages)

### A) Main page (`index.html`)

**Header/Status row**

* Status pill (*idle / LIVE / finished / error*)
* Model badge, multilingual badge, **speakers count**
* **Current Student pill**: `student: <name>` (shows who you’ll record for)

**Controls**

* Checkbox: *Capture browser/system audio*
* Sliders: *Mic gain* and *System gain*
* Buttons: **Start Transcribing**, **Stop**, **Cancel**
* Utility: **Students** (opens Students panel), **Set/Change keys**, **Clear all**

**Student Picker (MANDATORY before recording)**

* On **Start Transcribing**, open a **modal**:

  * Radio list of existing students (Scrollable list)
  * `+ New student` input + Add
  * **Continue & Start** (records for the selected/new one)
  * (This matches your current behavior and must remain.)

**Students Panel (from Main)**

* List all students with session counts
* Actions: **Open** (go to `student.html?id=…`), **Set as current** (updates Current Student pill)

**Transcripts**

* **Live Transcript** area (updates with non‑final tokens)
* **Final Transcript** area (locked final segments grouped by speaker)

**Session History (from DB)**

* List of sessions (newest first) with actions:

  * **View / Copy / Export .txt / Delete**
  * **Summary / Refresh / View / Copy .md / Export .md**
* Each row shows timestamp, duration, session id, and **student link**

### B) Student page (`student.html?id=<student_id>`)

* Header: `Student — <name>` + session count pill
* Actions: **Record for Student** (sets as current and returns to Main), **Rename**, **Delete Student**
* Sessions list (newest first) with actions:

  * **View / Copy / Export .txt / Move / Delete**
  * **Summary / Refresh / View / Copy .md / Export .md**
* Delete modal supports: **Reassign sessions** to another student (or **Unassigned**) or **Delete all**

---

## 6) Core Flows

**Auth**

1. If not logged in → Supabase Auth (email, optionally Google)
2. On login → redirect to Main

**BYOK Key Setup (per user, per device)**

1. On first visit after login, if keys missing → show one modal asking for **Soniox key** and **OpenAI key**
2. Store both in **localStorage**
3. Allow changing keys later (Settings link)

**Transcription**

1. Click **Start Transcribing** → **Student Picker modal** appears
2. Choose existing student or add new → **Continue & Start**
3. Browser mixes mic (+ optional tab/system audio) → Soniox WS
4. Live tokens render; final tokens lock into segments with speaker labels
5. On **Stop**: finalize and **save session to Supabase** (timestamp, duration, transcript, student id)

**Summary / Homework**

1. Click **Summary** or **Homework** beside a session
2. Browser calls **OpenAI** with user’s key; receive Markdown
3. Save into `summary_md` or `homework_md` in `sessions`
4. Buttons: View/Copy/Export `.md`

**Student Management**

* Create/rename/delete students
* Move session to another student (updates DB)
* Reassign on delete (or delete all)

---

## 7) Platform Constraints & Guarantees

* **Modern Chrome/Edge required**; macOS typically supports **tab audio** (system audio varies by OS/browser)
* **HTTPS hosting** (Vercel) to avoid `file://` origin issues and enable permissions
* **No offline mode**; show clear errors and stop safely if network drops, allow clean restart

---

## 8) Security & Privacy

**BYOK**

* Each teacher brings their own **Soniox** & **OpenAI** keys
* Keys are stored **only in their browser (localStorage)**
* Keys are visible to the user on their machine via DevTools (expected and acceptable for trusted users)
* **No keys in the database**; **no keys in the repo**

**Data Isolation**

* Supabase **RLS** ensures a user only sees their own `students` and `sessions`
* Export options: `.txt` transcripts and `.md` summaries/homework

**Logging**

* Keep logs minimal; avoid sending transcripts to third‑party logging

---

## 9) Performance & Reliability Tactics

* Use 48 kHz sample rate; disable echoCancellation to avoid AEC killing mixed system audio
* Debounce UI updates; render only when text changes
* On stop/cancel, always stop audio tracks and close AudioContext
* Save to DB at finalize (Stop). *(Optional later: autosave chunks for very long sessions.)*

---

## 10) Deployment

* **Vercel**: serve `index.html` and `student.html` as static files
* **Supabase**: set URL + anon key in a small client config (not secret) and allow your Vercel domain in CORS
* No server to maintain; consider tiny API route later **only if needed**

---

## 11) Roadmap

**Phase 1 — Ship**

* Auth + RLS + DB tables
* Replace localStorage sessions/students with Supabase CRUD
* BYOK modal (two fields); Student Picker modal before recording
* Deploy to Vercel; end‑to‑end test

**Phase 2 — Polish**

* One‑time import of old local sessions to DB
* Better error messages for audio permissions/system audio edge cases
* Small perf tuning (DOM updates, memory)

**Phase 3 — Monetize (optional)**

* Stripe subscription per teacher; basic usage metrics

**Phase 4 — Power features**

* Search/highlight in transcripts
* PDF export of summaries/homework
* Chunking/streaming for long transcripts

---

## 12) Guardrails (do **not** do now)

* No React/Node rewrite
* No server‑stored API keys
* No per‑student HTML files (one reusable `student.html`)
* No offline mode promises

---

## 13) Definition of Done (feature checklist)

* Fits the two‑page model and this North Star
* BYOK respected; no secrets stored/committed
* Works on Chrome/Edge: **login → set keys → pick student → record → save → summary → view student page**
* Clear errors and safe cleanup paths

**If a change conflicts with this document, pause and reconsider.**
