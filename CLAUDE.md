# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Transcriber Studio** - An AI-powered audio transcription and lesson management platform for educators. The app records lessons, transcribes them in real-time using Soniox, and generates AI-powered summaries, homework, and an interactive tutor chatbot.

## Repository Structure

This is a monorepo with three main components:

- **`webapp/`** - Next.js 15 web application (main development focus)
- **`electron-wrapper/`** - Electron desktop wrapper (loads webapp from Vercel)
- **`supabase/`** - Database migrations and schema

## Essential Commands

### Web Application (webapp/)

All development happens in the `webapp/` directory:

```bash
cd webapp
npm run dev              # Start Next.js dev server at localhost:3000
npm run build            # Production build
npm start                # Run production build
npm run lint             # Run ESLint
npm run generate-embeddings  # Generate vector embeddings for AI context
npm run test-tools       # Test AI tools integration
```

### Database Management

```bash
# From repository root
npx supabase db push     # Push migrations to Supabase
node run-migration.js    # Run custom migration script
```

### Desktop Application (electron-wrapper/)

```bash
cd electron-wrapper
npm start                # Launch Electron app (loads Vercel URL)
npm run build            # Build desktop app
npm run build:mac        # Build for macOS
npm run build:win        # Build for Windows
```

## Architecture

### Next.js Application Structure

```
webapp/src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── auth/                       # Auth forms (sign-in, sign-up)
│   ├── (dashboard)/                # Authenticated routes (layout-based)
│   │   ├── dashboard/              # Main dashboard
│   │   ├── recordings/             # Recording workspace & session history
│   │   ├── students/               # Student management & individual workspaces
│   │   ├── prompts/                # AI prompt customization
│   │   └── settings/               # User settings
│   ├── actions/                    # Server Actions for mutations
│   └── api/                        # API routes (auth, demo, soniox, PDF generation)
├── components/
│   ├── layout/                     # Shell components (header, sidebar, nav)
│   └── ...                         # Reusable UI components
└── lib/
    ├── ai/                         # AI orchestration, prompts, tools
    │   ├── orchestrator.ts         # Multi-agent AI workflow
    │   ├── prompts.ts              # System prompts for AI
    │   ├── config.ts               # Model selection (OpenRouter)
    │   ├── agents/                 # Individual AI agents
    │   └── tools/                  # Function calling tools
    ├── supabase/
    │   ├── server.ts               # SSR Supabase client
    │   └── client.ts               # Browser Supabase client
    ├── data-loaders.ts             # Server-side data loaders with fallbacks
    ├── database.types.ts           # Auto-generated Supabase types
    └── types.ts                    # App-specific TypeScript types
```

### Key Architectural Patterns

#### 1. Authentication Flow
- **Supabase Auth** for email/password authentication
- Server Actions in `app/actions/auth.ts` handle sign-in/sign-up
- `(dashboard)` route group requires active session (redirects to `/auth/sign-in`)
- Session managed via Supabase cookies (SSR-compatible)

#### 2. Data Loading Strategy
- **Server Components** use `data-loaders.ts` for fetching (sessions, students, prompts)
- Loaders gracefully fall back to mock data when Supabase is unconfigured
- `createSupabaseServerClient()` from `lib/supabase/server.ts` for authenticated requests
- Client-side mutations use Server Actions with `router.refresh()` for revalidation

#### 3. Real-Time Recording Pipeline
- **Soniox** WebRTC-based streaming transcription
- `useSonioxStream` hook (`components/recording/useSonioxStream.ts`) manages WebSocket lifecycle
- `useAudioMixer` hook combines microphone + system audio streams
- Server Action `saveSessionAction` persists transcript to Supabase after stop
- `SelectedStudentProvider` context tracks current student across the app

#### 4. AI Workflow (Multi-Agent System)
- **OpenRouter** unified API for all LLM providers (Anthropic, OpenAI, Google)
- Model configuration in `lib/ai/config.ts` (change models here)
- Three AI agents:
  - **Summary Agent**: Generates lesson summaries
  - **Homework Agent**: Creates homework questions
  - **Tutor Agent**: Interactive chat with lesson context
- `orchestrator.ts` coordinates multi-agent workflows
- Function calling tools in `lib/ai/tools/` (search transcripts, fetch sessions)
- Embeddings stored in Supabase for semantic search

#### 5. Database Schema (Supabase)
Key tables:
- `students` - Student profiles (owned by teacher)
- `sessions` - Recording sessions (transcript, summary, homework)
- `prompts` - Customizable AI prompts per user
- `tutor_conversations` - AI tutor chat history
- `demo_trials` - Rate limiting for demo mode

#### 6. Demo Mode
- Unauthenticated users can try transcription via `/api/demo/*`
- Rate limited by IP address (tracked in `demo_trials` table)
- Uses same AI pipeline but without persistence

### Important Technical Details

#### TypeScript Path Aliases
- `@/*` maps to `src/*` (configured in `tsconfig.json`)
- Example: `import { createSupabaseServerClient } from '@/lib/supabase/server'`

#### Environment Variables Required
```bash
NEXT_PUBLIC_SUPABASE_URL=           # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=          # Supabase service role (scripts only)
SONIOX_API_KEY=                     # Soniox transcription API
OPENROUTER_API_KEY=                 # OpenRouter (replaces OpenAI/Gemini)
```

#### Supabase Row Level Security (RLS)
- All tables have RLS policies enforcing `owner_user_id` filtering
- Users can only access their own students, sessions, prompts
- Service role key bypasses RLS (use carefully in scripts)

#### Migration Status
- Core recording loop is complete (student selection, recording, persistence)
- AI generation (summary/homework) is server-side via OpenRouter
- See `webapp/COMPLETE_MIGRATION.md` for detailed migration checklist
- Legacy browser prototype (`index.html`, `student.html`) is being phased out

## Development Workflow

### Adding New Features

1. **Database changes**: Create migration in `supabase/migrations/`
2. **Server logic**: Add Server Action to `app/actions/`
3. **UI components**: Build in `components/` or page-specific directories
4. **Data loading**: Extend `data-loaders.ts` for server-side fetches
5. **Client state**: Use React Context or Server Actions + revalidation

### Working with AI Features

- **Changing models**: Edit `webapp/src/lib/ai/config.ts`
- **Modifying prompts**: Edit `webapp/src/lib/ai/prompts.ts`
- **Adding tools**: Create new tool in `webapp/src/lib/ai/tools/`
- **Testing AI**: Use `npm run test-tools` script

### Testing Transcription

1. Start dev server: `cd webapp && npm run dev`
2. Sign up at `localhost:3000/auth/sign-up`
3. Navigate to `/recordings`
4. Select a student (or create one via picker modal)
5. Start recording (grants mic permissions)
6. Speak to test transcription
7. Stop to save session to Supabase

## Known Issues and Gotchas

1. **Cookie warnings in development**: Supabase SSR client warns about cookies outside mutation contexts. This is expected and silenced in production (see `lib/supabase/server.ts:60-71`).

2. **Electron app loads Vercel URL**: Desktop wrapper does not bundle the Next.js app. Update `electron-wrapper/main.js:5` with your Vercel deployment URL.

3. **OpenRouter API key required**: Old `OPENAI_API_KEY` and `GEMINI_API_KEY` are deprecated. Use `OPENROUTER_API_KEY` only (see `OPENROUTER_MIGRATION_GUIDE.md`).

4. **Demo mode rate limits**: Demo API endpoints check `demo_trials` table. Users get limited tries per 24h period.

5. **Soniox WebSocket instability**: If transcription stops unexpectedly, check browser console for WebSocket errors. May need token refresh (handled by `useSonioxToken` hook).

## Reference Documentation

- **Migration checklist**: `webapp/COMPLETE_MIGRATION.md` - tracks feature parity with legacy prototype
- **OpenRouter guide**: `webapp/OPENROUTER_MIGRATION_GUIDE.md` - AI model configuration
- **Database schema**: `schema.sql` - full Supabase schema with RLS policies
