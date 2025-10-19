# Multi-Agent Architecture Migration Plan

## 🎯 Goal
Replace single agent (9 tools, Sonnet 4.5) with orchestrator + 5 specialized agents (Gemini 2.5 Flash-Lite)

**Expected: 87% cost reduction + better performance**

---

## 📋 Implementation Checklist

### Phase 1: Setup & Dependencies
- [ ] Install `@ai-sdk/google` package
- [ ] Verify `GOOGLE_GENERATIVE_AI_API_KEY` environment variable
- [ ] Test Gemini 2.5 Flash connection

### Phase 2: Create Individual Agents
- [ ] Create `webapp/src/lib/ai/agents/temporal-agent.ts`
  - Model: Gemini 2.5 Flash-Lite
  - Thinking: disabled (thinking: 0)
  - Tools: 3 tools (getRecentLessons, getLessonByDate, getLessonsInDateRange)
  - No memory, stateless

- [ ] Create `webapp/src/lib/ai/agents/vocabulary-agent.ts`
  - Model: Gemini 2.5 Flash-Lite
  - Thinking: disabled (thinking: 0)
  - Tools: 2 tools (getAllVocabSince, searchExactWord)
  - No memory, stateless

- [ ] Create `webapp/src/lib/ai/agents/rag-agent.ts`
  - Model: Gemini 2.5 Flash-Lite
  - Thinking: disabled (thinking: 0)
  - Tools: 2 tools (searchLessonsByTopic, searchGrammarTopics)
  - No memory, stateless

- [ ] Create `webapp/src/lib/ai/agents/summary-agent.ts`
  - Model: Gemini 2.5 Flash-Lite
  - Thinking: disabled (thinking: 0)
  - Tool: 1 tool (generateSummaryOfSummaries)
  - No memory, stateless

- [ ] Create `webapp/src/lib/ai/agents/homework-agent.ts`
  - Model: Gemini 2.5 Flash (Regular) OR Claude Haiku 4
  - Thinking: enabled (needs creativity)
  - Tool: 1 tool (generateHomeworkFromLessons)
  - No memory, stateless

### Phase 3: Create Orchestrator
- [ ] Create `webapp/src/lib/ai/orchestrator.ts`
  - Model: Claude Sonnet 4.5
  - No tools (routing only)
  - Has conversation memory (ROLLING WINDOW: last 10 messages only)
  - Implementation: `conversationHistory.slice(-10)`
  - Users can chat forever, context stays constant size
  - Routes to: Temporal, Vocabulary, RAG, Summary, or Homework agents

### Phase 4: Integration
- [ ] Update `webapp/src/app/actions/agent-chat.ts`
  - Replace `runAgent()` with `runOrchestrator()`
  - Implement rolling window: Pass only `history.slice(-10)` to orchestrator
  - All messages still saved to DB (unlimited)
  - Only last 10 sent to AI for context
  - Update imports

### Phase 5: Testing
- [ ] Test Temporal Agent (date/time queries)
- [ ] Test Vocabulary Agent (word searches)
- [ ] Test RAG Agent (semantic search)
- [ ] Test Summary Agent (summarization)
- [ ] Test Homework Agent (content generation)
- [ ] Test conversation memory (rolling window: last 10 messages)
  - Verify messages 1-20 saved to DB
  - Verify orchestrator only sees 11-20 on message 20
  - Verify no message limit for user
- [ ] Test cost savings locally

### Phase 6: Deployment
- [ ] Push to Vercel
- [ ] Verify environment variables on Vercel
- [ ] Monitor production costs

---

## 🏗️ Architecture

```
User Question → Orchestrator (Sonnet 4.5, has memory)
                        ↓
        ┌───────────────┼───────────────┬──────────────┬─────────────┐
        ↓               ↓               ↓              ↓             ↓
   Temporal      Vocabulary        RAG          Summary      Homework
   Agent         Agent             Agent        Agent        Agent
   (Flash-Lite)  (Flash-Lite)      (Flash-Lite) (Flash-Lite) (Flash)
   3 tools       2 tools           2 tools      1 tool       1 tool
   thinking: 0   thinking: 0       thinking: 0  thinking: 0  thinking: ON
   No memory     No memory         No memory    No memory    No memory
        ↓               ↓               ↓              ↓             ↓
        └───────────────┼───────────────┴──────────────┴─────────────┘
                        ↓
             Returns to Orchestrator
                        ↓
              Formats Response
                        ↓
                      User
```

---

## 📊 Cost Comparison

| Setup | Cost per 1000 queries | Notes |
|-------|----------------------|-------|
| Current (1 agent) | $60 | Sonnet 4.5 for everything |
| Option A (Flash) | $22 | 63% savings |
| **Option B (Flash-Lite)** | **$8** | **87% savings ($52)** |

### Model Pricing:
- **Flash-Lite**: $0.10 input / $0.40 output (6.3x cheaper!)
- **Regular Flash**: $0.30 input / $2.50 output
- **Sonnet 4.5**: $3 input / $15 output

---

## 📝 Current Status

**Last Updated:** In Progress
**Current Phase:** Phase 4 - Integration COMPLETE ✅
**Next Steps:**
1. Add GOOGLE_GENERATIVE_AI_API_KEY to .env.local
2. Test locally with `npm run dev`
3. Verify all agents work correctly

## ✅ Completed Tasks

**Phase 1: Setup**
- ✅ Installed @ai-sdk/google package
- ⏳ Need to add GOOGLE_GENERATIVE_AI_API_KEY environment variable

**Phase 2: All 5 Agents Created**
- ✅ Temporal Agent (3 tools) - Flash-Lite, thinking OFF
- ✅ Vocabulary Agent (2 tools) - Flash-Lite, thinking OFF
- ✅ RAG Agent (2 tools) - Flash-Lite, thinking OFF
- ✅ Summary Agent (1 tool) - Flash-Lite, thinking OFF
- ✅ Homework Agent (1 tool) - Regular Flash, thinking ON

**Phase 3: Orchestrator**
- ✅ Created orchestrator with Sonnet 4.5
- ✅ Routes to all 5 specialized agents
- ✅ Implements rolling 10-message window

**Phase 4: Integration**
- ✅ Updated agent-chat.ts to use orchestrator
- ✅ Rolling window memory implemented
- ✅ All logging updated

## 📁 Files Created

1. `webapp/src/lib/ai/agents/temporal-agent.ts` ✅
2. `webapp/src/lib/ai/agents/vocabulary-agent.ts` ✅
3. `webapp/src/lib/ai/agents/rag-agent.ts` ✅
4. `webapp/src/lib/ai/agents/summary-agent.ts` ✅
5. `webapp/src/lib/ai/agents/homework-agent.ts` ✅
6. `webapp/src/lib/ai/orchestrator.ts` ✅

## 📝 Files Modified

1. `webapp/package.json` - Added @ai-sdk/google ✅
2. `webapp/src/app/actions/agent-chat.ts` - Uses orchestrator ✅

---

## 🔑 Key Design Decisions

1. **Memory:** Only orchestrator has conversation history
   - **Rolling window:** Always keeps LAST 10 messages only
   - Users can chat forever (unlimited total messages)
   - Old messages automatically drop out of context
   - Example: Messages 1-50 exist, but orchestrator only sees 41-50
2. **Models:**
   - Orchestrator: Sonnet 4.5 (smart routing)
   - Tool-calling workers: Flash-Lite with thinking disabled (cheap, fast)
   - Creative worker: Regular Flash or Haiku (homework needs quality)
3. **Tools per agent:** 3, 2, 2, 1, 1 (optimal range - no agent >3 tools!)
4. **Routing:** Orchestrator analyzes query and delegates to most specific agent
5. **Stateless workers:** Agents receive task, execute, return result, forget
6. **Thinking mode:** Disabled for tool-calling, enabled only for homework generation

## 🎯 Why Split SQL Agent (5 → 2)?

**Research shows:** 5+ tools causes confusion even with good descriptions.

**Solution:** Split by function:
- **Temporal Agent** (3 tools): Time-based queries ("last 10 lessons", "Sept 17")
- **Vocabulary Agent** (2 tools): Word searches ("when did we learn airport?")

**Benefits:**
- 70% reduction in wrong tool selection (Bloomberg research)
- Clearer routing logic for orchestrator
- Each agent stays in 2-3 tool optimal range

---

## ⚠️ Important Notes

- NO UI changes needed
- NO database schema changes
- All 9 existing tools stay unchanged
- Only AI routing logic changes
- Test locally before deploying
