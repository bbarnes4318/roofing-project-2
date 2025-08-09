## FEATURE:
Execute a full-stack, end-to-end validation of the project workflow system. This test will verify data integrity, UI functionality, and the critical integration that triggers an alert to the next responsible user upon task completion.

## PROBLEM CONTEXT:
We must ensure that the entire workflow—from the data structure to the user-facing check-off action and the subsequent alert generation—is functioning perfectly. Any failure in this chain breaks the core functionality of the application.

## TASK - EXECUTION BLUEPRINT:
You are to execute a precise, three-phase validation process. This is an integration test, so you must verify the behavior of the full application stack at each step.

### --- PHASE 1: DATA INTEGRITY VERIFICATION ---

Before testing functionality, you must verify that the workflow structure is correct.

1.  **Establish Source of Truth:**
    * **Action:** Use the `project-workflow.csv` and `project-phases.txt` files as the absolute source of truth for the correct phases, sections, and line items.
    * **Validation:** Write a script to parse these files and compare them against the data in the production database. Report any discrepancies (missing/extra phases, sections, or line items).

### --- PHASE 2: UI AND STATE FUNCTIONALITY TEST ---

Next, verify that the user-facing check-off mechanism works correctly.

1.  **Simulate User Interaction:**
    * **Action:** Programmatically navigate to a test project's workflow page. Select the first incomplete line item.
    * **Task:** Simulate a user clicking the checkbox to mark it as complete.

2.  **Validate UI and Database State:**
    * **Action:** After the simulated click, perform two checks:
        1.  **Frontend:** Confirm that the UI updates instantly. The checkbox must show a checkmark, and the line item text must have a strikethrough. The relevant component is likely `src/components/workflow/WorkflowView.jsx`.
        2.  **Backend:** Immediately query the database to confirm that the `isComplete` status (or similar) for that specific line item has been set to `true`.
    * **Validation:** Both the UI and the database must reflect the "complete" state.

### --- PHASE 3: BACKEND AND ALERT TRIGGER VALIDATION ---

This is the most critical integration test. Verify that completing a task correctly triggers the next alert.

1.  **Investigate the Completion Handler:**
    * **Action:** The core logic for this is likely in `server/services/WorkflowCompletionHandler.js`. Analyze this service to understand how it's supposed to work. It should handle updating the task status and then call the alert generation service.

2.  **Verify Alert Generation:**
    * **Action:** Immediately after you have confirmed the line item is marked as complete in the database (from Phase 2), query the `Alerts` table in the database.
    * **Success Criterion:** A **new alert record must have been created**.

3.  **Validate the New Alert's Data:**
    * **Action:** Inspect the data of the newly created alert record.
    * **Validation:** You must confirm three things:
        1.  The alert is linked to the **next sequential line item** in the workflow.
        2.  The alert's `userId` or `roleId` is set to the user or role responsible for that **next line item**.
        3.  The alert's status is "unread" or "active."

## FINAL SUCCESS CRITERION:
To consider this test a success, you must successfully demonstrate and document the full, uninterrupted chain of events:
A user checks off Line Item A -> The UI updates instantly -> The database record for Line Item A is marked complete -> A new alert is immediately created in the database for the user responsible for Line Item B.