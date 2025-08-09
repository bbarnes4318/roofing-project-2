## FEATURE:
Perform a definitive root cause analysis and implement a permanent fix for a catastrophic performance bug causing an infinite network request loop. Previous fix attempts have failed. This is the final attempt.

## PROBLEM CONTEXT:
The application is in a critical failure state. An infinite loop is generating hundreds of `GET` requests per minute, rendering the application unusable. This is not a simple bug; it is a systemic failure, likely a complex state management feedback loop causing cascading re-renders. We must diagnose and solve the root cause now.

## EVIDENCE:
- **Primary Evidence:** `shit.app.har` (Network Log) proves the relentless, repeating requests to `/api/projects` and `/api/alerts`.

## TASK - DEEP DIAGNOSTIC BLUEPRINT:
Your mission is to execute a deep, methodical diagnosis to find and neutralize the source of this loop. You are required to follow this exact sequence without deviation.

1.  **Deep Network Initiator Analysis:**
    * **Action:** Analyze the `shit.app.har` file. You are not just looking at the requests; you are to trace the **"Initiator"** call stack for the repeating requests back to the **exact line of code** in the React component that is firing the fetch.
    * **Validation:** Document the specific component file and line number that is the source of the request chain.

2.  **"Isolate and Conquer" Diagnostic (MANDATORY):**
    * **Action:** This is the most critical step. You will systematically isolate components to find the source of the loop.
        1.  First, go into the main dashboard component and **programmatically comment out the component that renders the `/api/alerts` data.** Deploy and observe. Does the `/api/alerts` request loop stop?
        2.  Next, restore the alerts component and **comment out the component that renders the `/api/projects` data.** Deploy and observe. Does the `/api/projects` request loop stop?
    * **Validation:** This process of elimination will definitively prove which component, or combination of components, is the source of the feedback loop. Document your findings.

3.  **State Management Investigation:**
    * **Action:** Based on the isolated component from the previous step, investigate the state management logic (e.g., Redux, Zustand) connected to it. Specifically look for a feedback loop pattern:
        * An API fetch updates the state (e.g., `FETCH_PROJECTS_SUCCESS`).
        * A `useEffect` or selector dependent on that state change triggers another state update.
        * This second state update causes a re-render that re-triggers the initial API fetch.
    * **Validation:** Identify the exact reducer, selector, or hook that is causing this destructive cycle.

4.  **Implement a Permanent, Structural Fix:**
    * **Action:** Based on your root cause analysis, implement a definitive fix. This is NOT just a dependency array tweak. The fix will likely be one of the following:
        * **Memoizing Selectors:** If a selector is returning a new array/object reference on every render, it must be memoized using `reselect` or `useMemo`.
        * **Refactoring a Reducer:** The reducer logic must be changed so that it does not create a new object reference if the incoming data has not actually changed.
        * **State Decoupling:** The state being updated must be decoupled from the dependencies that trigger the data fetch.
    * **Validation:** The fix must be structural and directly address the root cause you identified.

5.  **Final Verification:**
    * **Action:** Run the application and monitor the network tab for at least 60 seconds.
    * **Success Criterion:** The requests to `/api/projects` and `/api/alerts` must fire ONCE on initial load and then STOP. There must be zero repeating requests. The application must be fast and responsive.