## FEATURE:
Execute a full-stack, case-insensitive find-and-replace to ensure terminology consistency. The term "Product Manager" must be eradicated from the entire application—including the codebase and the production database—and replaced with "Project Manager".

## PROBLEM CONTEXT:
The application inconsistently uses the term "Product Manager" in UI text, comments, variable names, and, critically, in database records. This creates confusion and unprofessionalism. A partial fix is insufficient; the change must be atomic across the entire system.

## TASK - EXECUTION BLUEPRINT:
You are to execute a precise, four-step process to fix this inconsistency everywhere.

1.  **Codebase Search (Find All Instances):**
    * **Action:** Perform a **case-insensitive** search across the **entire project directory** for the string "Product Manager".
    * **Validation:** Generate a comprehensive list of all files containing this string to serve as your code modification checklist.

2.  **Database Analysis (Find All Instances):**
    * **Action:** Write and execute a SQL query to inspect the database schema. Identify all tables and columns that could possibly contain the string "Product Manager" (e.g., `roles`, `job_titles`, `notes`, `descriptions`).
    * **Validation:** Generate a list of all table/column pairs that contain the incorrect term.

3.  **Full-Stack Replacement (Execute the Change):**
    * **Code:** For every file on your checklist, replace every instance of "Product Manager" (regardless of case) with "Project Manager". Ensure casing is preserved (e.g., "productManager" becomes "projectManager").
    * **Database:** Write and execute a SQL `UPDATE` script to replace all instances of "Product Manager" with "Project Manager" in the database columns you identified.

4.  **Final Verification (Confirm Zero Instances):**
    * **Codebase Check:** Run a new case-insensitive global search for "Product Manager". It **must** return zero results.
    * **Database Check:** Re-run your database search query from step 2. It **must** return zero results.
    * **System Check:** The application must build and run without any new errors.