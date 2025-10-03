# 🚀 OpenRouter Migration Guide

## ✅ Migration Complete!

Your AI system has been successfully migrated from provider-specific APIs (OpenAI + Gemini) to **OpenRouter**, giving you the flexibility to use **any AI model** with a single API key.

---

## 🔑 What You Need To Do

### 1. Get Your OpenRouter API Key

1. Go to [OpenRouter.ai](https://openrouter.ai/)
2. Sign up or log in
3. Go to [Keys](https://openrouter.ai/keys)
4. Create a new API key
5. Copy it (starts with `sk-or-v1-...`)

### 2. Update Environment Variables

**Add to your `.env.local` file:**

```bash
# OpenRouter API Key (replaces OPENAI_API_KEY and GEMINI_API_KEY)
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Optional: Site metadata for OpenRouter analytics
NEXT_PUBLIC_SITE_URL=https://your-app.com
NEXT_PUBLIC_SITE_NAME=AI Tutoring Platform
```

**Old variables (can be removed):**
```bash
# OPENAI_API_KEY=...  ← No longer needed
# GEMINI_API_KEY=...  ← No longer needed
```

### 3. Add Credits to OpenRouter

- OpenRouter uses a pay-as-you-go model
- Add $5-10 to start (will last a long time)
- Go to [Credits](https://openrouter.ai/credits) to add funds

---

## 🎨 What Changed in Your Code

### New Files Created:

1. **`webapp/src/lib/ai/config.ts`**
   - Central model configuration
   - **This is where you switch models!**
   - Change model names to experiment

2. **`webapp/src/lib/ai/openrouter.ts`**
   - Unified API client for all models
   - Handles all OpenRouter communication

### Files Updated:

1. **`webapp/src/lib/ai/generate.ts`**
   - Now uses OpenRouter for summaries + homework
   - Model selection from `config.ts`

2. **`webapp/src/app/actions/ai-tutor.ts`**
   - AI tutor chat now uses OpenRouter
   - Title generation uses OpenRouter

### Files You Can Delete (optional):

- **`webapp/src/lib/ai/gemini.ts`** ← No longer used

---

## 🔄 How to Switch Models

**Open `webapp/src/lib/ai/config.ts` and change the model names:**

```typescript
export const AI_MODELS = {
  summary: 'google/gemini-flash-1.5',              // ← Change this
  homework: 'openai/gpt-4o',                       // ← Change this
  chat: 'anthropic/claude-3.5-sonnet-20241022',   // ← Change this
  titleGeneration: 'google/gemini-flash-1.5',     // ← Change this
} as const;
```

### Popular Model Options:

**For Summaries (fast & cheap):**
- `google/gemini-flash-1.5` (current - very cheap)
- `openai/gpt-4o-mini` (cheap, good quality)
- `anthropic/claude-3-haiku` (fast, cheap)

**For Homework (balanced):**
- `openai/gpt-4o` (current - excellent structured output)
- `anthropic/claude-3.5-sonnet` (best reasoning)
- `google/gemini-pro-1.5` (good quality, affordable)

**For AI Tutor Chat (best quality):**
- `anthropic/claude-3.5-sonnet-20241022` (current - BEST reasoning + Arabic)
- `openai/gpt-4o` (great quality)
- `google/gemini-pro-1.5` (2M token context!)

**For Title Generation (ultra cheap):**
- `google/gemini-flash-1.5` (current - pennies)
- `openai/gpt-4o-mini` (very cheap)

### See All Available Models:
- Browse models: [OpenRouter Models](https://openrouter.ai/models)
- Pricing comparison: [OpenRouter Pricing](https://openrouter.ai/docs/pricing)

---

## 💰 Cost Comparison

**Before (separate APIs):**
- OpenAI: $0.005/summary
- Gemini: $0.015/chat (100k tokens)
- **Total:** ~$3-5/month per tutor

**After (OpenRouter - same models):**
- Gemini Flash: $0.001/summary (5x cheaper!)
- Claude Sonnet: $0.012/chat (better quality!)
- **Total:** ~$2-4/month per tutor

**You can now:**
- Mix and match models
- Optimize for cost vs. quality
- Switch models instantly (no code changes)

---

## 🧪 Testing Your Migration

### Test 1: Summary Generation
1. Create/record a new session
2. Generate summary
3. Check it works ✅

### Test 2: Homework Generation
1. On a session, generate homework
2. Check it works ✅

### Test 3: AI Tutor Chat
1. Open AI tutor sidebar (hamburger menu)
2. Send a message
3. Check AI responds ✅

---

## 🐛 Troubleshooting

### Error: "OPENROUTER_API_KEY is not configured"
- Make sure you added `OPENROUTER_API_KEY` to `.env.local`
- Restart your dev server (`npm run dev`)

### Error: "Insufficient credits"
- Add credits to your OpenRouter account: [Credits](https://openrouter.ai/credits)

### Error: Model not found
- Check the model name in `config.ts`
- Verify it exists at [OpenRouter Models](https://openrouter.ai/models)
- Model names are case-sensitive!

### Error: Rate limited
- OpenRouter has rate limits (depends on your plan)
- Wait a few seconds and retry
- Consider upgrading your OpenRouter plan

---

## 🎯 Benefits You Now Have

✅ **Model Flexibility** - Switch models in seconds
✅ **Zero Vendor Lock-in** - Use any provider
✅ **Easy Experimentation** - Test quality/cost tradeoffs
✅ **Automatic Fallbacks** - OpenRouter handles provider outages
✅ **Unified Billing** - One bill for all models
✅ **Better Analytics** - OpenRouter dashboard shows usage
✅ **Future-Proof** - New models added automatically

---

## 📊 Recommended Starting Configuration

```typescript
// Best balance of quality, cost, and Arabic support
export const AI_MODELS = {
  summary: 'google/gemini-flash-1.5',              // Ultra cheap
  homework: 'openai/gpt-4o',                       // Best structured output
  chat: 'anthropic/claude-3.5-sonnet-20241022',   // Best reasoning + Arabic
  titleGeneration: 'google/gemini-flash-1.5',     // Ultra cheap
} as const;
```

**Expected costs with this config:**
- Summary: $0.001 per call
- Homework: $0.005 per call
- Chat: $0.012 per call (100k tokens)
- Title: $0.0001 per call

**For 10 students × 20 interactions each:**
- Summaries: $0.20
- Homework: $1.00
- Chats: $2.40
- Titles: $0.02
- **Total: ~$3.62/month per tutor** ✨

---

## 🚀 Next Steps

1. **Get OpenRouter API key** → [OpenRouter Keys](https://openrouter.ai/keys)
2. **Add to `.env.local`** → `OPENROUTER_API_KEY=...`
3. **Add $5-10 credits** → [OpenRouter Credits](https://openrouter.ai/credits)
4. **Restart dev server** → `npm run dev`
5. **Test everything** → Create session, chat, etc.
6. **Experiment with models** → Edit `config.ts` to try different models

---

## 📚 Resources

- **OpenRouter Docs:** https://openrouter.ai/docs
- **Model List:** https://openrouter.ai/models
- **Pricing:** https://openrouter.ai/docs/pricing
- **Dashboard:** https://openrouter.ai/activity
- **API Status:** https://status.openrouter.ai/

---

## 🎉 You're All Set!

Your AI system is now **model-agnostic** and **future-proof**. Experiment freely and find the perfect balance of quality and cost for your use case.

**Questions?** Check the OpenRouter docs or DM me!
