# PROJECT REQUIREMENTS PLAN (PRP)
## Fix Project Message Display

---

## 1. EXECUTIVE SUMMARY

**Project Name**: Fix Project Message Display

**Purpose**: Stabilize the application, restore core data flows, and repair dependent features for "Fix Project Message Display".

**Scope**:
- Application stabilization (halt render/network loops)
- Core data pipeline restoration (projects, assignments)
- Dependent features repair (user assignment, roles)

---

## 2. PROBLEM STATEMENT

When a message is associated with a specific project, the UI fails to retrieve and display the correct project name, showing "Unknown Project" instead. This indicates a failure in the data lookup between the message and the project it belongs to.

---

## 3. SOLUTION PLAN

Detailed multi-phase repair plan is provided in the attached initial blueprint.

---

## 4. ACCEPTANCE CRITERIA

- The application is stable, core data loads correctly, and user-facing features function without errors.

---

## 5. NON-FUNCTIONAL REQUIREMENTS

- Performance: Page load stable and responsive (<2s typical)
- Reliability: No infinite loops or runaway requests after fix
- Observability: Logs and metrics available to confirm stability

---

## 6. RISKS AND MITIGATIONS

- Risk: Regression during stabilization
  - Mitigation: Stage fixes, verify after each phase
- Risk: Data integrity issues
  - Mitigation: Validate API/store/render paths end-to-end
- Risk: Hidden coupling causes re-loop
  - Mitigation: Memoization, decoupled effects, equality guards

---

## 7. DELIVERABLES

- Stable application with loops eliminated
- Restored project data flows across API, state, and UI
- Functional user assignment and roles screens
- Validation notes and before/after evidence (HAR/logs)

---

## 8. EXECUTION NOTES

- Prioritize halting loops before functional repairs
- Instrument network and state transitions for visibility
- Validate each phase explicitly before proceeding

---

## 9. TIMELINE

- Phase 1 (Stabilize): 1-2 hours
- Phase 2 (Restore Core Data): 1-2 hours
- Phase 3 (Repair Dependents): 1 hour

---

## 10. ATTACHED INITIAL BLUEPRINT

> Source: fix-project-message-display.INITIAL.md


## FEATURE:
Diagnose and fix the bug in the "My Project Messages" section causing assigned project names to display incorrectly as "Unknown Project."

## PROBLEM CONTEXT:
When a message is associated with a specific project, the UI fails to retrieve and display the correct project name, showing "Unknown Project" instead. This indicates a failure in the data lookup between the message and the project it belongs to.

## TASK - EXECUTION BLUEPRINT:

1.  **Backend Investigation:**
    * **Action:** The root cause is likely in the backend. Investigate the API endpoint that fetches messages, likely defined in `server/routes/projectMessages.js`. The query is probably not correctly joining the `messages` table with the `projects` table to include the project's name in the response.
    * **Validation:** The API response for a message must include the correct `projectName`.

2.  **Frontend Component Fix:**
    * **Action:** Once the backend is sending the correct data, ensure the frontend component responsible for rendering the message card, likely `src/components/ui/ProjectMessagesCard.jsx`, is accessing and displaying the `projectName` field from the API response.
    * **Validation:** Send a new message linked to the 'Jim Bob' project and confirm that the correct project name appears in the message list, not "Unknown Project."

---

*Document Generated: 2025-08-08*
