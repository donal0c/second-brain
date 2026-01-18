# Claude Code Handoff - Testing Session

**Date**: 2026-01-18
**Previous Session**: Comprehensive app testing with Playwright automation

---

## What Was Done

### 1. Added Test Logging
Extensive `[TEST]` logging was added to trace app behavior:
- `packages/api/src/services/processor.ts` - Processing pipeline
- `packages/api/src/llm/claude.ts` - LLM calls
- `packages/api/src/routes/inbox.ts` - Capture endpoint
- `packages/api/src/routes/nudges.ts` - Nudge detection
- `packages/api/src/routes/receipts.ts` - Clarification resolution
- `packages/api/src/routes/entities.ts` - Entity CRUD + interpret
- `packages/api/src/routes/search.ts` - Search

**IMPORTANT**: This logging needs to be removed. Search for `[TEST]` and delete all console.log statements.

### 2. Created Test Runner
`test_runner.py` - Playwright automation script with tests for:
- capture, browse, today, search, inbox, edit, digest, receipts

### 3. Tests Completed (14/14 PASSED)

| Test | Result | Notes |
|------|--------|-------|
| Capture Page | PASSED | Button click works, API processes |
| Browse Page | PASSED | Shows all entity types |
| Today Page | PASSED | Stats and next actions correct |
| Search | PASSED | Query + highlighting works |
| Inbox Page | PASSED | All items with statuses |
| Edit Task Modal | PASSED | Quick Status, Quick Edit, Fix, Delete |
| Digest Page | PASSED | Route is `/digest/dashboard` |
| Receipts Page | PASSED | Full audit trail |
| Browse - Projects | PASSED | Shows project with outcome/next action |
| Browse - Ideas | PASSED | Shows idea with summary |
| Browse - People | PASSED | Shows person with follow-up |
| Weekly Review | PASSED | Open loops, suggested focus areas |
| Natural Language Edit | PASSED | LLM interprets "mark as waiting" correctly |
| Clarifications Page | PASSED | Smart suggested answers |

### 4. Manual Tests Completed
- Classification: task, project, idea, person, unknown → all work
- Clarification resolution: User answers question → reprocesses correctly
- Confidence gating: High (file), medium (flag), low (clarify) → all work

---

## Issues Found (TO FIX)

### Issue #1: Date Context Missing in Extraction Prompts (HIGH)
**Problem**: When user says "tomorrow", LLM doesn't know current date, so it guesses wrong dates (e.g., 2024-12-19 instead of 2026-01-19).

**Fix Location**: `packages/config/src/prompts/extractors.ts`

**Fix**: Inject current date into extraction prompts:
```typescript
// Add to buildTaskExtractorPrompt and other extractors:
const today = new Date().toISOString().split('T')[0];
// Include in prompt: "Today's date is ${today}. Interpret relative dates accordingly."
```

### Issue #2: Browse UI Doesn't Auto-Refresh After Capture (MEDIUM)
**Problem**: After capturing an item, navigating to Browse doesn't show the new entity until manually clicking Refresh.

**Fix Location**: `packages/web/src/routes/Capture.tsx` or React Query cache invalidation

**Fix**: After successful capture, invalidate the relevant React Query cache:
```typescript
// After capture success:
queryClient.invalidateQueries(['tasks']);
queryClient.invalidateQueries(['projects']);
// etc.
```

### Issue #3: Duplicate Entities from CORS Retries (LOW - Won't Fix)
**Problem**: During CORS failures, frontend retries can create duplicate entities.
**Decision**: Edge case during development only, not a production issue.

---

## Tests Remaining

### To Create and Run:
1. **Delete functionality** - Delete a task and verify removal
2. **Nudges** - Check if nudges are generated and can be dismissed/snoozed
3. **Offline mode** - PWA offline functionality
4. **Filter tests** - Status filters on Browse tabs
5. **Sort tests** - Sorting options work correctly
6. **Fix (entity type change)** - Use "This is actually a project" to convert entity
7. **Reprocess from Inbox** - Click Reprocess and verify
8. **People follow-up** - Mark Complete button works

---

## Files to Know

| File | Purpose |
|------|---------|
| `TEST_FINDINGS.md` | Full test results and issue details |
| `test_runner.py` | Playwright automation script |
| `/tmp/test_results/*.png` | Screenshots from automated tests |

---

## How to Continue

1. **Read this handoff**:
   ```
   Read HANDOFF.md and TEST_FINDINGS.md
   ```

2. **Remove test logging**:
   ```
   Search for [TEST] in packages/api/src and remove all console.log statements
   ```

3. **Fix Issue #1 (date context)**:
   - Edit `packages/config/src/prompts/extractors.ts`
   - Add current date to extraction prompts
   - Test with "Buy milk tomorrow" and verify correct date

4. **Fix Issue #2 (auto-refresh)**:
   - Edit capture success handler
   - Add React Query cache invalidation
   - Test by capturing and navigating to Browse

5. **Create remaining tests**:
   - Add to `test_runner.py` or create new test file
   - Run and verify each test

---

## Server Status

The dev server may still be running in background. Check with:
```bash
lsof -ti:3001  # API server
lsof -ti:5173  # Web server
```

Start fresh with:
```bash
pnpm dev
```

---

## Quick Commands

```bash
# Run a specific Playwright test
~/.playwright-venv/bin/python3 test_runner.py capture

# Check API logs for [TEST] output
grep "\[TEST\]" <server-output-file>

# Remove test logging
grep -r "\[TEST\]" packages/api/src --include="*.ts" -l
```

---

**Good luck!** The app is in good shape - just needs these fixes and the remaining tests.
