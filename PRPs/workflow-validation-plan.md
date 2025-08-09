## OBJECTIVE:
Execute and validate the entire project lifecycle within the roofing software, from initial project creation via the web form to final completion. This prompt will serve as the complete blueprint for the task. The goal is to ensure the workflow is triggered automatically, tasks are generated and completed in the correct sequence, and the project progresses seamlessly through all phases without manual intervention.

## GLOBAL RULES & CONTEXT:
- **System Role:** You are an automated testing agent. Your sole focus is to execute the steps below and validate the outcomes against the expected results.
- **Proactive Analysis:** Think step-by-step. Before executing an action, anticipate the expected outcome based on the workflow logic. After execution, validate that the actual outcome matches the expected outcome.
- **Explicit Validation:** Do not assume any step has worked correctly. Each validation checkpoint must be explicitly confirmed.
- **Error Handling:** If an error occurs or a validation checkpoint fails, document the exact step, the expected outcome, and the actual outcome. Do not proceed to the next step unless the current one is successful.

---

### **EXECUTION PLAN: SIMULATING THE FULL PROJECT LIFECYCLE**

#### **PHASE 1: PROJECT INITIATION AND WORKFLOW TRIGGER**

- **Task 1.1: Create New Project**
    - **Action:** Navigate to the "My Projects" page. Locate and use the web form to enter a new project with the following data:
        - **Project Name:** `Complete Roof Replacement - 123 Main St`
        - **Client Name:** `John Doe`
        - **Address:** `123 Main St, Anytown, USA`
        - **Project Type:** `Residential Roofing`
    - **Validation Gate:**
        - Confirm the project is successfully created and appears in the project list.

- **Task 1.2: Validate Workflow Initiation**
    - **Action:** Open the details for the newly created project.
    - **Validation Gates:**
        1.  Verify that the project's status is automatically set to **"Lead"**.
        2.  Confirm that the first line item/task, **"Initial Client Consultation,"** is automatically generated in the task list.
        3.  Ensure this task is assigned to the default user/role for new leads.

#### **PHASE 2: TASK PROGRESSION AND SEQUENTIAL COMPLETION**

- **Task 2.1: Complete First Task**
    - **Action:** Locate the **"Initial Client Consultation"** task and mark it as **"Completed."**
    - **Validation Gate:**
        1.  Verify that the status of the **"Initial Client Consultation"** task is now "Completed".
        2.  Confirm that the *next* task in the sequence, **"Site Inspection & Measurement,"** is automatically generated.
        3.  Verify the project status remains in the "Lead" phase or progresses as defined by the workflow rules.

- **Task 2.2: Sequentially Complete All Tasks**
    - **Action:** For every subsequent task that is generated, immediately mark it as **"Completed."**
    - **Validation Gates (to be performed in a loop for each task):**
        1.  After completing a task, confirm its status changes to "Completed."
        2.  Verify that the next correct task in the workflow is immediately and automatically generated.
        3.  At each phase transition (e.g., from "Lead" to "Estimate," "Estimate" to "Contract"), confirm the overall project status updates correctly.

#### **PHASE 3: FINAL PHASE AND PROJECT COMPLETION**

- **Task 3.1: Complete Final Task**
    - **Action:** Continue the process until you reach the final task in the **"Completion"** phase (e.g., **"Final Invoice & Warranty"**). Mark this final task as **"Completed."**
    - **Validation Gate:**
        - Confirm the status of the final task is now "Completed."

- **Task 3.2: Validate Project Closure**
    - **Action:** Observe the project's state after the final task is completed.
    - **Validation Gates:**
        1.  Verify the project's overall status is automatically updated to **"Completed"** or **"Closed."**
        2.  Confirm that no new tasks are generated.
        3.  Ensure the project is now read-only or moved to an archived view, as per the system's design.

---

### **FINAL REPORT AND DELIVERABLE**

Generate a comprehensive report that outlines the results of the execution. The report must include:

1.  **Execution Summary:** A high-level statement confirming whether the end-to-end workflow was successful.
2.  **Workflow Log:** A step-by-step log detailing:
    - The name of each task generated.
    - The project phase at the time of generation.
    - A timestamp or sequence number for each action.
3.  **Validation Checklist:** A checklist of all validation gates, marked as "Pass" or "Fail."
4.  **Issues/Deviations:** A detailed description of any failures, including the task, the expected result, the actual result, and any error messages.