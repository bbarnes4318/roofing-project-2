## FEATURE:
Perform a global, case-insensitive find-and-replace to ensure terminology consistency across the entire codebase. The term "Product Manager" must be completely removed and replaced with "Project Manager".

## PROBLEM CONTEXT:
The application codebase inconsistently uses the term "Product Manager" in various places, including UI text, comments, and variable names. The correct and official title for this role in our system is "Project Manager." This task is critical to maintain professional and consistent language throughout the application.

## TASK - EXECUTION BLUEPRINT:
You are to execute a precise, three-step process to eradicate the incorrect term.

1.  **Global Search (Find All Instances):**
    * **Action:** Perform a **case-insensitive** search across the **entire project directory** for the string "Product Manager".
    * **Validation:** Generate a list of all files containing this string. This will serve as your checklist.

2.  **Global Replace (Execute the Change):**
    * **Action:** For every file identified in the previous step, replace every single instance of "Product Manager" (regardless of case) with the string "Project Manager".
    * **Constraint:** Ensure the casing of the new term matches the context. For example, if you find "product Manager", it should become "Project Manager".

3.  **Final Verification (Confirm Zero Instances):**
    * **Action:** After the replacement is complete, run a new case-insensitive global search for the string "Product Manager".
    * **Success Criterion:** The search must return **zero** results. This is the only way to confirm the task is complete. The build must also complete without any new errors introduced by the changes.