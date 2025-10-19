# Transcriber Studio – High‑Level Overview

Purpose: Help Arabic language teachers record lessons, organise student history, and turn transcripts into high‑quality lesson artefacts (summaries, vocabulary, homework). This file orients new contributors so they can extend or swap parts confidently.

## Product Flow (Pages → Actions)
1. Landing (`/`) – Intro, then redirect authenticated users to the workspace.
2. Auth (`/auth/*`) – Supabase email/password. Unauthenticated traffic is redirected here.
3. Workspace Shell – Global nav and context around all signed‑in routes.
4. Students (`/students`) – Manage roster; set a “current student”.
5. Recordings (`/recordings`) – Start/stop/cancel capture, live STT, save session, trigger AI.
6. Student Workspace (`/students/[id]`) – Record + review for a single learner; open AI Tutor.
7. Prompts (`/prompts`) – Create/edit/delete custom prompts for generation.
8. Settings (`/settings`) – Choose default prompts used by generation.
9. AI Test (`/ai-test`) – Internal agent playground to validate tools, costs, and routing.

Typical flow: Sign in → pick/set student → record → stop → AI generates summary/homework → review/edit → export (MD/PDF) → chat with AI Tutor for insights.

## Tech Stack
- Next.js 15 (App Router) + React 19 + TypeScript
- Styling via CSS modules/tailwind utilities (see `src/app/base.css`, `globals.css`)
- Supabase: auth, Postgres, RLS, RPCs, and persistence
- Soniox: real‑time STT via websocket token from our API
- AI via OpenRouter, Anthropic, Google Gemini, and OpenAI embeddings
- Puppeteer/Puppeteer‑Core + Sparticuz Chromium for PDF export

Environment (server):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (optional for scripts)
- `SONIOX_API_KEY` (and optional `SONIOX_WEBSOCKET_URL`)
- `OPENROUTER_API_KEY` (OpenRouter models)
- `ANTHROPIC_API_KEY` (Claude for orchestrator/generation‑tools)
- `GOOGLE_GENERATIVE_AI_API_KEY` (@ai-sdk/google agents)
- `OPENAI_API_KEY` (text‑embedding‑3‑small)
- Optional: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SITE_NAME` (OpenRouter attribution)

## Data Model (tables you’ll see)
- `students` – per‑user roster. Deleting cascades to sessions.
- `sessions` – one per recording; transcript, durations, `summary_md`, `homework_md`, generation status timestamps, and embeddings/combined content.
- `prompts` – custom prompt templates owned by the user.
- `teacher_preferences` – current student + default prompt selections.
- `ai_chat_sessions` / `ai_chat_messages` – AI Tutor conversation history, by student.
- `tutor_settings` – teacher’s methodology/curriculum to steer AI.

Important RPCs expected by tools (see schema and `sql-tools.ts` / `rag-tools.ts`):
- `get_recent_lessons(student, count)`
- `get_lesson_by_date(student, date)`
- `get_lessons_in_range(student, start, end)`
- `extract_vocab_from_range(student, start, end)`
- `hybrid_search_lessons(student, query_embedding, match_threshold, match_count)`

## Core Surfaces (where to look)
- Landing: `src/app/page.tsx`
- Auth: `src/app/auth/*` (`actions.ts`, `layout.tsx`)
- Shell/Layout: `src/components/layout/AppShell.tsx`, `(dashboard)/layout.tsx`
- Dashboard: `(dashboard)/dashboard/page.tsx` + components
- Recordings: `(dashboard)/recordings/*` (console, session list, hooks)
- Students list: `(dashboard)/students/page.tsx`
- Student workspace: `(dashboard)/students/[studentId]/page.tsx` (+ RecordingInterface, SessionList, AIChatSidebar)
- Prompts: `(dashboard)/prompts/*`
- Settings: `(dashboard)/settings/page.tsx` (defaults picker)
- API: `src/app/api/*` (`soniox/token`, `generate-pdf`, `preferences`, `health`)

## Recording & Resilience
- Audio: `useAudioMixer` builds an in‑browser graph; permissions handled in UI.
- STT: `useSonioxToken` retrieves a temporary key from `/api/soniox/token`, `useSonioxStream` streams to Soniox.
- Offline safety: `useLocalBackup` auto‑saves drafts in `localStorage` and maintains an upload queue; `useNetworkMonitor` + `useUploadQueue` retry when back online.
- Save: `saveSessionAction` persists recording; UI optimistically appends to lists.
- AI kickoff: After saving, `generateSessionArtifactsAction` runs and updates session status.

## Generation Pipeline (summaries & homework)
- Entry: `generateSessionArtifactsAction(sessionId, { summary?, homework? }, context?, selectedPromptId?)`.
- Source of truth: transcript + student metadata pulled from `sessions`.
- Prompt selection: explicit selection wins; else fall back to `teacher_preferences` default prompts.
- Summary: `lib/ai/generate.ts` produces Markdown and auto‑normalizes expected headings (e.g., “High‑Level Summary”, “New Vocabulary”, “Main Grammatical Concepts Discussed”).
- Homework: `lib/ai/generate.ts` (and agents) produce structured Markdown exercises.
- Embeddings: `embeddings.ts` uses `text-embedding-3-small`; stores `summary_embedding`, `homework_embedding`, plus `combined_content` for hybrid search.
- Revalidation: refreshes `/recordings`, `/students`, and the student page for fresh UI state.

## Multi‑Agent Architecture (how "the AI" works)
Files: `src/lib/ai/*`, `src/lib/ai/agents/*`, `src/lib/ai/tools/*`, `docs/multi-agent-migration.md`.

**Orchestrator** (`orchestrator.ts`):
- **Model**: Claude Sonnet 4.5 via `@ai-sdk/anthropic`
- **Role**: Reads user's question + last 10 messages (rolling window) + optional methodology, then routes to specialist agents
- **Output**: Direct greeting/answer for chit‑chat OR routing directive to one/multiple agents
- **Query Transformation** (`extractTemporalQuery`): For homework/summary requests, extracts temporal patterns using regex ("last 5 lessons" → "Get the last 5 lessons", "this month" → "Get lessons from this month") to prevent content-generation refusal by Temporal Agent
- **Agent Chaining**: Homework and Summary agents follow 2-stage pattern:
  1. Transform user query → call Temporal Agent for lessons
  2. Extract lesson IDs from global store
  3. Pass IDs to Homework/Summary Agent for content generation
  4. Combine token usage from both stages

**Specialist Agents** (stateless, thinking off except Homework):

**Temporal Agent** (`temporal-agent.ts`, Gemini Flash‑Lite):
- **Tools**: `getRecentLessons`, `getLessonByDate`, `getLessonsInDateRange` (SQL RPCs)
- **Use**: Date/count queries ("last 10 lessons", "lesson on Sept 17")
- **ID Tracking**: Each tool stores lesson IDs in `globalThis.__temporalAgentLessonIds` for extraction by orchestrator
- **Behavior**: Refuses content-generation queries; orchestrator transforms these before routing

**Vocabulary Agent** (`vocabulary-agent.ts`, Gemini Flash‑Lite):
- **Tools**: `getAllVocabSince(studentId, months)`, `searchExactWord(studentId, word)`
- **Use**: "When did we learn X?" or bulk vocab ("vocab from last 3 months")
- **Fixed Bug**: `getAllVocabSince` now passes `months_back` parameter (not `start_date`/`end_date`) and extracts `vocab_section` column (not `vocabulary`)
- **Arabic Normalization**: `searchExactWord` handles hamza variants, ta marbuta, and optional Al‑ prefix

**RAG Agent** (`rag-agent.ts`, Gemini Flash‑Lite):
- **Tools**: `searchLessonsByTopic`, `searchGrammarTopics` (hybrid vector + keyword search)
- **Use**: Semantic queries ("lessons about food", "grammar we covered")

**Summary Agent** (`summary-agent.ts`, Gemini Flash‑Lite):
- **Tool**: `generateSummaryOfSummaries` (condenses multiple lesson summaries)
- **Receives**: Lesson IDs from orchestrator (extracted after Temporal Agent call)
- **Process**: Fetches lesson summaries from DB → generates meta-summary

**Homework Agent** (`homework-agent.ts`, Gemini Flash + thinking):
- **Tool**: `generateHomeworkFromLessons` (creates varied, level-appropriate exercises)
- **Receives**: Lesson IDs from orchestrator (extracted after Temporal Agent call)
- **Process**: Fetches lesson summaries from DB → generates structured exercises

**Agent Tools** (`src/lib/ai/tools`):
- **SQL tools** (`sql-tools.ts`): Temporal/vocab fetch via RPCs; Arabic normalization for search
- **RAG tools** (`rag-tools.ts`): Hybrid similarity using OpenAI embeddings + `hybrid_search_lessons` RPC
- **Generation tools** (`generation-tools.ts`): Content creation using Anthropic for summaries/homework

**Lesson ID Extraction** (`extractLessonIdsFromAgentResult`):
1. Check `globalThis.__temporalAgentLessonIds` (set by Temporal Agent tools)
2. Fallback: Parse AI SDK's `result.steps` structure (Gemini doesn't preserve tool results reliably)
3. Clear global store after extraction to prevent stale data

**Where Used**:
- **AI Tutor Chat**: `app/actions/agent-chat.ts` → `runOrchestrator()` for natural Q&A in Student Workspace sidebar
- **AI Test Playground**: `/ai-test` calls legacy bundled agent for debugging/comparison

## AI Tutor (Agent‑Routed Chat)
- Production path: `app/actions/agent-chat.ts` → `runOrchestrator()` with a rolling 10‑message context window and optional teacher methodology. There is no transcript/lesson stuffing here.
- Retrieval is on‑demand: the Orchestrator delegates to Temporal/Vocabulary/RAG agents to fetch the right lessons or topics when needed.
- Sidebar UI: `AIChatSidebar.tsx` manages sessions, messages, and a curriculum editor that updates `tutor_settings` (methodology only).
- Legacy note: `lib/ai/ai-tutor-context.ts` (which assembled a large prompt with the last 30 lessons) is no longer used in production. Keep it as reference only and do not re‑enable transcript stuffing.

## Arabic Handling & Search
- Vocabulary agent normalizes Arabic input to improve matching (hamza variants, ta marbuta, optional Al‑ prefix) before building ILIKE patterns over `summary_md`.
- RAG tools support Arabic/English queries; embeddings are built with `text-embedding-3-small` so hybrid search can find semantic matches independent of language.
- Summaries generated by the system can contain Arabic headings/content; Markdown renderer (`MarkdownContent`) supports GFM and preserves whitespace for readability.

## Editing, Status, and Embeddings
- Sessions can be edited via `updateSessionContentAction`; after edits, embeddings are regenerated and `combined_content` is updated to keep search in sync.
- Generation status lifecycle: `empty` (no transcript) → `generating` (in‑flight) → `complete` (both ready) or `error` (failed). UI displays chips and toasts.
- Lists use optimistic updates so teachers see results immediately; server actions revalidate to reconcile.

## Developer Ops & Migrations
- Local scripts:
  - `npm run generate-embeddings` runs `scripts/generate-embeddings.ts` to backfill vectors (requires service role key).
  - `npm run test-tools` runs `scripts/test-tools.ts` to sanity check DB functions and embeddings availability.
- Migrations live under `supabase/migrations`. A helper `run-migration.js` can apply a specific SQL file remotely via an `exec_sql` RPC. Prefer standard Supabase workflows where possible.
- Key RPCs expected by the codebase must exist (see Data Model list) for agents to function.

## Operational Notes
- PDF export uses `puppeteer-core` + `@sparticuz/chromium` on serverless; dev uses `puppeteer`. The route auto‑picks based on `VERCEL`/`NODE_ENV`.
- Pages that read live data (e.g., recordings) opt into dynamic rendering to avoid caching issues.
- Network resilience: Offline recording safeguards avoid data loss; queued uploads retry when back online with user feedback banners.

## Reviewing & Exporting Content
- Session lists show transcript, summary/homework status, and actions to copy, edit, regenerate, or export.
- PDF export: `POST /api/generate-pdf` converts lesson Markdown → HTML (via `marked`) → PDF (via Puppeteer). Uses `puppeteer-core` + `@sparticuz/chromium` on serverless; plain `puppeteer` in dev.

## Prompts & Preferences
- Many prompts per user: stored in `prompts` with `name` and `prompt_text`. CRUD lives in `src/app/(dashboard)/prompts/*` with server actions in `src/app/actions/prompts.ts` (`listPromptsAction`, `createPromptAction`, `updatePromptAction`, `deletePromptAction`). Duplicate names are prevented per user.
- Defaults by type: `teacher_preferences` stores separate defaults for summary vs homework (`default_summary_prompt_id`, `default_homework_prompt_id`) and the `current_student_id`.
- Regeneration picker: When regenerating from session lists, the `ContextModal` (`(dashboard)/recordings/components/ContextModal.tsx`) loads your library and lets you choose:
  - `Default System Prompt` (use built‑in prompt), or any custom prompt by name
  - Optional free‑text “Additional Context” for this one run
- Server behavior: `generateSessionArtifactsAction` receives `(context, selectedPromptId)` and applies:
  - If `selectedPromptId` is provided, it fetches that prompt text and uses it as the system instruction override for both summary and homework in that run.
  - If not provided, it loads your defaults from `teacher_preferences` per type (summary/homework). If a default exists, it overrides that type only; otherwise built‑in system prompts are used.
  - The free‑text context (if any) is appended to the user message as “ADDITIONAL CONTEXT”.
- How prompts are used at generation time: `lib/ai/generate.ts` builds a system instruction header with the student name and lesson date, then the chosen system prompt (built‑in or override). It then sends the transcript plus optional context to the configured model (`AI_MODELS.summary` / `AI_MODELS.homework`).
- Headings contract: Summaries are auto‑normalized to expected section titles (e.g., “High‑Level Summary”, “New Vocabulary”, “Main Grammatical Concepts Discussed”) so downstream features can rely on consistent headings.
- Settings page: `src/app/(dashboard)/settings/page.tsx` lets you set the default summary and homework prompts from your library; preferences are read via `/api/preferences` and saved with `saveDefaultPromptsAction`.

## Security & Data Access
- Supabase Auth gates all server actions and API routes; dashboard layout redirects unauthenticated users.
- Data loaders and actions filter by `owner_user_id` and handle “maybeSingle” semantics defensively.
- Server actions revalidate paths to keep SSR/UIs consistent after writes.

## Extending the System
- Add a tool: implement in `src/lib/ai/tools/*`, export from `tools/index.ts`, wire into the relevant agent with a Zod schema.
- Add an agent: create `agents/new-agent.ts` with a narrow system prompt and 1–3 tools; update the Orchestrator routing prompt.
- Swap STT provider: update `issueSonioxToken`, `useSonioxStream`, and any audio graph specifics.
- Move vectors: if embeddings outgrow columns, point RAG tools at a dedicated vector store; keep `prepareCombinedContent` contract.
- UI: add/extend list panels and modals; keep `SessionListProvider` for optimistic updates.

This document is the “map” of the platform: purpose, pages, data, AI agents, and integration points. With it, a technical collaborator should be able to add features, swap models, or re‑route the AI safely without reading the whole codebase.
