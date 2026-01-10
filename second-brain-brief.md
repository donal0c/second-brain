# Second Brain System (Local‑First Cognitive Architecture)
*A high-level “what & why” brief + phased build plan to hand off to Claude Code for detailed spec’ing.*

---

## 1) What we’re building (in plain terms)
We are building an **external cognitive architecture**—not a traditional “knowledge management” app.

It behaves like an **assistant-like factory**:
- **You capture** raw thoughts/facts/tasks into one universal inbox.
- The system **classifies + extracts** structured “memory” and “next actions”.
- The system **proactively surfaces** what matters (daily/weekly nudges) so you don’t have to remember to search.

The end state is a **low-friction, multi-device** system (desktop + phone + later watch) that is **auditable, correctable, and reliable**.

---

## 2) Why we’re building it (the psychology + rationale)
This system exists to solve **cognitive leakage**—the constant mental overhead of trying not to forget.

### The problems it targets
- **Open loops create low‑grade anxiety.**  
  Your brain keeps running background threads: “Don’t forget to…”, “Remember to follow up…”, “What was that deadline?”  
  This system converts that anxiety into **concrete actions** and **trusted storage**.

- **Compounding value (relationships + projects).**  
  Important details “cool off” over time. The system retains context so work and relationships **compound** rather than reset.

- **It must work for the “unmotivated” you.**  
  Most productivity systems fail because they require effort at the worst moment (when you’re rushed/tired).  
  This is designed as **support rails**: it runs even when you’re disorganized.

### Core idea
Humans are great at **thinking and decision-making**, not **storage and retrieval**.  
So the system offloads storage/retrieval and returns only what you need, when you need it.

### Reliability beats cleverness
The system favors:
- **Small schemas**
- **Few categories**
- **A simple loop**
- **A strict “bouncer”** (don’t file uncertain items)

This prevents “junk drawer” collapse and keeps it maintainable.

---

## 3) The system’s functional requirements (the 8 building blocks)
These are the conceptual parts the implementation must satisfy.

1. **Dropbox (Capture Point)**  
   Frictionless. One universal entry point. No tagging/folders/priority decisions at capture time.

2. **Sorter (Classifier/Router)**  
   AI decides what the item *is* (task, project, person context, idea/note).

3. **Form (Schema/Data Contract)**  
   Structured fields ensure the system can query/summarize reliably later.

4. **Filing Cabinet (Source of Truth)**  
   Durable memory store readable by humans and the automation.

5. **Receipt (Audit Trail/Ledger)**  
   Every AI write produces an auditable record of what it did and why.

6. **Bouncer (Confidence Filter)**  
   Low-confidence items are **held** and clarified, not filed into memory.

7. **Tap on the Shoulder (Proactive Surfacing)**  
   Push relevant information (daily digest, weekly review) without requiring search.

8. **Fix Button (Feedback Handle)**  
   Trivial corrections (fast, low-effort) that immediately update the memory store.

---

## 4) Design principles (non-negotiable constraints)
1. **One reliable human behavior:** Capture.  
   Everything else is automation.

2. **Separation of concerns:**  
   **Memory** (facts) vs **Compute** (AI + logic) vs **Interface** (capture + digests).  
   This makes it portable: swap models/db/UI without rewriting the philosophy.

3. **Next Action is the unit of execution:**  
   The system must extract specific next steps, not vague intentions.

4. **Design for restart, not perfection:**  
   Missing a week shouldn’t create guilt/backlog monsters. A brain dump should restart the system instantly.

5. **Maintainability over cleverness:**  
   Keep categories and fields “painfully small” at first.

---

## 5) What the MVP should do (the simplest closed loop)
**Capture → Process → File (or Clarify) → Digest → Fix**

MVP must deliver these experiences:
- Capture takes **< 5 seconds**.
- Most items get processed automatically within minutes.
- Uncertain items generate a **good clarification question**.
- Every morning: a short **Daily Digest** you actually want to read.
- Corrections are **fast** and propagate into future digests.

---

## 6) Suggested system architecture (high level)
Think of three layers (can run in one local process at first):

### Interface (Capture + Fix)
- A minimal web UI with:
  - one textbox capture
  - “Inbox” view
  - “Clarifications” view
  - “Today” digest view
  - “Receipts” view

### Compute (Sorter + Extractor + Bouncer)
- A processing pipeline:
  - classify → extract fields → validate confidence → write memory or hold for clarification
- Creates a **receipt** for every processed item.

### Memory (Filing Cabinet + Ledger)
- Structured storage for entities + receipts.
- Receipts are immutable records of AI actions.

---

## 7) Minimal schema (“forms”) to start with
Start small. Expand only when pain appears.

**InboxItem**
- `id, capturedAt, rawText, source, status: new|processed|blocked`

**Task**
- `id, title, nextAction, dueDate?, context?, status`

**Project**
- `id, name, desiredOutcome?, nextAction, status`

**Person**
- `id, name, relationshipContext, lastTouchedAt?, followUpNextAction?`

**Idea / Note**
- `id, title, summary, links?`

**Receipt (ledger)**
- `inboxItemId, classification, extractedFields, confidenceScore, modelUsed, timestamp, writes/diff`

**Clarification**
- `inboxItemId, question, options?, userAnswer, resolvedAt?`

---

## 8) Phased build plan (MVP → polished multi-device)

### Phase 0 — Foundations (very short)
**Goal:** lock invariants + choose minimal schema.
- Write a 1-page “constitution” (principles + constraints).
- Define the schema above.
- Define digest format (max ~8 bullets; action-oriented).

---

### Phase 1 — MVP (local-first)
**Goal:** prove the loop closes.

Build:
- Local web app: capture + inbox + today digest.
- Local DB (SQLite) as the filing cabinet + receipts ledger.
- Processor job runs every few minutes:
  - classify + extract + confidence-gate
  - file into memory or create a clarification
  - write a receipt either way
- Daily digest generated every morning (initially viewable in UI; “push” can come later).

---

### Phase 2 — Trust + Repair
**Goal:** make it trustworthy and self-healing.

Build:
- Receipt viewer (“what did the AI do?”).
- Fix flow:
  - From digest item → “Fix” → plain-language correction
  - Apply update to memory + write a new receipt referencing the old one.

Constraint:
- Fix must take **< 15 seconds**.

---

### Phase 3 — Proactive Retrieval (nudges)
**Goal:** break the “search” paradigm.

Build:
- Nudge engine outputs:
  - daily: top next actions + relevant context
  - weekly: open loops + stale projects + people follow-ups
  - optional: “projects missing next action”, “tasks with unclear context”
- Scheduling: daily + weekly, then optional micro-nudges (1–2/day max).

---

### Phase 4 — Multi-device (PWA + sync)
**Goal:** phone capture with offline resilience.

Build:
- PWA: home-screen icon, offline capture queue, sync when online.
- Add a sync layer:
  - **Option A (simple):** host an API + Postgres; clients sync.
  - **Option B (local-first heavy):** CRDT/replication; adopt only if needed.
- Authentication: passkeys or lightweight single-user auth.

---

### Phase 5 — Ultra-low friction capture (voice + shortcuts + watch)
**Goal:** capturing becomes reflexive.

Build:
- Global hotkey capture on desktop.
- iOS/Android shortcut (share sheet “Send to Brain”).
- Voice capture (dictation → inbox; local transcription later).
- Watch capture (dictation routed through phone shortcut).

---

## 9) Technology suggestions (pragmatic, low ceremony)
Pick boring tools that won’t fight you.

### MVP stack (local-first)
- **Backend:** Python (FastAPI) *or* Node (Fastify/Express)
- **DB:** SQLite (simple, durable, portable)
- **UI:** minimal web (React/Vite) *or* server-rendered pages
- **Jobs:** a simple scheduler (cron-like) or background worker loop
- **LLM:** Claude Code / Anthropic models (start with hosted; consider local later)

### Later (multi-device)
- **PWA** for phone-first UX with offline capture
- **Server DB:** Postgres if/when you add central sync
- **Vector search:** optional; defer until you feel pain with retrieval

### Operational principles
- Local capture must still work even if the model/API is temporarily unavailable:
  - Queue raw inbox items and process later.

---

## 10) AI processing (high-level behavior)
### Classification
Given raw text, decide: **Task / Project / Person / Idea / Unknown**.

### Extraction (the “form fill”)
- If Task: extract **Next Action** + due date if present.
- If Project: extract desired outcome + **Next Action**.
- If Person: extract relationship context + follow-up action if implied.
- If Idea: create a short title + summary.

### Bouncer / confidence gating
- If uncertain: do **not** write to main memory.
- Create a clarification: one focused question with suggested options when possible.

### Receipts
Every processed item must produce:
- what it decided
- what it stored
- confidence score
- references to any entities it linked
- model + timestamp

---

## 11) Success criteria (how we’ll know it works)
- Capture is effortless and habitual.
- Daily digest reduces “mental background threads.”
- Weekly review prevents things from slipping.
- Trust remains high because receipts + fixes are easy.
- Restart is trivial: brain dump restores clarity without guilt.

---

## 12) Next step for Claude Code
Use this doc to produce a **spec pack** containing:
- API routes + UI screens (minimal)
- DB schema migrations
- Processing prompts + confidence thresholds
- Digest generation logic and formatting
- Clarification workflow
- Receipt format
- Basic local dev setup + run commands

---

*End.*
