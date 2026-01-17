# Second Brain Deep Code Audit

## Files Analyzed
- AGENTS.md
- DESIGN_SYSTEM.md
- DEPLOYMENT.md
- README.md
- docs/DESKTOP_MIGRATION_PLAN.md
- eslint.config.js
- investigate_api_errors.py
- package-lock.json
- package.json
- packages/api/drizzle.config.ts
- packages/api/package.json
- packages/api/src/app.ts
- packages/api/src/db/index.ts
- packages/api/src/db/migrations/0000_concerned_fallen_one.sql
- packages/api/src/db/migrations/0001_steep_robin_chapel.sql
- packages/api/src/db/migrations/0002_smart_maddog.sql
- packages/api/src/db/migrations/0003_nice_iron_lad.sql
- packages/api/src/db/migrations/0004_zippy_prism.sql
- packages/api/src/db/migrations/0005_milky_human_fly.sql
- packages/api/src/db/migrations/0006_flowery_valkyrie.sql
- packages/api/src/db/migrations/0007_lowly_siren.sql
- packages/api/src/db/migrations/0008_fuzzy_sway.sql
- packages/api/src/db/migrations/0009_search_text_indexes.sql
- packages/api/src/db/migrations/0010_personal_contexts_unique_name.sql
- packages/api/src/db/migrations/meta/0000_snapshot.json
- packages/api/src/db/migrations/meta/0001_snapshot.json
- packages/api/src/db/migrations/meta/0002_snapshot.json
- packages/api/src/db/migrations/meta/0003_snapshot.json
- packages/api/src/db/migrations/meta/0004_snapshot.json
- packages/api/src/db/migrations/meta/0005_snapshot.json
- packages/api/src/db/migrations/meta/0006_snapshot.json
- packages/api/src/db/migrations/meta/0007_snapshot.json
- packages/api/src/db/migrations/meta/0008_snapshot.json
- packages/api/src/db/migrations/meta/0009_snapshot.json
- packages/api/src/db/migrations/meta/_journal.json
- packages/api/src/db/schema.ts
- packages/api/src/index.ts
- packages/api/src/jobs/processor.ts
- packages/api/src/llm/claude.ts
- packages/api/src/llm/index.ts
- packages/api/src/llm/provider.ts
- packages/api/src/llm/types.test.ts
- packages/api/src/llm/types.ts
- packages/api/src/middleware/auth.ts
- packages/api/src/middleware/error-handler.ts
- packages/api/src/routes/clarification.integration.test.ts
- packages/api/src/routes/context.ts
- packages/api/src/routes/digest.ts
- packages/api/src/routes/entities.ts
- packages/api/src/routes/health.ts
- packages/api/src/routes/ideas.api.test.ts
- packages/api/src/routes/inbox.ts
- packages/api/src/routes/jobs.ts
- packages/api/src/routes/nudges.ts
- packages/api/src/routes/process.ts
- packages/api/src/routes/receipts.ts
- packages/api/src/routes/search.api.test.ts
- packages/api/src/routes/search.db.test.ts
- packages/api/src/routes/search.integration.test.ts
- packages/api/src/routes/search.perf.test.ts
- packages/api/src/routes/search.test.ts
- packages/api/src/routes/search.ts
- packages/api/src/services/processor.test.ts
- packages/api/src/services/processor.ts
- packages/api/src/utils/response.ts
- packages/api/tsconfig.json
- packages/config/package.json
- packages/config/src/index.ts
- packages/config/src/prompts/classifier.ts
- packages/config/src/prompts/extractors.ts
- packages/config/src/prompts/index.ts
- packages/config/src/taxonomy.ts
- packages/config/src/thresholds.ts
- packages/config/tsconfig.json
- packages/shared/package.json
- packages/shared/src/index.ts
- packages/shared/src/taxonomy.ts
- packages/shared/src/types.ts
- packages/shared/src/validation.ts
- packages/shared/tsconfig.json
- packages/web/index.html
- packages/web/package.json
- packages/web/postcss.config.js
- packages/web/public/icon-192.png
- packages/web/public/icon-512.png
- packages/web/public/icon.svg
- packages/web/scripts/generate-icons.mjs
- packages/web/src/App.tsx
- packages/web/src/components/ErrorBanner.tsx
- packages/web/src/components/ErrorBoundary.tsx
- packages/web/src/components/Layout.tsx
- packages/web/src/components/LoadingSkeleton.tsx
- packages/web/src/components/Modal.tsx
- packages/web/src/components/Nudges.tsx
- packages/web/src/components/PWAPrompt.tsx
- packages/web/src/components/RouteErrorBoundary.tsx
- packages/web/src/components/TaskEditForm.tsx
- packages/web/src/hooks/useOfflineQueue.ts
- packages/web/src/hooks/usePWA.ts
- packages/web/src/hooks/useVoiceCapture.ts
- packages/web/src/index.css
- packages/web/src/lib/api.ts
- packages/web/src/lib/dateUtils.ts
- packages/web/src/lib/offlineQueue.test.ts
- packages/web/src/lib/offlineQueue.ts
- packages/web/src/lib/queries.ts
- packages/web/src/main.tsx
- packages/web/src/routes/Browse.tsx
- packages/web/src/routes/Capture.tsx
- packages/web/src/routes/Clarifications.tsx
- packages/web/src/routes/Digest.tsx
- packages/web/src/routes/Inbox.tsx
- packages/web/src/routes/Receipts.tsx
- packages/web/src/routes/Search.tsx
- packages/web/src/routes/Today.tsx
- packages/web/src/routes/WeeklyReview.tsx
- packages/web/src/sw.ts
- packages/web/src/types/speech-recognition.d.ts
- packages/web/src/vite-env.d.ts
- packages/web/tailwind.config.js
- packages/web/tsconfig.json
- packages/web/vite.config.ts
- pnpm-lock.yaml
- pnpm-workspace.yaml
- railway.toml
- second-brain-brief.md
- test_ui_comprehensive.py
- tsconfig.base.json
- tsconfig.json

## Findings

[PRIORITY-1] Broken project links from Today view

Location: packages/web/src/routes/Today.tsx:338

Symptom: Clicking a project in "Projects Needing Next Action" navigates to a non-existent route, resulting in a 404 or blank page.

Root Cause: The UI links to a route that isn’t registered in the router.
"href={`/projects/${project.id}`}`

Reproduction:
1) Open Today.
2) Scroll to "Projects Needing Next Action".
3) Click any project card.

Fix: Replace the anchor with the existing Browse deep link pattern, e.g. `href={`/browse?type=project&id=${project.id}`}` or add a `/projects/:id` route.

Severity: Medium

[PRIORITY-1] Broken project links from Digest view

Location: packages/web/src/routes/Digest.tsx:341

Symptom: Clicking a project in "Projects Needing Next Action" navigates to a non-existent route.

Root Cause: The UI links to a route that isn’t registered.
"href={`/projects/${project.id}`}`

Reproduction:
1) Open Digest.
2) Scroll to "Projects Needing Next Action".
3) Click any project card.

Fix: Replace the anchor with `href={`/browse?type=project&id=${project.id}`}` or implement a `/projects/:id` route.

Severity: Medium

[PRIORITY-1] Digest keeps completed tasks in "Next Actions" and "Stale Tasks"

Location: packages/web/src/routes/Digest.tsx:56

Symptom: Marking a task as completed (or otherwise non-active) in the digest modal leaves it visible in active task sections.

Root Cause: The local state update always maps in-place and never removes inactive tasks.
"nextActions: data.nextActions.map((t) => t.id === updated.id ? updated : t)"
"staleTasks: data.staleTasks.map((t) => t.id === updated.id ? updated : t)"

Reproduction:
1) Open Digest.
2) Open a task from Next Actions or Stale Tasks.
3) Mark it "Completed" in the modal.
4) Close the modal; the task remains listed.

Fix: When the updated task’s status is not "active", remove it from both arrays (or refresh digest) and adjust stats.

Severity: Medium

[PRIORITY-2] Today active task count stays wrong after completing a stale task

Location: packages/web/src/routes/Today.tsx:59

Symptom: Completing a task from the Stale Tasks list does not decrement the Active Tasks count.

Root Cause: The decrement only happens when the task was in nextActions, not when it only existed in staleTasks.
"const wasInNextActions = data.nextActions.some((t) => t.id === updated.id);"
"isNowInactive && wasInNextActions ? data.stats.activeTasks - 1 : data.stats.activeTasks"

Reproduction:
1) Open Today.
2) Open a task from Stale Tasks.
3) Mark it Completed.
4) Observe Active Tasks count unchanged.

Fix: Decrement activeTasks when a task transitions to non-active regardless of whether it was in nextActions or staleTasks.

Severity: Low

[PRIORITY-2] Today active task count stays wrong after deleting a task

Location: packages/web/src/routes/Today.tsx:141

Symptom: Deleting a task does not update the Active Tasks count.

Root Cause: The local state update removes items from lists but never updates stats.
"nextActions: data.nextActions.filter((t) => t.id !== editingTask.id)"
"staleTasks: data.staleTasks.filter((t) => t.id !== editingTask.id)"

Reproduction:
1) Open Today.
2) Delete any active task from the modal.
3) Active Tasks count does not change.

Fix: Decrement stats.activeTasks when deleting an active task (or refetch digest).

Severity: Low

[PRIORITY-1] Browse deep link fails when current filters hide the target

Location: packages/web/src/routes/Browse.tsx:357

Symptom: Opening a search result sometimes fails to open the edit modal, depending on active filters.

Root Cause: The deep-link logic searches filtered lists instead of the raw list.
"const task = taskList.find((t) => t.id === id);"
"const project = projectList.find((p) => p.id === id);"

Reproduction:
1) In Browse, set filters that exclude a known task.
2) Open Search and click that task result (navigates to `/browse?type=task&id=...`).
3) Browse opens but does not open the modal.

Fix: Lookup against `rawTaskList`/`rawProjectList` (unfiltered), or temporarily clear filters when handling deep links.

Severity: Low

[PRIORITY-1] Search error message persists after clearing the query

Location: packages/web/src/routes/Search.tsx:43

Symptom: If a search fails, clearing the query leaves the error banner visible even with an empty search box.

Root Cause: On empty queries, the effect exits without resetting the error state.
"if (!debouncedQuery.trim()) { setResults([]); setTotal(0); return; }"

Reproduction:
1) Search for a term while the API is down to trigger an error.
2) Clear the search input.
3) Error banner remains visible.

Fix: Clear error (and optionally loading) when `debouncedQuery` is empty.

Severity: Low

[PRIORITY-1] Service worker misses API requests when VITE_API_URL is unset

Location: packages/web/src/sw.ts:12

Symptom: Offline caching and background sync for API calls do not work in the default setup (no `VITE_API_URL`), because the SW does not recognize cross-origin API requests.

Root Cause: The SW defaults `API_ORIGIN` to `self.location.origin`, while the client defaults API requests to `http://localhost:3001`.
"const API_BASE = import.meta.env.VITE_API_URL || "";"
"const API_ORIGIN = API_BASE ? new URL(API_BASE).origin : self.location.origin;"

Reproduction:
1) Run the app without `VITE_API_URL`.
2) The frontend sends API requests to `http://localhost:3001`.
3) The SW fails to match them in `isApiRequest`, so offline caching/sync doesn’t apply.

Fix: Align the SW default with the client default (e.g., `const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";`).

Severity: Medium

## Route State Verification
- Capture: Loading N/A; Error present; Empty N/A; Success present
- Inbox: Loading present; Error present; Empty present; Success present
- Today: Loading present; Error present; Empty present; Success present
- Browse: Loading present; Error present; Empty present; Success present
- Clarifications: Loading present; Error present; Empty present; Success present
- Receipts: Loading present; Error present; Empty present; Success present
- Search: Loading present; Error present; Empty present; Success present
- Digest: Loading present; Error present; Empty present; Success present
- WeeklyReview: Loading present; Error present; Empty present; Success present

## Summary Table (By Severity)
| Severity | Bug | Location |
| --- | --- | --- |
| Medium | Broken project links from Today view | packages/web/src/routes/Today.tsx:338 |
| Medium | Broken project links from Digest view | packages/web/src/routes/Digest.tsx:341 |
| Medium | Digest keeps completed tasks in active sections | packages/web/src/routes/Digest.tsx:56 |
| Medium | Service worker misses API requests when VITE_API_URL is unset | packages/web/src/sw.ts:12 |
| Low | Today active task count stays wrong after completing a stale task | packages/web/src/routes/Today.tsx:59 |
| Low | Today active task count stays wrong after deleting a task | packages/web/src/routes/Today.tsx:141 |
| Low | Browse deep link fails when current filters hide the target | packages/web/src/routes/Browse.tsx:357 |
| Low | Search error message persists after clearing the query | packages/web/src/routes/Search.tsx:43 |
