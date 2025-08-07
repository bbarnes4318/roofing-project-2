## FEATURE:
Diagnose and resolve the issue causing the production server to display stale project data that does not match the current state of the master database.

## PROBLEM CONTEXT:
The application instance running on our main domain is serving outdated project information. New projects and status updates made directly in the database are not being reflected on the live site. This points to a potential issue with the server's database connection, a caching layer, or the deployment process itself.

## TASK - DEBUGGING BLUEPRINT:
Your task is to systematically investigate and validate the data pipeline from the database to the frontend. Follow this exact sequence:

1.  **Verify Environment Variables:**
    - **Action:** Inspect the environment variables on the production server.
    - **Validation:** Confirm that the `DATABASE_URL` is pointing to our correct, updated master database and not a stale replica or old development database.

2.  **Investigate Caching Layers:**
    - **Action:** Analyze the server's code for any data caching mechanisms (e.g., Redis, in-memory cache, etc.).
    - **Validation:** If a cache is found, check its configuration. The Time-to-Live (TTL) might be set too high, or the cache-invalidation logic might be failing. Attempt to programmatically clear the cache and see if the correct data is then displayed.

3.  **Inspect Deployment & Build Process:**
    - **Action:** Review the deployment scripts and logs (e.g., GitHub Actions, Vercel, etc.).
    - **Validation:** Ensure that the production server is correctly pulling the latest build and not being served an old, static build. Check for any "data-seeding" or "database-snapshot" steps in the deployment process that might be overwriting the connection to the live database.

4.  **Implement and Validate the Fix:**
    - **Action:** Once you identify the root cause (e.g., correcting the `DATABASE_URL`, fixing the cache invalidation, or correcting the build script), implement the necessary fix.
    - **Validation:** After applying the fix, make a small, recognizable change to a project in the master database. Confirm that this change is immediately visible on the main domain.