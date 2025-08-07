## FEATURE:
Diagnose and fix a critical performance bug causing an infinite loop of network requests, which is overwhelming the application and backend services.

## PROBLEM CONTEXT:
The application is making hundreds of GET requests per minute to `/api/projects` and `/api/alerts`, as evidenced by the attached network log (`shit.app.har`). This behavior is causing severe frontend and backend performance degradation, rendering the application unusable.

The root cause is likely a misconfigured `useEffect` hook or a state management issue in a React component that triggers a re-render, which in turn re-triggers the data fetch in an endless cycle.

## EVIDENCE:
- **Network Log:** `shit.app.har`
- **Repeating Requests:**
    - `GET /api/projects?limit=100`
    - `GET /api/alerts?status=active`

## TASK - DEBUGGING BLUEPRINT:
Your mission is to find and neutralize the source of this infinite loop.

1.  **Analyze the Network Log (`shit.app.har`):**
    * **Action:** Review the provided HAR file to confirm the repeating request patterns and identify any potential request initiators.
    * **Validation:** Document the specific components or scripts identified in the "Initiator" tab of the network requests.

2.  **Isolate the Offending Component:**
    * **Action:** Based on the analysis, perform a targeted search of the codebase for the components that fetch data from `/api/projects` and `/api/alerts`. The issue is almost certainly within a component that uses both of these data sources.
    * **Hypothesis:** The primary suspect is a high-level dashboard or main view component where this data is displayed.
    * **Validation:** Pinpoint the exact `useEffect` or data-fetching hook that is being re-triggered improperly.

3.  **Implement the Fix:**
    * **Action:** Correct the dependency array of the identified `useEffect` hook. The dependency array is likely missing, causing the effect to run on every render, or it contains an object or array that is being re-created on every render, triggering the loop.
    * **Solution:** Ensure the dependency array is correctly specified with only the primitive values that should trigger a re-fetch. If an object or array is a necessary dependency, consider memoizing it with `useMemo` or `useCallback`.

4.  **Verify the Solution:**
    * **Action:** After applying the fix, run the application and monitor the network tab in your browser's developer tools.
    * **Success Criterion:** The requests to `/api/projects` and `/api/alerts` must now only fire **once** on the initial component load, and not continuously. The application should be responsive and performant.