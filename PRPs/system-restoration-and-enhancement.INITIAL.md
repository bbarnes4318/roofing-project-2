# PR Plan: System Restoration and Enhancement (Initial)

## Summary
Stabilize the app end-to-end (build → deploy → runtime) and implement targeted enhancements that harden critical flows (Projects, Workflow, Alerts, Messages). This plan prioritizes fast restoration with incremental, verifiable improvements while preserving existing data and UX.

## Objectives
- Restore a clean, reproducible build and deployment pipeline.
- Ensure “My Projects” and Dashboard load reliably with consistent workflow data.
- Guarantee workflow progress and alert generation function from start to finish.
- Introduce project-specific chat with real data plumbing, ready for gradual rollout.

## Scope
- Frontend (React, React Query, UI/UX polish)
- Backend (Express, Prisma, PostgreSQL)
- Data (seed/reset safety, workflow readiness, alert generation)
- DevOps (local env commands, CI/CD health)

## Immediate Restoration Actions (P0)
1. Build Stability
   - Fix JSX/root structure errors and linter blockers (done for ProjectsPage.jsx).
   - Enforce prebuild lint/type checks; fail-fast on CI.

2. Runtime Crash Prevention
   - Standardize workflow helpers usage (project-id keyed) to prevent undefined access (done for ProjectsPage.jsx).
   - Defensive selects on Queries (normalize API responses to arrays consistently).

3. Workflow Readiness
   - Script to ensure each project has: ProjectWorkflow, Tracker pointing to first line item, and an initial alert (added `server/scripts/ensure-workflow-readiness.js`).
   - Adjust alert creation to respect FK constraints (map line item ids correctly before emitting alerts).

4. Navigation Reliability
   - Verify Dashboard → Project Detail → back transitions preserve state and never blank.
   - Normalize “scrollToProjectId” highlighting and guard for missing DOM.

## Enhancements (P1)
1. Projects by Phase UI Consistency
   - Uniformize phase buttons widths (done: w-32), keep All as exception.

2. Project-Specific Chat (Phase 1)
   - Backend: existing `/api/project-messages` routes available.
   - Frontend: add API client + hooks (done) and wire into Project Detail “Messages” tab.
   - Real-time: join `project_<projectId>` Socket.IO rooms (Phase 2).

3. Alerts Reliability & Performance
   - Batch generation respects current tracker’s line item, avoids FK errors.
   - Soft-dismiss/complete state to prevent duplication.

4. Safe Seeding & Data Tools
   - Keep destructive `seed.js` for local only; use `seed-safe.js` for prod-like.
   - Document reset scripts and environment flags.

## Non-Goals (Initial)
- Broad redesigns, multi-tenant features, advanced permissions.
- Binary upload pipeline for chat; use URLs initially.

## Risks & Mitigations
- Foreign key violations on alerts/messages → pre-validate ids; wrap in transactions.
- Inconsistent workflow structures → add “check-workflow-phases” verification script to CI.
- Socket room not joined → guard and join on mount; degrade gracefully to polling.

## Rollout Strategy
1. P0 Restoration merged and deployed immediately.
2. P1 Enhancements behind minimal feature flags where risky (e.g., PROJECT_CHAT_ENABLED).
3. Observe logs and metrics for error rates; expand chat real-time after 24–48h stable.

## Testing Plan
- Unit: workflow helpers, API clients (messages, alerts).
- Integration: project list → detail → workflow/alerts/messages; alert generation on step completion.
- E2E: seed 3+ projects; verify navigation, chat creation, and alert lifecycle.

## Metrics / SLOs
- Build success rate ≥ 99%.
- App error rate < 0.5% of requests.
- Time-to-interactive on Dashboard < 2.5s local.
- Message post success ≥ 99% (5xx < 1%).

## Timeline (Initial)
- Day 0–1: P0 fixes, workflow readiness, deploy.
- Day 1–2: Wire chat UI to APIs in Project Detail; verify pagination and send.
- Day 2–3: Socket room join + live updates; alert FK fix; polish.

## Work Items
- [ ] Backend: Fix alert creation FK mapping (use tracker.currentLineItemId for stepId).
- [ ] Backend: Add health route for workflow/phase integrity.
- [ ] Frontend: Wire Project Detail → useProjectMessages hooks and composer.
- [ ] Frontend: Socket join/leave for `project_<id>` (Phase 2); typing indicator optional.
- [ ] CI: Prebuild lint and schema check; add workflow integrity check script.
- [ ] Docs: Update PostgreSQL setup and reset instructions.

## Acceptance Criteria
- Build and deploy succeed with zero critical runtime errors.
- “My Projects” and Dashboard render consistently with workflow progress and phase badges.
- Alerts generate and transition (ACTIVE → COMPLETED/DISMISSED) without DB errors.
- Project chat: user can load recent messages and send a new message successfully.

## FEATURE:
Execute a full-stack, system-wide restoration and enhancement. This operation will fix all known critical bugs, repair data integrity issues, overhaul core UI functionality, and implement visual design improvements in a single, unified effort.

## PROBLEM CONTEXT:
The application is suffering from a cascade of failures across the backend, frontend, and data layers. Core user workflows are broken, data is missing or incorrect, and the UI is inconsistent and buggy. This plan provides a comprehensive, step-by-step blueprint to bring the application to a fully functional, stable, and polished state.

## TASK - EXECUTION BLUEPRINT:
You are to execute the following three phases in the precise order listed. Do not proceed to the next phase until the current one is fully complete and validated.

---

### --- PHASE 1: CORE BACKEND AND DATA INTEGRITY REPAIR ---

Your first priority is to fix the foundational data and backend services.

1.  **Fix Critical Alert Generation:**
    * **Action:** The alert system is completely non-functional. Investigate `server/services/AlertGenerationService.js`. The logic that triggers alerts upon task completion is broken.
    * **Validation:** Manually complete a task and confirm that a new, correct alert is immediately created in the `Alerts` database table.

2.  **Fix "2nd Supplement" Phase Data:**
    * **Action:** The "2nd Supplement" phase on the workflow page is empty. The data import script is failing to parse or insert its line items from `project-workflow.csv`. Fix the data pipeline.
    * **Validation:** The "2nd Supplement" phase must display all of its correct sections and line items in the UI.

3.  **Fix "Unknown Project" Message Bug:**
    * **Action:** Messages are showing "Unknown Project". The API endpoint in `server/routes/projectMessages.js` is failing to join the `messages` table with the `projects` table. Fix the query to include the `projectName`.
    * **Validation:** Messages must display the correct, assigned project name.

---

### --- PHASE 2: CORE UI FUNCTIONALITY & WORKFLOW OVERHAUL ---

With the backend stable, you will now repair the core user workflow.

1.  **Overhaul the Workflow Page UI:**
    * **Action:** Refactor the workflow page (`src/components/workflow/WorkflowView.jsx`).
        1.  **Implement Collapsible UI:** It must now load with all phases **collapsed** by default. Clicking a phase header must toggle its contents.
        2.  **Implement Deep-Linking:** The page must read a line item ID from a URL parameter (e.g., `?highlight_item=xyz`), then automatically expand the correct phase/section and scroll to and highlight that item.
        3.  **Standardize Phase Colors:** Import and use a centralized color map (e.g., from `src/data/constants.js`) to ensure the phase colors on this page match the rest of the application.
        4.  **Remove Debug Text:** Delete the stray debug text (`Phases Loaded: 6...`) from the component.
    * **Validation:** The workflow page must be collapsed by default, support deep-linking, and be visually correct.

2.  **Validate Workflow Check-off and Alert Trigger:**
    * **Action:** Now, test the full loop. Programmatically check off the first line item in the workflow.
    * **Validation:** You must confirm this single action causes a chain reaction: the UI updates with a checkmark and strikethrough, the database status for that item is updated, AND (critically) a new alert for the *next* user in the workflow is immediately generated.

---

### --- PHASE 3: DASHBOARD REFINEMENT AND VISUAL POLISH ---

Finally, with all core functionality restored, you will fix the remaining dashboard UI issues.

1.  **Fix Project Progress Bars:**
    * **Action:** The progress bars in the "Current Projects by Phase" section are stuck at 0%. Diagnose the calculation logic in `server/services/ProjectProgressService.js` and the rendering logic in `src/components/ui/UnifiedProgressTracker.jsx`.
    * **Validation:** Progress bars must show the correct completion percentage.

2.  **Redesign and Fix Phase Containers:**
    * **Action:** In `src/components/dashboard/ProjectCubes.jsx`:
        1.  Refactor the six phase containers at the top of the section. They must have uniform, larger dimensions, and larger text/circles.
        2.  Fix the "Project Workflow" buttons within these containers so they use the new deep-linking functionality created in Phase 2.
    * **Validation:** The phase containers must be visually appealing, consistent, and their buttons must link directly to the current workflow task.

3.  **Improve UX and Navigation:**
    * **Action:**
        1.  Ensure the section header ("Current Projects by Phase") remains visible even when a user clicks a phase with zero projects.
        2.  Restore the missing "Back" button to the "My Projects" page cubes.
        3.  Ensure the browser's back button returns the user to their previous context correctly.
    * **Validation:** The application's navigation must feel intuitive, predictable, and free of dead ends.