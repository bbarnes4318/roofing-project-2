## FEATURE:
Perform a root cause analysis and implement a definitive fix for a catastrophic performance bug causing an infinite network request loop. A previous fix was unsuccessful, indicating a complex underlying issue.

## PROBLEM CONTEXT:
The application remains unusable due to a critical bug causing hundreds of `GET` requests per minute to `/api/projects` and `/api/alerts`. This is not a simple `useEffect` dependency array error; it is likely a complex state management feedback loop or a component architecture issue causing cascading re-renders. The application's state is being updated in a way that immediately triggers a new data fetch, creating a vicious cycle.

## EVIDENCE:
- **Primary Evidence:** `shit.app.har` (Network Log) shows the relentless, repeating requests.
- **Symptom:** The application is completely frozen or extremely sluggish due to the constant re-rendering and network traffic.

## TASK - ADVANCED DEBUGGING BLUEPRINT:
Your mission is to perform a deep-dive diagnosis to find and neutralize the source of this infinite loop. Follow this precise investigative sequence.

1.  **Deep Network Analysis:**
    * **Action:** Re-analyze the `shit.app.har` file. This time, focus on the **"Initiator"** chain for the repeating requests. Trace the call stack back to the exact line of code in the React component that is triggering the initial `fetch`.
    * **Validation:** Identify and document the primary component file(s) responsible for initiating these data fetches.

2.  **State Management Investigation (The Likely Culprit):**
    * **Action:** Investigate the state management store (e.g., Redux, Zustand) that handles `projects` and `alerts` data.
        * Is there a reducer or state update that inadvertently modifies a dependency of the data-fetching hook?
        * Is a selector function returning a new object/array reference on every call, causing components to re-render even if the data hasn't changed?
    * **Validation:** Use the Redux DevTools (or similar) to trace the sequence of actions being dispatched. You are looking for a repeating pattern of `FETCH_SUCCESS` followed immediately by another action that triggers a re-render and a new `FETCH_START`.

3.  **Component Isolation ("Isolate and Conquer"):**
    * **Action:** This is a critical diagnostic step. Systematically comment out suspect components from the main dashboard or view.
        1.  First, comment out the component that renders the `alerts`. Does the `/api/alerts` request loop stop?
        2.  Next, comment out the component that renders the `projects`. Does the `/api/projects` request loop stop?
    * **Validation:** This process will definitively isolate which component or combination of components is at the heart of the loop.

4.  **Implement a Definitive Fix:**
    * **Action:** Based on your findings, implement a robust fix. This will likely NOT be a simple dependency array change. The fix may involve:
        * **Memoizing Selectors:** Using `reselect` or `useMemo` to ensure selectors do not trigger unnecessary re-renders.
        * **Refactoring Reducers:** Changing a reducer so it does not create a new object reference if the underlying data is identical.
        * **Using `useCallback`:** Wrapping the data-fetching function in `useCallback` if it's being passed as a prop.
    * **Validation:** The fix must be targeted and address the root cause identified in the previous steps.

5.  **Final Verification:**
    * **Action:** Run the application and closely monitor the network tab.
    * **Success Criterion:** The requests to `/api/projects` and `/api/alerts` must fire only once on initial load and then only again in response to a specific user action (e.g., a manual refresh), NOT continuously.