# AI Agent Implementation Log

**Date Started:** October 5, 2025
**Goal:** Build a hybrid RAG + SQL intelligent agent for Arabic lesson retrieval and generation

---

## 🎯 **The End Goal**

Transform the AI tutor from a **dumb context-stuffing chatbot** into an **intelligent agent** that:

- **Retrieves smartly** - Uses SQL for temporal queries ("last 20 lessons") and RAG for semantic queries ("when did we learn شباك?")
- **Generates efficiently** - Creates homework, summaries, and content from ONLY relevant lessons
- **Saves money** - Reduces from 90k tokens/message ($0.27) to 10-15k tokens ($0.02-0.05)
- **Works faster** - Processes only what's needed, not all 30 lessons every time

---

## 🔥 **The Problem We're Solving**

### Current System (Broken):
1. **Context Stuffing** - Loads ALL 30 lessons (90k tokens) into every single message
2. **Expensive** - $0.27 per message, $270 per 1000 messages
3. **Slow** - Processing 90k tokens takes time
4. **Dumb** - Can't answer "when did we learn X?" or "last 6 months vocab"
5. **No Intelligence** - Just dumps everything, no decision-making

### Future System (Goal):
1. **Smart Retrieval** - Agent chooses SQL or RAG based on query type
2. **Cost-Effective** - $0.02-0.05 per message (83-94% savings!)
3. **Fast** - Only processes 5-15 relevant lessons
4. **Intelligent** - Understands temporal vs semantic queries
5. **Hybrid Approach** - SQL for "when/how many", RAG for "what/topics"

---

## 📊 **Architecture Overview**

```
User Query
    ↓
Agent Brain (Vercel AI SDK)
    ↓
Decision Layer (chooses tool)
    ↓
┌─────────────┬──────────────┬─────────────────┐
│  SQL Tools  │  RAG Tools   │ Generation Tools│
│  (Precise)  │  (Semantic)  │  (AI Creation)  │
└─────────────┴──────────────┴─────────────────┘
    ↓
Database (Supabase + pgvector)
    ↓
Response to User
```

---

## 🛠️ **What We've Built So Far**

### **Phase 1: SQL Foundation** ✅

#### **Database Updates:**
1. Added tracking columns:
   - `embeddings_generated_at` - When embeddings were created
   - `embedding_model` - Which model was used (text-embedding-3-small)

2. Created indexes for performance:
   - `idx_sessions_student_date` - Fast date queries
   - `idx_sessions_combined_content` - Full-text search

#### **SQL Functions Created:**

| Function | Purpose | Example Query |
|----------|---------|---------------|
| `get_recent_lessons()` | Get last N lessons | "آخر 10 دروس" |
| `get_lesson_by_date()` | Get lesson on specific date | "درس 17 سبتمبر" |
| `get_lessons_in_range()` | Get lessons between dates | "دروس آخر 3 شهور" |
| `extract_vocab_from_range()` | Extract vocab from time period | "كل المفردات من يناير" |
| `extract_grammar_topics()` | Extract grammar sections | "كل دروس القواعد" |
| `hybrid_search_lessons()` | Vector similarity search | "متى تعلمنا شباك؟" |
| `get_sessions_needing_embeddings()` | Find unembedded sessions | For migration |
| `update_session_embeddings()` | Save embeddings to DB | For migration |

---

### **Phase 2: Prompt Hardening** ✅

#### **Problem:**
Claude might generate summaries with inconsistent formatting, breaking regex extraction

#### **Solution - 4-Layer Defense:**

**Layer 1: Strict Prompt Instructions**
- Added explicit heading requirements to `prompts.ts`
- Listed EXACT section names (cannot deviate)
- Warning: "IF YOU DEVIATE, THE SYSTEM WILL BREAK"

**Layer 2: Auto-Fix in Code**
- `generation.ts` now auto-corrects common mistakes:
  - `## Vocabulary` → `## New Vocabulary`
  - `## Summary` → `## High-Level Summary`
  - `## Grammar` → `## Main Grammatical Concepts Discussed`

**Layer 3: Flexible SQL Regex**
- SQL functions use `COALESCE()` with multiple fallback patterns
- Tries exact match first, then variations, then last resort

**Layer 4: Logging & Warnings**
- Logs missing headings to console
- Warns when auto-fixes are applied
- Helps debug future format issues

---

### **Phase 3: Embedding Generation** ✅

#### **Goal:**
Populate vector embeddings for all existing sessions to enable semantic search (RAG)

#### **Implementation:**

**Files Created:**
1. `webapp/src/lib/ai/embeddings.ts` - Utility functions for generating embeddings
2. `webapp/scripts/generate-embeddings.ts` - Migration script to process all sessions

**Dependencies Added:**
- `openai` (v6.1.0) - OpenAI SDK for embeddings API
- `tsx` (v4.20.6) - TypeScript executor for scripts
- `dotenv` (v17.2.3) - Environment variable loader

**Script Functionality:**
```typescript
// Key features:
- Lazy initialization of OpenAI client (avoids env loading issues)
- Fetches sessions without embeddings using SQL function
- Generates embeddings using text-embedding-3-small (1536 dimensions)
- Saves to database: summary_embedding, homework_embedding, combined_content
- Tracks generation metadata: embeddings_generated_at, embedding_model
- Progress reporting with success/error counts
```

**Results:**
- ✅ **32 sessions processed** in single run
- ✅ **58 total sessions** now have embeddings
- ✅ **0 errors** during generation
- 💰 **Cost:** ~$0.006 (less than 1 cent!)
- ⏱️ **Time:** ~2-3 minutes for 32 sessions

**Commands Added:**
```bash
npm run generate-embeddings   # Run embedding generation script
```

**Database State After:**
- All sessions with `summary_md` or `homework_md` now have vector embeddings
- `summary_embedding` column populated (vector(1536))
- `homework_embedding` column populated (vector(1536))
- `combined_content` contains concatenated text for full-text search
- `embeddings_generated_at` tracks when embeddings were created
- `embedding_model` set to 'text-embedding-3-small'

---

### **Phase 4: Auto-Embedding on Generation** ✅

#### **Problem:**
When generating/regenerating summaries or homework, embeddings weren't being created automatically. This meant:
- New summaries had no embeddings
- Regenerated content lost embeddings
- RAG search wouldn't find new content

#### **Solution:**
Modified `generation.ts` to automatically generate embeddings whenever summary/homework is created or updated.

**Implementation:**
```typescript
// In generateSessionArtifactsAction():
if (summaryGenerated || homeworkGenerated) {
  // 1. Get the latest summary/homework text
  const summaryText = updates.summary_md || session.summary_md || '';
  const homeworkText = updates.homework_md || session.homework_md || '';

  // 2. Generate embeddings
  const summaryEmbedding = await generateEmbedding(summaryText);
  const homeworkEmbedding = await generateEmbedding(homeworkText);
  const combinedContent = prepareCombinedContent(summaryText, homeworkText);

  // 3. Add to database update
  updates.summary_embedding = summaryEmbedding;
  updates.homework_embedding = homeworkEmbedding;
  updates.combined_content = combinedContent;
  updates.embeddings_generated_at = new Date().toISOString();
  updates.embedding_model = 'text-embedding-3-small';
}
```

**Key Features:**
- ✅ Automatic - no manual intervention needed
- ✅ Non-blocking - embedding errors don't fail generation
- ✅ Efficient - only generates when content changes
- ✅ Consistent - uses same model as batch script

**Cost Impact:**
- Summary generation: $0.02 (Claude) + $0.00002 (embeddings) = **$0.02002**
- Homework generation: $0.01 (Claude) + $0.00001 (embeddings) = **$0.01001**
- Negligible increase (~0.1% more)

**Result:**
- ✅ All new summaries auto-embedded
- ✅ All regenerated content auto-embedded
- ✅ RAG search always up-to-date
- ✅ No manual embedding script needed for new content

---

## 🔄 **Current Status**

### ✅ Completed:
- [x] SQL infrastructure (functions, indexes, columns)
- [x] Prompt hardening (strict formatting rules)
- [x] Auto-fix validation in generation action
- [x] Flexible regex patterns with fallbacks
- [x] **Embedding generation complete! (58 sessions embedded)**
- [x] **Auto-embedding on summary/homework generation**

### ⏳ In Progress:
- [ ] Build 8 agent tools (TypeScript wrappers)
- [ ] Integrate Vercel AI SDK
- [ ] Create test playground

### 📅 Upcoming:
- [ ] Tool implementation (SQL + RAG + Generation)
- [ ] Agent orchestration logic
- [ ] Testing & refinement

---

## 🎯 **The 8 Core Tools (To Be Built)**

### **Category A: SQL Retrieval (Precise)**
1. `getRecentLessons(studentId, count)` - Last N lessons
2. `getLessonByDate(studentId, date)` - Specific date
3. `getLessonsInDateRange(studentId, start, end)` - Date range
4. `getAllVocabSince(studentId, months)` - Vocab extraction

### **Category B: RAG Retrieval (Semantic)**
5. `searchLessonsByTopic(studentId, query)` - Vector similarity
6. `searchGrammarTopics(studentId, query)` - Grammar search

### **Category C: Generation**
7. `generateHomeworkFromLessons(lessons)` - Create homework
8. `generateSummaryOfSummaries(lessons)` - Meta-summary

---

## 📈 **Success Metrics**

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Cost per message | $0.27 | $0.02-0.05 | ⏳ Pending |
| Tokens per message | 90,000 | 10,000-15,000 | ⏳ Pending |
| Response time | Slow | <3 seconds | ⏳ Pending |
| Query types supported | 1 (dump all) | 10+ (smart) | ⏳ Pending |
| Cost savings | 0% | 83-94% | ⏳ Pending |

---

## 🔧 **Tech Stack**

- **Database:** Supabase (PostgreSQL + pgvector)
- **Embeddings:** OpenAI `text-embedding-3-small` (1536 dimensions)
- **Agent Framework:** Vercel AI SDK
- **LLM:** Claude 3.5 Sonnet (via OpenRouter)
- **Language:** TypeScript + Next.js

---

## 🚀 **Next Steps**

1. **Create embedding generation script**
   - Fetch all sessions without embeddings
   - Generate embeddings using OpenAI
   - Store in `summary_embedding` and `homework_embedding` columns
   - Cost: ~$0.02 for 100 lessons (one-time)

2. **Build TypeScript tool wrappers**
   - Create `webapp/src/lib/ai/tools/` directory
   - Implement 8 tools as TypeScript functions
   - Each tool calls corresponding SQL function

3. **Integrate Vercel AI SDK**
   - Install dependencies: `ai`, `@ai-sdk/openai`, `zod`
   - Create agent configuration
   - Connect tools to agent

4. **Build test playground**
   - Create `/ai-test` page
   - Test tool selection in real-time
   - Verify hybrid approach works

---

## 💡 **Key Decisions Made**

1. **Embeddings in `sessions` table** - Keep them where data lives, not separate table
2. **Hybrid approach** - SQL for precision, RAG for semantics (best of both worlds)
3. **4-layer defense** - Strict prompts + auto-fix + flexible regex + logging
4. **Text-only first** - No media/audio/video generation yet (future phase)
5. **No DB edits from agent** - Agent only reads & generates, never modifies stored data

---

## 📝 **Lessons Learned**

1. **Claude can't be 100% trusted** - Always have fallback patterns
2. **Regex is fragile** - Need multiple layers of defense
3. **Embeddings are cheap** - $0.006 for 32 sessions is negligible (~$0.02 per 100 lessons)
4. **Context stuffing is expensive** - 90k tokens/message adds up fast
5. **Hybrid > Pure approach** - SQL + RAG better than either alone
6. **Environment variables in scripts** - Use lazy initialization + explicit .env.local loading with dotenv
7. **Progress reporting** - Real-time feedback in scripts is invaluable for long-running tasks
8. **Batch processing** - OpenAI allows 2048 inputs per request (can optimize further if needed)
9. **Auto-embed on generation** - Don't forget to generate embeddings when content changes! Add it to the same transaction
10. **Non-blocking embedding errors** - Embedding failures shouldn't stop summary generation (log & continue)

---

## 🔗 **Related Files**

- **Prompts:** `webapp/src/lib/ai/prompts.ts`
- **Generation:** `webapp/src/app/actions/generation.ts`
- **Embeddings:** `webapp/src/lib/ai/embeddings.ts`
- **Embedding Script:** `webapp/scripts/generate-embeddings.ts`
- **Database Types:** `webapp/src/lib/database.types.ts`
- **Migration:** `supabase/migrations/20251004215647_remote_schema.sql`

---

## 📊 **Database Schema (Current State)**

### `sessions` table (enhanced):
```sql
- summary_embedding: vector(1536)     -- OpenAI embeddings
- homework_embedding: vector(1536)    -- OpenAI embeddings
- combined_content: text              -- Combined text for search
- embeddings_generated_at: timestamptz -- Tracking
- embedding_model: text               -- Model used
```

### Indexes:
- HNSW index on embeddings (fast vector search)
- GIN index on combined_content (full-text search)
- B-tree on (student_id, created_at)

---

**Last Updated:** October 5, 2025
**Status:** Phase 4 Complete ✅ - Auto-Embedding Integrated | Embeddings: 58 sessions | Next: Build Agent Tools
