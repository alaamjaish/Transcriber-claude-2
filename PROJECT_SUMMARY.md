# Conversation Summary & Decisions

This captures everything we discussed, the alternatives we weighed, and the final decisions for your Arabic teaching tool. It’s the single source of truth for **what** we’re doing and **why**.

---

## 1) Goals (what we’re building)

* **A tiny, reliable, fast tool** to record lessons, **transcribe in real time (Soniox)**, and **generate summaries/homework (OpenAI)**.
* **Two pages only:**

  1. **Main page** – record/transcribe, show all sessions.
  2. **Student page** – show sessions for one student.
* **Teachers log in**, then **use their own API keys (BYOK)**.
* **Store data in a real database** (not in the browser): students, sessions, summaries/homework.
* **Keep the dev surface simple** (no React/Node app right now; plain HTML + JS).

---

## 2) Problems we hit (and fixed by design)

* **WebSocket error from Soniox** when opening from `file://` (origin is `null`).

  * Root cause: browsers block certain features when served from file system.
  * **Fix:** host pages over **HTTPS** (e.g., Vercel). Then Soniox connects cleanly.
* **localStorage limits & fragility**: data can vanish when changing browsers/clearing storage; size-limited; not multi-device.

  * **Fix:** move sessions/students to **Supabase** (managed Postgres) with **Auth + Row Level Security**.
* **API key handling** confusion/insecurity.

  * Final stance: **BYOK for both Soniox and OpenAI** stored **in the user’s browser**; visible to the user only; you don’t pay for others.

---

## 3) Options considered

* **Server proxy for OpenAI** (hide keys on server): secure but adds server complexity and moving parts.
* **Store keys in Supabase** (encrypted): adds flows and key management; keys still end up in the browser for Soniox.
* **React/Node app**: heavier stack for a two-page app; not needed.

We chose **simplicity first**: keep everything **browser → APIs** directly, and **DB for data**.

---

## 4) Final architecture

**Hosting:** Vercel (static hosting, HTTPS)

**Auth & DB:** Supabase

* Auth: Email + (optional) Google.
* DB tables: `students`, `sessions`.
* Policies: **Row Level Security** (each teacher can only see their own rows).

**Transcription:** Browser → **Soniox** Web SDK (WebSocket), with **user’s Soniox key** from localStorage.

**Summaries/Homework:** Browser → **OpenAI** Chat Completions, with **user’s OpenAI key** from localStorage.

**Data storage:**

* `students` (id, owner\_user\_id, name, created\_at)
* `sessions` (id, owner\_user\_id, student\_id, timestamp, duration\_ms, transcript, summary\_md, homework\_md)

**Pages (unchanged structure):**

* `index.html` – main page.
* `student.html?id=<student_id>` – reusable per-student page.

---

## 5) Key handling (BYOK = Bring Your Own Key)

* **Soniox key**: asked once after login → saved in **localStorage** on that device.
* **OpenAI key**: asked once after login → saved in **localStorage** on that device.
* Keys are **never stored in your DB** and **never committed to the repo**.
* Tradeoff: keys are visible to the user via DevTools on their own computer (expected with BYOK). This is acceptable for your 30–40 trusted teachers and keeps you from paying for their usage.

---

## 6) How the two pages behave now

* **index.html**

  * On load: require Supabase auth.
  * If Soniox/OpenAI keys missing → show simple key setup modal (stores to localStorage).
  * Start transcription → Soniox WS using BYOK; on finish → save session to Supabase.
  * History: list sessions from DB (not localStorage). Buttons: View/Copy/Export/Delete, Summary/Homework.

* **student.html?id=...**

  * Same page works for all students (reads ID from URL).
  * Loads that student + their sessions from DB.
  * Same actions (view/copy/export/delete/move, summary/homework).

---

## 7) Tradeoffs & risks (accepted)

* **Keys in browser (BYOK)**: visible to each user on their own machine (acceptable; they’re your colleagues; it’s their cost center).
* **No offline mode**: app requires network.
* **System audio capture varies** by OS/browser (Chrome/Edge best; macOS often tab-only).
* **Token limits**: long transcripts may exceed OpenAI limits → future chunking if needed.
* **Potential CORS hiccups** with direct OpenAI calls in some environments → future tiny proxy if needed (only if it happens).

---

## 8) Immediate next steps (we agreed)

1. **Create Supabase project**, run the SQL for `students` + `sessions` and RLS policies.
2. **Deploy both HTML files to Vercel** for HTTPS hosting.
3. **Swap localStorage → Supabase** for student/session reads/writes in both pages.
4. **Keep BYOK UIs** for Soniox + OpenAI.
5. **Test end-to-end**: login → set keys → record → save → summary → per-student view.
6. (Optional) **Import old local sessions** to the DB via a one-time script.

---

## 9) Future (only if needed later)

* Minimal server proxy for OpenAI to avoid CORS or add rate-limiting.
* Usage metering + simple billing (Stripe) if you sell subscriptions.
* Chunking/streaming for very long transcripts.
* Search across transcripts; export PDF; team sharing.

**Bottom line:**
We’re shipping a **two-page, BYOK, browser-first** app with **Supabase for persistence** and **Vercel hosting**. It’s the simplest stable path that fixes your WebSocket issue, removes localStorage fragility, and keeps your costs predictable.
