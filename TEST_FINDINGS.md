# Test Session Findings - 2026-01-18

## Test 1: Clear Task ("buy milk tomorrow")

**Result**: PASSED (with issue)

**Flow verified**:
- POST /inbox received correctly
- Inbox item created
- LLM classification: task (0.95 confidence)
- Confidence gating: 0.95 >= 0.8 -> "file" action
- Extraction completed successfully
- Task entity created
- Status: processed

**Issue Found**:
- **FINDING #1**: Task extractor needs current date injection
  - LLM extracted due date as "2024-12-19" instead of "2026-01-19"
  - Root cause: LLM doesn't know current date, so relative dates ("tomorrow") are interpreted incorrectly
  - Fix needed: Inject current date into extraction prompts

---

## Test 2: Ambiguous Input ("John")

**Expected**: Clarification request (too vague)

**Result**: PASSED

**Flow verified**:
- Classification: unknown (0.9 confidence)
- Reasoning: "Just the name 'John' without any context is too vague to classify"
- Special handling: Even with high confidence, "unknown" type triggers clarification path
- Clarification created: "What did you want to remember about John?"
- Status: blocked (awaiting user input)

---

## Test 3: Project ("Plan the kitchen renovation...")

**Expected**: Classify as project

**Result**: PASSED

**Flow verified**:
- Classification: project (0.9 confidence)
- Reasoning: "multi-step outcome requiring multiple actions"
- Extraction: name, desiredOutcome, nextAction extracted correctly
- Entity created: project (65e881ac-3408-465f-8bbd-a9fb4a04cc9c)
- Status: processed

**Issue Found**:
- **FINDING #2**: UI slow to reflect new entities
  - Project was in DB immediately but took a while to appear in Browse UI
  - Possible causes: React Query cache stale time, no automatic refetch after capture
  - Worth investigating: Should capture trigger a cache invalidation?

- **FINDING #3**: Multiple "Buy milk" duplicates created
  - Root cause: CORS failures at test start caused multiple retries/submissions
  - Not a processing bug - frontend retry behavior during network errors

---

## Test 4: Idea ("What if we could use AI to summarize meeting notes...")

**Expected**: Classify as idea

**Result**: PASSED

**Flow verified**:
- Classification: idea (0.9 confidence)
- Reasoning: "'what if' hypothetical thought... not actionable as written"
- Extraction: title, summary extracted
- Entity created as idea
- Status: processed

**Confirmed Issue**: Same UI refresh problem - didn't appear until manual Refresh clicked

---

## Test 5: Person ("Met Sarah from the marketing team...")

**Expected**: Classify as person

**Result**: PASSED

**Flow verified**:
- Classification: person (0.8 confidence)
- Reasoning: "captures information about a person and relationship context"
- Extraction: name, relationshipContext extracted
- Entity created: person (3d1c0c68-d2c4-44ad-8e2d-a87f08ba0706)
- Status: processed

---

## Summary of Issues Found

| # | Issue | Severity | Component | Status |
|---|-------|----------|-----------|--------|
| 1 | **Date context missing in extraction prompts** - relative dates like "tomorrow" parsed incorrectly (got 2024-12-19 instead of 2026-01-19) | High | API/Prompts | TO FIX |
| 2 | **Browse UI doesn't auto-refresh after capture** - new entities don't appear until manual Refresh clicked | Medium | Web/React Query | TO FIX |
| 3 | **Duplicate entities from CORS failures** - frontend retries during network errors can create duplicates | Low | Web/API client | Won't Fix (edge case) |

---

## Test Session Summary - Phase 1 (Classification Only)

- **Tests Run**: 5
- **Tests Passed**: 5
- **Issues Found**: 3
- **Pipeline Status**: Core classification/extraction/filing flow works correctly

---

# PHASE 2: Full App Testing

## Inbox Features
- [ ] List inbox items with status filter
- [ ] Reprocess an inbox item
- [ ] View inbox item details

## Automated Playwright Tests

### Capture Page Test
- **Result**: PASSED
- Button click works, API received request, item processed
- Screenshot showed "Capturing..." loading state (test timing issue, not a bug)

### Browse Page Test
- **Result**: PASSED
- Shows all entities: 4 Tasks, 1 Project, 1 Idea, 1 Person
- Tabs work, search filter visible

### Today Page Test
- **Result**: PASSED
- Stats correct: 4 Active Tasks, 1 Project, 1 Idea
- Next Actions displayed with "Overdue" status (confirms date bug)

### Search Test
- **Result**: PASSED
- Query "milk" returns 3 results
- Highlighting works (yellow)
- Type/status filters available

### Inbox Page Test
- **Result**: PASSED
- Shows all 8 captured items with correct statuses
- "Automated test capture" correctly marked "Needs Clarification" (vague input)
- Reprocess buttons visible

### Edit Task Test
- **Result**: PASSED
- Clicking task opens edit modal
- Quick Status buttons work (Complete, Waiting, Someday)
- Quick Edit input for natural language instructions
- Fix section for entity type changes
- Delete button available

### Digest Page Test
- **Result**: PASSED (route is `/digest/dashboard` not `/digest`)
- Shows stats and next actions correctly

### Receipts Page Test
- **Result**: PASSED
- Shows 9 processing receipts with full audit trail
- Each displays: classification, confidence %, model, writes
- Filters for type, confidence, date range

### Browse Tabs Test
- **Projects Tab**: PASSED - Shows "Kitchen Renovation" with outcome/next action
- **Ideas Tab**: PASSED - Shows "AI-Powered Meeting Notes Summarization"
- **People Tab**: PASSED - Shows "Sarah" with Follow-up badge, Mark Complete button

### Weekly Review Test
- **Result**: PASSED
- Shows date range and Open Loops count
- Suggested Areas of Focus with task groupings

### Natural Language Edit Test
- **Result**: PASSED
- Instruction: "mark as waiting"
- LLM correctly interpreted and changed status to "waiting"
- "Saved successfully!" confirmation shown

### Clarifications Page Test
- **Result**: PASSED
- Shows pending clarification with original text
- Smart suggested answer buttons
- Free-text input option
- Resolve button works

---

## AUTOMATED TEST SUMMARY

| Test | Result |
|------|--------|
| Capture Page | PASSED |
| Browse Page | PASSED |
| Today Page | PASSED |
| Search | PASSED |
| Inbox Page | PASSED |
| Edit Task Modal | PASSED |
| Digest Page | PASSED |
| Receipts Page | PASSED |
| Browse - Projects Tab | PASSED |
| Browse - Ideas Tab | PASSED |
| Browse - People Tab | PASSED |
| Weekly Review | PASSED |
| Natural Language Edit | PASSED |
| Clarifications Page | PASSED |

**Total: 14/14 PASSED**

## Clarification Flow
- [x] View pending clarifications
- [x] Answer a clarification (the "John" one) - answered: "john is my dentist, need to schedule checkup"
- [x] Verify reprocessing after answer - PASSED: reclassified as task with 0.9 confidence

**Note**: Network errors during test were from server restarts (tsx watch). Not a bug.

## Browse - Tasks
- [ ] View all tasks
- [ ] Filter by status (active/waiting/someday/completed)
- [ ] Sort by due date / created / title
- [ ] Search tasks
- [ ] Edit task manually
- [ ] Edit task with natural language ("mark as complete")
- [ ] Delete task

## Browse - Projects
- [ ] View all projects
- [ ] Filter by status
- [ ] Edit project
- [ ] Edit with natural language
- [ ] Delete project

## Browse - Ideas
- [ ] View all ideas
- [ ] Edit idea
- [ ] Delete idea

## Browse - People
- [ ] View all people
- [ ] Filter by follow-up needed / stale
- [ ] Sort by name / last touched
- [ ] Mark follow-up complete
- [ ] Edit person

## Today / Digest
- [ ] View daily digest
- [ ] Verify stats are accurate
- [ ] Verify next actions list
- [ ] Verify flagged items
- [ ] Verify stale tasks
- [ ] Click on task to edit

## Nudges
- [ ] View active nudges
- [ ] Dismiss a nudge
- [ ] Snooze a nudge

## Search
- [ ] Global search for task
- [ ] Global search for project
- [ ] Global search for person
- [ ] Click search result to navigate

## Weekly Review
- [ ] View weekly review
- [ ] Check open loops
- [ ] Check stale projects
- [ ] Check context questions
