# Second Brain - Agent Architecture

This document tracks how AI agents interact with the application and evolves as we build.

---

## Current State (Post-Migration Core Complete)

### CopilotKit + AG-UI Runtime (Phases 0-5)

```
User Action
    ↓ 
CopilotKit Provider (React)
    ↓
AG-UI Endpoints (POST /agui/run + /copilotkit)
    ↓
Model Router (OpenAI/Anthropic/Google/Vertex-ready)
    ↓
AG-UI Events (RUN_STARTED, TOOL_CALL_*, STATE_DELTA, TEXT_MESSAGE_CONTENT, RUN_FINISHED)
    ↓
Static UI + Declarative Agent Panels + Human-in-the-loop actions
```

**Current Limitations:**
- Vertex-backed credentials still need environment validation in this workspace.

---

## Target State (Post-Migration)

### CopilotKit + AG-UI Architecture

```
User Action
    ↓
CopilotKit Provider (React)
    ↓
AG-UI Event Stream ←→ CopilotRuntime (Backend)
    ↓                       ↓
useAgent Hook          Gemini Flash (fast UI generation)
    ↓                       ↓
CopilotKit Components   A2UI Declarative Spec
    ↓
Rendered UI
```

**Benefits:**
- Fast (<500ms with Gemini Flash)
- Bidirectional (agent can respond to user actions)
- Rich component vocabulary (A2UI catalog)
- Standard protocol (works with LangGraph, Mastra, etc.)

---

## Key Concepts

### AG-UI Events

AG-UI defines typed events for agent ↔ UI communication:

| Event | Direction | Purpose |
|-------|-----------|---------|
| `RUN_STARTED` | Agent → UI | Agent begins processing |
| `TEXT_MESSAGE_CONTENT` | Agent → UI | Streaming text response |
| `TOOL_CALL_START` | Agent → UI | Agent invoking a tool |
| `TOOL_CALL_END` | Agent → UI | Tool execution complete |
| `STATE_DELTA` | Both | State synchronization |
| `RUN_FINISHED` | Agent → UI | Agent done processing |

### A2UI Components

A2UI provides a vocabulary of UI primitives:

- **Cards**: Structured content blocks
- **Lists**: Collections of items
- **Forms**: Input collection
- **Actions**: Buttons, links
- **Media**: Images, video
- **Charts**: Data visualization
- **Widgets**: Custom interactive elements

### Model Routing

Different tasks use different models:

| Task | Model | Why |
|------|-------|-----|
| UI spec generation | Gemini Flash | Structured JSON, speed matters |
| Complex reasoning | Claude | Quality matters more than speed |
| Simple queries | Gemini Flash | Cost-effective |

---

## Migration Phases

See bead `sb-r8k4` for full details.

1. **Phase 0**: Remove existing custom generative UI
2. **Phase 1**: CopilotKit POC (validate approach)
3. **Phase 2**: Full AG-UI transport migration
4. **Phase 3**: A2UI declarative components
5. **Phase 4**: Gemini Flash integration
6. **Phase 5**: Bidirectional interactions

---

## Learning Log

_As we implement, key learnings will be documented here._

### [2026-02-07] - Phase 0: Cleanup
- Files removed:
  - `packages/web/src/components/generative/*`
  - `packages/web/src/hooks/useGenerativeUI.ts`
  - `packages/web/src/lib/settings.ts`
  - `packages/api/src/llm/ui-spec.ts`
  - `packages/api/src/llm/ui-spec.test.ts`
  - `packages/api/src/llm/prompts/ui-generation.ts`
  - `packages/api/src/llm/tools/digest.ts`
  - `packages/api/src/llm/tools/browse.ts`
  - `packages/api/src/llm/tools/clarification.ts`
  - `packages/api/src/routes/*stream.api.test.ts` (digest/browse/clarification)
- Lessons:
  - Removing the feature toggle first simplified route/component cleanup.
  - Keeping static UI intact prevented product regressions while deleting speculative UI-spec code.

### [2026-02-07] - Phase 1: CopilotKit POC (Complete)
- Integration notes:
  - Added CopilotKit provider in the web app and backend `/copilotkit` runtime route.
  - Kept AG-UI `useAgent` hooks on Today/Browse/Clarifications for direct event-driven page assistance.
- Gotchas:
  - CopilotKit UI package (`@copilotkit/react-ui`) created oversized web bundles; headless provider integration avoided this.
  - Existing API TypeScript issues unrelated to migration still block full API build.

### [2026-02-07] - Phase 2: AG-UI Transport
- Integration notes:
  - All three target pages now consume AG-UI events through `useAgent`.
  - Custom stream endpoints (`/digest/stream`, `/browse/stream`, `/clarifications/:id/stream`) were removed.
- Lessons:
  - A single unified `/agui/run` endpoint reduced duplicated stream code and page complexity.

### [2026-02-07] - Phase 4: Gemini-Capable Routing
- Integration notes:
  - Added Google key detection (`GOOGLE_GENERATIVE_AI_API_KEY` or `GEMINI_API_KEY`).
  - Added `@ai-sdk/google` and `@ai-sdk/google-vertex` with routing support in `llm/streaming.ts`.
- Lessons:
  - Keeping routing centralized made Gemini integration low-touch for feature routes.

### [2026-02-07] - Phase 3: Declarative Components (A2UI-inspired)
- Integration notes:
  - Added `STATE_DELTA` emission and A2UI-style declarative blocks (cards/lists/actions) from `/agui/run`.
  - Added shared renderer `packages/web/src/components/agent/DeclarativePanel.tsx`.
- Lessons:
  - A lightweight declarative schema gives richer UI intents without reintroducing a heavy custom UISpec stack.

### [2026-02-07] - Phase 5: Bidirectional Interactions
- Integration notes:
  - Added interaction payload support in `useAgent` and `/agui/run`.
  - Clarifications now supports a user-triggered `draft_answer` loop with agent `STATE_DELTA` syncing answer drafts into form state.
- Lessons:
  - Bidirectional behavior was easiest to validate with a narrow, high-friction workflow (clarifications) before broader rollout.
