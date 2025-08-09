## FEATURE:
Overhaul the workflow completion UI to fix a critical bug where the visual state does not update correctly when users complete tasks. This fix is essential for core application functionality.

## PROBLEM CONTEXT:
The project workflow section is currently broken. When a user clicks a checkbox to mark a line item as complete, the UI fails to provide clear, persistent visual feedback. This leaves users confused about whether their action was successful. The system must be updated to provide immediate and hierarchical visual confirmation of completion.

## TASK - EXECUTION BLUEPRINT:
Your task is to implement a robust, three-tiered visual feedback system for task, section, and phase completion.

1.  **Line Item Completion Logic:**
    * **Action:** When a user clicks the checkbox for a single line item, implement the following state changes:
        1.  The checkbox must display a persistent checkmark icon (e.g., ✅).
        2.  The text of that line item must have a strikethrough decoration applied to it (e.g., `line-through`).
    * **Validation:** Confirm that this state persists even after a page refresh.

2.  **Section Completion Logic (Hierarchical):**
    * **Action:** After a line item's state changes, trigger a function that checks if **all** other line items within the same "section" are also complete.
    * **Conditional Styling:** If all tasks in a section are complete, dynamically apply a strikethrough text decoration to the **section's name**.
    * **Validation:** Create a test scenario where you complete the last remaining task in a section and confirm the section name gets a strikethrough. Then, un-check one task and confirm the strikethrough is removed.

3.  **Phase Completion Logic (Top-Level Hierarchy):**
    * **Action:** After a section's state changes, trigger a function that checks if **all** other sections within the same "phase" are also complete.
    * **Conditional Styling:** If all sections in a phase are complete, dynamically apply a strikethrough text decoration to the **phase's name**.
    * **Validation:** Create a test scenario where you complete the last task in the last section of a phase and confirm the phase name gets a strikethrough.

## TECHNICAL CONTEXT:
- **Primary Component:** The logic and UI for this feature are likely located within `src/components/workflow/WorkflowView.jsx` or a similar component responsible for rendering the task list.
- **State Management:** The completion status of tasks is likely managed by a state management library (e.g., Redux, Zustand) or React's `useState`/`useReducer`. Your changes must correctly update this state to ensure persistence.