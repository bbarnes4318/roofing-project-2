## FEATURE:
Execute a system-wide triage and critical repair to address a cascade of failures that have rendered the application unusable. This is a top-priority, multi-stage operation.

## PROBLEM CONTEXT:
The application is in a critical state. Previous fixes have failed. The current state is:
1.  A persistent network request loop still exists, causing the UI to go blank after approximately 15 seconds. (`shit.app.har` is provided as evidence).
2.  **Core data is broken:** Project data is NOT loading anywhere in the application.
3.  **Dependent features are broken:** User data loads, but assigning a user to a project fails. The Settings->Role screen is non-functional.

This is a cascading failure. The render loop must be stopped first, then the core data pipeline must be restored, and finally, the dependent features can be fixed.

## TASK - THREE-PHASE REPAIR BLUEPRINT:

### --- PHASE 1: STABILIZE THE APPLICATION (STOP THE LOOP) ---

Your first and only priority is to stop the render loop and prevent the screen from going blank.

1.  **Deep Network Analysis:**
    * **Action:** Analyze the provided `shit.app.har` file. Identify the remaining requests that are still looping. Trace the "Initiator" call stack to the precise React component and `useEffect` hook causing the loop.
    * **Validation:** Document the exact file and line number that is the source of the remaining loop.

2.  **Implement a "Hard Stop" Fix:**
    * **Action:** Go to the identified `useEffect` hook. Implement the most robust fix possible to stop the loop. This may involve:
        * Using `useRef` to create a flag that ensures the fetch only ever runs once (e.g., `if (hasFetched.current) return;`).
        * Aggressively memoizing every dependency with `useMemo` and `useCallback`.
    * **Validation:** The application **must** load and remain stable without going to a blank screen. The network request loop **must** be completely gone.

### --- PHASE 2: RESTORE THE CORE DATA PIPELINE (FIX PROJECTS) ---

Once the application is stable, you must fix the broken project data.

1.  **Diagnose the Data Failure:**
    * **Action:** Investigate the entire data pipeline for projects, from the API call to the state management store and the component render.
    * **Check the API:** Use `curl` or a similar tool to hit the `GET /api/projects` endpoint directly. Does it return data, or does it return an error?
    * **Check State Management:** If the API returns data, investigate the Redux/Zustand store. Is the data making it into the store correctly? Check the reducers and actions for any errors.
    * **Check the Component:** If the data is in the store, investigate the component that is supposed to render the projects. Is it correctly selecting the data from the store? Is there a rendering error?

2.  **Implement the Fix:**
    * **Action:** Based on your diagnosis, implement the necessary fix to get project data flowing correctly from the database to the UI.
    * **Validation:** Project data **must** now be visible and correct throughout the application.

### --- PHASE 3: REPAIR CONSEQUENTIAL BREAKAGES ---

Now that the core data is restored, fix the features that were broken as a result.

1.  **Fix Project/User Assignment:**
    * **Action:** Go to the "Add Project" workflow. The error that occurred when assigning a user was likely because the project data was not available.
    * **Validation:** Create a new project, assign a user, and successfully submit the form without any errors.

2.  **Fix the Roles Screen:**
    * **Action:** Go to the "Settings > Role" screen. The inability to assign a user was also likely caused by the underlying data failures.
    * **Validation:** Successfully assign a user to a role. The change must persist after a page refresh.

## FINAL SUCCESS CRITERION:
The application must be stable, all core data must load correctly, and all user-facing interactive elements that were broken must now be fully functional.