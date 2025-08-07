## FEATURE:
Execute a full-stack audit and correction to fix critical data integrity issues with the project phases. This task involves removing incorrect phases and ensuring a single, consistent source of truth is reflected across the database, backend, and frontend.

## PROBLEM CONTEXT:
There is a major data inconsistency in our project phases that is corrupting user workflows and killing the application's reliability. The database and application contain incorrect and phantom phases ("Invoicing", "Prospect: Non-Insurance Phase") that must be completely eradicated.

## THE SINGLE SOURCE OF TRUTH:
The application must ONLY recognize and use the following six phases in this exact order:
1.  **Lead**
2.  **Prospect**
3.  **Approved**
4.  **Execution**
5.  **2nd Supplement**
6.  **Completion**

## TASK - EXECUTION BLUEPRINT:
You are to execute a precise, four-step process to permanently fix this data integrity issue.

1.  **Database Correction (The Source of Truth):**
    * **Action:** Your first and most critical action is to fix the data at its source.
        1.  Analyze the database schema (`prisma/schema.prisma`) to find where the `Phase` enum or table is defined.
        2.  Write and execute a migration script to **permanently delete** the "Invoicing" and "Prospect: Non-Insurance Phase" from the database schema.
        3.  Update any existing project records in the database that are incorrectly assigned to these phantom phases. Re-assign them to a logical default phase (e.g., "Lead").
    * **Validation:** After the migration, run a query to confirm that only the six official phases exist in the schema and no projects are assigned to the deleted phases.

2.  **Backend Codebase Alignment:**
    * **Action:** Perform a global, case-sensitive search across the entire backend codebase (`server/`) for any references to "Invoicing" or "Prospect: Non-Insurance Phase".
    * **Validation:** Remove or refactor any logic, validation rules, or API endpoints that are dependent on the now-deleted phases. Ensure all backend services exclusively use the six official phases.

3.  **Frontend Codebase Alignment:**
    * **Action:** Perform a global, case-sensitive search across the entire frontend codebase (`src/`) for any references to the incorrect phases.
    * **Validation:** Remove the incorrect phases from any UI components, state management stores (e.g., Redux, Zustand), dropdowns, filters, or hardcoded arrays. Specifically target the `Project Workflow` tab to ensure its data source is now clean.

4.  **Final System-Wide Verification:**
    * **Action:** After all code and database changes are complete, restart the application.
    * **Success Criterion:** Navigate directly to the Project Workflow section. Confirm that the UI displays **only** the six official phases, in the correct order, and that the application is stable with no new errors in the console.