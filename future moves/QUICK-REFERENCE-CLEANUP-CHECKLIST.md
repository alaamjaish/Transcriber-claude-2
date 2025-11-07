# Quick Reference: Cleanup Checklist

**Date**: November 7, 2025
**Full Report**: See `2025-11-07-DEEP-CODEBASE-CLEANUP-AUDIT.md`

---

## ⚡ TL;DR - What to Delete

```bash
# Copy-paste this entire block to clean up everything:

cd "C:\Users\Alaa M. Jaish\Desktop\Programming\Agentic_JOURNEY\cc\windsurf-claude - Copy (2)"

# Dead source files
rm webapp/src/app/actions/agent.ts
rm webapp/src/lib/ai/agent.ts
rm webapp/src/app/\(dashboard\)/students/not-found.tsx
rm webapp/src/app/api/health/route.ts
rmdir webapp/src/app/ai-test

# Docs (archive first if you want)
rm -rf webapp/docs
rm "webapp/COMPLETE_MIGRATION copy.md"

# Test files
rm webapp/check_embeddings.sql
rm webapp/test_date_query.sql
rm run-migration.js

# Dependency
cd webapp && npm uninstall @ai-sdk/anthropic && cd ..
```

---

## ✏️ Manual Edits Required

### 1. Edit `webapp/src/lib/placeholder-data.ts`
Delete mock exports, keep only `statusLabel` function

### 2. Edit `webapp/.env.local`
Remove line: `GEMINI_API_KEY=...`

---

## ✅ Verification Commands

```bash
cd webapp
npm run build      # Should succeed
npm run lint       # Should pass
npm run dev        # Should start
```

---

## 📊 Impact Summary

- **Files to delete**: 17
- **Size savings**: ~158 KB
- **Dependencies removed**: 1
- **Breaking changes**: NONE
- **Risk level**: 🟢 EXTREMELY LOW

---

## 🚨 What NOT to Delete

### Keep These (They're Used!)

**AI Agents** - All in `lib/ai/agents/`:
- ✅ vocabulary-agent.ts
- ✅ temporal-agent.ts
- ✅ rag-agent.ts
- ✅ summary-agent.ts
- ✅ homework-agent.ts

**Recording Components**:
- ✅ RecordingControls.tsx
- ✅ StatusIndicator.tsx
- ✅ TranscriptPane.tsx

**Scripts**:
- ✅ scripts/generate-embeddings.ts
- ✅ scripts/test-tools.ts

**Docs to Keep**:
- ✅ COMPLETE_MIGRATION.md
- ✅ OPENROUTER_MIGRATION_GUIDE.md
- ✅ README.md

---

## 🎯 Git Commands

```bash
# Backup first
git checkout -b backup/pre-cleanup-nov-7-2025
git add -A
git commit -m "Backup before cleanup"
git push origin backup/pre-cleanup-nov-7-2025
git checkout main

# After cleanup
git add -A
git commit -m "🧹 Cleanup: Remove dead code and unused dependencies"
git push origin main
```

---

**Read the full report for detailed analysis and reasoning.**
