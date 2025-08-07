## FEATURE:
Diagnose and fix a critical data integrity issue where the production server displays an incorrect user count (2) while the local environment shows the correct count (12+).

## PROBLEM CONTEXT:
The application's production environment is fundamentally out of sync with our database. The user count is drastically lower than expected, which indicates that the production server is either connecting to the wrong database, using stale or seeded data, or has a faulty API query. This issue completely undermines user trust and must be resolved immediately.

## TASK - DEBUGGING BLUEPRINT:
Your mission is to systematically investigate the data pipeline on the production server to find and fix the source of this discrepancy. Follow this exact sequence.

1.  **CRITICAL: Verify Production Environment Variables:**
    * **Action:** Inspect the environment variable configuration file (`.env.production` or similar) on the **production server**.
    * **Validation:** Confirm that the `DATABASE_URL` is pointing to our **correct, master production database**. It is highly likely it is misconfigured and pointing to an old development, testing, or seeding database.

2.  **Inspect Production Deployment & Seeding Scripts:**
    * **Action:** Analyze the production deployment scripts (e.g., in `package.json`, a `deploy.sh` script, or CI/CD configuration files).
    * **Validation:** Look for any "database seeding" or "prisma db seed" commands that are being run **during the production deployment**. A seeding script that creates only 2 default users and runs on every deploy would cause this exact problem.

3.  **Analyze API Data Fetching Logic:**
    * **Action:** Investigate the API endpoint responsible for fetching the list of users (e.g., `GET /api/users`).
    * **Validation:** Check the code for any production-specific logic. Is there a hardcoded `take: 2` or `limit: 2` in the database query that only runs when `process.env.NODE_ENV === 'production'`? This is a possible, though less likely, cause.

4.  **Implement and Validate the Fix:**
    * **Action:** Once you identify the root cause (e.g., correcting the `DATABASE_URL` in the environment file, removing the seeding command from the production deploy script), implement the necessary fix.
    * **Success Criterion:** After deploying the fix, the user count displayed on the main domain **must** exactly match the user count shown in the local environment.