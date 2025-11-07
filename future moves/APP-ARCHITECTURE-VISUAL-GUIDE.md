# Transcriber Studio - Visual Architecture Guide

**For Future Agents**: This document explains how all the pieces fit together visually.

---

## 🏗️ System Architecture Layers

```
┌──────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACES                               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │   Landing Page  │  │    Dashboard    │  │   Electron App  │     │
│  │   (Marketing)   │  │  (Authenticated)│  │   (Wrapper)     │     │
│  │                 │  │                 │  │                 │     │
│  │ • Hero          │  │ • Recordings    │  │ • Loads Vercel  │     │
│  │ • Demo Mode     │  │ • Students      │  │ • Native Window │     │
│  │ • Sign Up/In    │  │ • Dashboard     │  │ • Mic Access    │     │
│  │                 │  │ • Settings      │  │                 │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
│                                                                       │
└───────────────────────────┬───────────────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────────────┐
│                      NEXT.JS 15 APP LAYER                             │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Routes     │  │    Server    │  │   Client     │              │
│  │              │  │   Actions    │  │  Components  │              │
│  │ • app/       │  │              │  │              │              │
│  │   • auth/    │  │ • auth.ts    │  │ • Recording  │              │
│  │   • (dash)   │  │ • sessions   │  │   Console    │              │
│  │   • api/     │  │ • students   │  │ • Student    │              │
│  │   • page.tsx │  │ • ai-tutor   │  │   Picker     │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                       │
└───────────────────────────┬───────────────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────────────┐
│                     CORE BUSINESS LOGIC                               │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                   Recording Pipeline                          │    │
│  │                                                               │    │
│  │  useAudioMixer ──▶ useSonioxStream ──▶ RecordingConsole     │    │
│  │       │                   │                      │            │    │
│  │   (capture)          (WebRTC)              (UI update)       │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                   AI Agent System                             │    │
│  │                                                               │    │
│  │            ┌─────────────────────────┐                       │    │
│  │            │    Orchestrator         │                       │    │
│  │            │  (Routes queries)       │                       │    │
│  │            └───┬─────────────────┬───┘                       │    │
│  │                │                 │                           │    │
│  │       ┌────────┴────┐   ┌────────┴────────┐                │    │
│  │       │             │   │                 │                │    │
│  │   ┌───▼───┐  ┌─────▼─┐ ┌▼────┐  ┌──────▼─┐                │    │
│  │   │Summary│  │Homework│ │ RAG │  │Temporal│                │    │
│  │   │ Agent │  │ Agent  │ │Agent│  │ Agent  │                │    │
│  │   └───┬───┘  └────┬───┘ └─┬───┘  └───┬────┘                │    │
│  │       │           │       │          │                      │    │
│  │       └───────────┴───────┴──────────┘                      │    │
│  │                    │                                        │    │
│  │               Uses Tools:                                  │    │
│  │         • get_recent_lessons()                             │    │
│  │         • hybrid_search_lessons()                          │    │
│  │         • getAllVocabSince()                               │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
└───────────────────────────┬───────────────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────────────┐
│                      EXTERNAL SERVICES                                │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Supabase   │  │    Soniox    │  │    Google    │              │
│  │              │  │              │  │    Gemini    │              │
│  │ • Auth       │  │ • WebRTC     │  │              │              │
│  │ • PostgreSQL │  │ • Real-time  │  │ • LLM API    │              │
│  │ • RLS        │  │   streaming  │  │ • Flash-Lite │              │
│  │ • Storage    │  │ • Arabic STT │  │ • Pro 1.5    │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow: Recording a Lesson

```
User clicks "Start Recording"
         │
         ▼
  ┌──────────────────┐
  │ Student Picker   │ ◀── Already selected?
  │ Dialog Opens     │     Yes: Skip this
  └────────┬─────────┘     No: Show modal
           │
           ▼
  ┌──────────────────┐
  │ Select/Create    │
  │    Student       │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ Request Mic      │
  │  Permission      │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  Audio Capture   │
  │  useAudioMixer   │ ◀── Combines mic + system audio
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  Get Soniox      │
  │     Token        │ ◀── /api/soniox/token
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │   Start WebRTC   │
  │    Streaming     │ ◀── useSonioxStream hook
  └────────┬─────────┘
           │
           ▼ (continuous)
  ┌──────────────────┐
  │   Real-time      │
  │  Transcription   │ ◀── Updates every ~1 second
  │   Display        │
  └────────┬─────────┘
           │
           ▼ (user stops)
  ┌──────────────────┐
  │  Stop Recording  │
  │   & Get Final    │
  │   Transcript     │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ Save to Supabase │
  │ saveSessionAction│ ◀── Server Action
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  AI Generation   │
  │  (Background)    │
  │                  │
  │ • Summary Agent  │
  │ • Homework Agent │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  Update Session  │
  │  with AI Results │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  Generate        │
  │  Embeddings      │ ◀── Vector search prep
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  UI Refreshes    │
  │ router.refresh() │
  └──────────────────┘
```

---

## 🤖 AI Orchestrator Decision Tree

```
User sends chat message
         │
         ▼
  ┌─────────────────┐
  │  Orchestrator   │
  │  Receives Query │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │  Fetch Lesson   │
  │     Index       │ ◀── Last 100 lessons (id + date only)
  └────────┬────────┘
           │
           ▼
  ┌─────────────────────────────────────┐
  │  Analyze Query Type                 │
  │                                     │
  │  Contains date/time reference?      │
  │  ├─ Yes ──▶ TEMPORAL AGENT         │
  │  └─ No                              │
  │                                     │
  │  Contains "noun", "verb", "vocab"?  │
  │  ├─ Yes ──▶ VOCABULARY AGENT       │
  │  └─ No                              │
  │                                     │
  │  Asks about specific topic/word?    │
  │  ├─ Yes ──▶ RAG AGENT              │
  │  └─ No                              │
  │                                     │
  │  Asks for summary?                  │
  │  ├─ Yes ──▶ SUMMARY AGENT          │
  │  └─ No                              │
  │                                     │
  │  Asks for homework?                 │
  │  └─ Yes ──▶ HOMEWORK AGENT         │
  └─────────────────────────────────────┘
           │
           ▼
  ┌─────────────────┐
  │  Agent Executes │
  │   with Tools    │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Stream Response │
  │   to Client     │
  └─────────────────┘
```

---

## 🗄️ Database Schema (Simplified)

```
┌─────────────────────────────────────────┐
│              auth.users                  │
│  (Managed by Supabase Auth)             │
│                                         │
│  • id (UUID)                            │
│  • email                                │
│  • created_at                           │
└────────────┬────────────────────────────┘
             │
             │ owner_user_id (FK)
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌───────────┐    ┌───────────────┐
│ students  │    │teacher_prefs  │
│           │    │               │
│ • id      │    │• user_id (PK) │
│ • name    │    │• current_     │
│ • owner   │    │  student_id   │
└─────┬─────┘    └───────────────┘
      │
      │ student_id (FK)
      │
      ▼
┌─────────────────────────────────────────┐
│             sessions                     │
│  (Recording data)                       │
│                                         │
│  • id (UUID)                            │
│  • student_id (FK)                      │
│  • owner_user_id (FK)                   │
│  • transcript (TEXT)                    │
│  • summary_md (TEXT)                    │
│  • homework_md (TEXT)                   │
│  • summary_embedding (VECTOR)           │ ◀── For RAG search
│  • homework_embedding (VECTOR)          │
│  • combined_content (TEXT)              │
│  • created_at                           │
└─────────────────────────────────────────┘
      │
      │ session_id (FK)
      │
      ▼
┌─────────────────────────────────────────┐
│        tutor_conversations               │
│  (Chat history)                         │
│                                         │
│  • id                                   │
│  • session_id (FK)                      │
│  • student_id (FK)                      │
│  • messages (JSONB)                     │
│  • created_at                           │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│              prompts                     │
│  (Customizable AI prompts)              │
│                                         │
│  • id                                   │
│  • user_id (FK)                         │
│  • prompt_type                          │
│  • content                              │
│  • is_default (BOOL)                    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│           demo_trials                    │
│  (Rate limiting for demo)               │
│                                         │
│  • id                                   │
│  • ip_address                           │
│  • created_at                           │
└─────────────────────────────────────────┘
```

---

## 📁 File Structure Map (Active Code Only)

```
webapp/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing page
│   │   ├── layout.tsx                  # Root layout
│   │   │
│   │   ├── auth/
│   │   │   ├── sign-in/page.tsx
│   │   │   ├── sign-up/page.tsx
│   │   │   └── callback/route.ts
│   │   │
│   │   ├── (dashboard)/                # Auth required
│   │   │   ├── layout.tsx              # Dashboard shell
│   │   │   ├── dashboard/page.tsx      # Main dashboard
│   │   │   ├── recordings/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── components/
│   │   │   │   │   ├── RecordingWorkspaceShell.tsx  ⭐ Main recording UI
│   │   │   │   │   ├── RecordingConsole.tsx          ⭐ Audio controls
│   │   │   │   │   ├── SessionList.tsx               ⭐ Session history
│   │   │   │   │   └── StudentPickerDialog.tsx
│   │   │   │   └── hooks/
│   │   │   │       ├── useAudioMixer.ts              ⭐ Audio capture
│   │   │   │       └── useSonioxStream.ts            ⭐ Transcription
│   │   │   ├── students/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [studentId]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── components/
│   │   │   ├── prompts/page.tsx
│   │   │   └── settings/page.tsx
│   │   │
│   │   ├── actions/                    # Server Actions
│   │   │   ├── auth.ts                 ⭐ Sign in/up
│   │   │   ├── sessions.ts             ⭐ Save sessions
│   │   │   ├── students.ts             ⭐ Student CRUD
│   │   │   └── agent-chat.ts           ⭐ AI tutor
│   │   │
│   │   └── api/
│   │       ├── auth/callback/
│   │       ├── soniox/token/           ⭐ Soniox auth
│   │       ├── generate-pdf/           ⭐ PDF export
│   │       ├── preferences/
│   │       └── demo/                   # Demo mode endpoints
│   │           ├── transcribe/
│   │           ├── generate/
│   │           ├── check-limit/
│   │           └── increment-trial/
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx            ⭐ Dashboard layout
│   │   │   └── SelectedStudentProvider.tsx  ⭐ Global student context
│   │   ├── ui/
│   │   │   ├── Card.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   └── MarkdownContent.tsx
│   │   └── demo/
│   │       ├── DemoSection.tsx
│   │       ├── DemoRecorder.tsx
│   │       └── DemoResults.tsx
│   │
│   └── lib/
│       ├── supabase/
│       │   ├── server.ts               ⭐ SSR Supabase client
│       │   └── client.ts               ⭐ Browser client
│       │
│       ├── ai/
│       │   ├── orchestrator.ts         ⭐⭐⭐ Main AI router
│       │   ├── prompts.ts              ⭐ System prompts
│       │   ├── config.ts               ⭐ Model selection
│       │   │
│       │   ├── agents/                 # Specialized agents
│       │   │   ├── summary-agent.ts
│       │   │   ├── homework-agent.ts
│       │   │   ├── vocabulary-agent.ts
│       │   │   ├── temporal-agent.ts
│       │   │   └── rag-agent.ts
│       │   │
│       │   └── tools/                  # Function calling tools
│       │       ├── recent-lessons.ts
│       │       ├── search-lessons.ts
│       │       └── vocab-tools.ts
│       │
│       ├── data-loaders.ts             ⭐ Server data fetching
│       ├── database.types.ts           # Auto-generated types
│       └── types.ts                    # App types
│
├── scripts/
│   ├── generate-embeddings.ts          # npm run generate-embeddings
│   └── test-tools.ts                   # npm run test-tools
│
├── .env.local                          # Environment variables
├── package.json                        # Dependencies
├── vercel.json                         # Vercel config
└── tsconfig.json                       # TypeScript config
```

**⭐ = Critical file** (most important for understanding the app)

---

## 🔐 Authentication & Authorization Flow

```
┌─────────────────────────────────────────────────────────┐
│                    User Journey                          │
└─────────────────────────────────────────────────────────┘

Unauthenticated User:
  │
  ├─▶ Visits "/" (landing page)
  │   ├─ Can try demo mode (no account needed)
  │   └─ Can sign up/sign in
  │
  ├─▶ Visits "/dashboard" (or any auth route)
  │   └─ Automatically redirected to /auth/sign-in
  │
  └─▶ Signs up/in via Supabase Auth
      ├─ Email + Password
      ├─ Session cookie set (SSR-compatible)
      └─ Redirected to /dashboard

Authenticated User:
  │
  ├─▶ All requests include session cookie
  │
  ├─▶ Server Components/Actions:
  │   └─ createSupabaseServerClient() reads cookie
  │       └─ Authenticates user
  │           └─ Gets user_id
  │
  ├─▶ Database queries:
  │   └─ RLS (Row Level Security) filters by owner_user_id
  │       └─ User ONLY sees their own data
  │
  └─▶ Can access all dashboard routes
      ├─ /dashboard
      ├─ /recordings
      ├─ /students
      ├─ /prompts
      └─ /settings

Row Level Security (RLS) Policies:
  • students:   WHERE owner_user_id = auth.uid()
  • sessions:   WHERE owner_user_id = auth.uid()
  • prompts:    WHERE user_id = auth.uid()
  • tutor_conversations: WHERE owner_user_id = auth.uid()
```

---

## 🎨 Component Hierarchy (Dashboard)

```
<html>
  <body>
    <RootLayout>                           # app/layout.tsx
      │
      └─▶ <DashboardLayout>                # app/(dashboard)/layout.tsx
            │
            ├─▶ <SelectedStudentProvider>  # Global student context
            │     │
            │     └─▶ <AppShell>           # Layout shell
            │           │
            │           ├─▶ <Header>
            │           │     ├─ User menu
            │           │     └─ Current student pill
            │           │
            │           ├─▶ <Sidebar>
            │           │     ├─ Dashboard
            │           │     ├─ Recordings
            │           │     ├─ Students
            │           │     ├─ Prompts
            │           │     └─ Settings
            │           │
            │           └─▶ <main>
            │                 │
            │                 └─▶ {children}  ◀── Page content
            │                       │
            │                       ├─ /dashboard → <DashboardClient>
            │                       ├─ /recordings → <RecordingWorkspaceShell>
            │                       ├─ /students → <StudentsPage>
            │                       └─ /students/[id] → <StudentPageClient>
            │
            └─▶ <Toaster>                  # Toast notifications
```

---

## 🎬 Recording Component Breakdown

```
<RecordingWorkspaceShell>                  # Main container
  │
  ├─▶ State Management:
  │   ├─ isRecording
  │   ├─ currentTranscript
  │   ├─ error
  │   └─ savingStatus
  │
  ├─▶ Hooks:
  │   ├─ useSelectedStudent()           # Get current student
  │   ├─ useSonioxToken()               # Get Soniox auth token
  │   └─ useRouter()                    # For refresh after save
  │
  ├─▶ Child Components:
  │   │
  │   ├─▶ <RecordingConsole>            # Main UI
  │   │     │
  │   │     ├─▶ <RecordingControls>    # Start/Stop/Pause buttons
  │   │     │
  │   │     ├─▶ <StatusIndicator>      # Recording status display
  │   │     │
  │   │     ├─▶ <TranscriptPane>       # Live transcript
  │   │     │
  │   │     └─▶ Hooks:
  │   │           ├─ useAudioMixer()   ⭐ Captures audio
  │   │           │   ├─ Gets mic stream
  │   │           │   ├─ Gets system audio (if available)
  │   │           │   └─ Mixes both streams
  │   │           │
  │   │           └─ useSonioxStream() ⭐ Transcribes
  │   │               ├─ Connects to Soniox WebSocket
  │   │               ├─ Sends audio chunks
  │   │               ├─ Receives transcript updates
  │   │               └─ Handles errors/completion
  │   │
  │   └─▶ <StudentPickerDialog>        # Select student modal
  │         └─ Opens if no student selected
  │
  └─▶ Callbacks:
      ├─ onStart() → Check student, start recording
      ├─ onStop() → Save to Supabase, trigger AI, refresh UI
      └─ onError() → Display error toast
```

---

## 🚀 Deployment Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Production Stack                      │
└────────────────────────────────────────────────────────┘

Vercel (Next.js hosting):
  ├─ Auto-deploy from main branch
  ├─ Serverless functions for API routes
  ├─ Edge functions for middleware
  └─ Environment variables from Vercel dashboard

Supabase (Backend):
  ├─ PostgreSQL database (with pgvector extension)
  ├─ Authentication service
  ├─ Row Level Security (RLS)
  ├─ Realtime subscriptions (not used yet)
  └─ Storage buckets (not used yet)

External APIs:
  ├─ Soniox: Real-time speech-to-text
  ├─ Google Gemini: LLM for AI agents
  └─ OpenAI: Text embeddings (for vector search)

Optional:
  └─ Electron wrapper: Desktop app (loads Vercel URL)
```

---

## 💾 Data Persistence Flow

```
Recording Session Data:
  ┌─────────────────┐
  │  User Records   │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Soniox Returns  │
  │   Transcript    │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ saveSessionAction│  ◀── Server Action
  │ (Server Side)   │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Insert into     │
  │ sessions table  │
  │                 │
  │ • transcript    │
  │ • student_id    │
  │ • owner_user_id │
  │ • created_at    │
  │ • duration_ms   │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Trigger AI      │
  │  Generation     │
  │ (Background)    │
  └────────┬────────┘
           │
           ├─▶ Summary Agent
           │   └─▶ Update: summary_md
           │
           ├─▶ Homework Agent
           │   └─▶ Update: homework_md
           │
           └─▶ Embedding Generation
               └─▶ Update: summary_embedding, homework_embedding

AI Tutor Chat Data:
  ┌─────────────────┐
  │ User Sends Msg  │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ runOrchestrator │
  │ (Server Action) │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Agent Responds  │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Save to         │
  │ tutor_convos    │
  │                 │
  │ • messages[]    │
  │ • session_id    │
  │ • student_id    │
  └─────────────────┘
```

---

## 🧠 Memory Guide for Future Agents

### When Working on Recording Features:
- **Entry point**: `webapp/src/app/(dashboard)/recordings/page.tsx`
- **Main component**: `RecordingWorkspaceShell.tsx`
- **Audio capture**: `hooks/useAudioMixer.ts`
- **Transcription**: `hooks/useSonioxStream.ts`
- **Save logic**: `app/actions/sessions.ts`

### When Working on AI Features:
- **Entry point**: `webapp/src/app/actions/agent-chat.ts`
- **Main router**: `lib/ai/orchestrator.ts`
- **Agents**: `lib/ai/agents/*.ts`
- **Tools**: `lib/ai/tools/*.ts`
- **Prompts**: `lib/ai/prompts.ts`
- **Config**: `lib/ai/config.ts` ⭐ Change models here

### When Working on Student Management:
- **List page**: `app/(dashboard)/students/page.tsx`
- **Detail page**: `app/(dashboard)/students/[studentId]/page.tsx`
- **Actions**: `app/actions/students.ts`
- **Context**: `components/layout/SelectedStudentProvider.tsx`

### When Working on Database:
- **Migrations**: `supabase/migrations/*.sql`
- **Types**: Auto-generated in `lib/database.types.ts`
- **Client**: `lib/supabase/server.ts` or `lib/supabase/client.ts`
- **Data loaders**: `lib/data-loaders.ts`

### When Working on Auth:
- **Sign in/up**: `app/auth/sign-in/page.tsx`, `app/auth/sign-up/page.tsx`
- **Actions**: `app/actions/auth.ts`
- **Callback**: `app/api/auth/callback/route.ts`
- **Session check**: In dashboard layout.tsx

---

**End of Visual Guide**

For detailed cleanup instructions, see `QUICK-REFERENCE-CLEANUP-CHECKLIST.md`
For full analysis report, see `2025-11-07-DEEP-CODEBASE-CLEANUP-AUDIT.md`
