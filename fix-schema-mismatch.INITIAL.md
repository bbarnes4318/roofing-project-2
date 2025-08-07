## FEATURE:
Fix the critical database schema mismatch that is blocking workflow progression.

## PROBLEM CONTEXT:
The `PRP_VALIDATION_REPORT.md` identified a fatal error when trying to complete a workflow step. [cite_start]The service at `server/services/workflowInitializationService.js` attempts to use a field named `stepOrder` when creating a record in the `WorkflowStep` model, but this field does not exist in the `server/prisma/schema.prisma` file[cite: 1].

## TASK:
1.  **Analyze the Code:** Examine `server/services/workflowInitializationService.js` at line 257 to confirm how the `stepOrder` field is being used.
2.  **Analyze the Schema:** Examine the `WorkflowStep` model in `server/prisma/schema.prisma`.
3.  **Implement the Fix:** Modify the `WorkflowStep` model in `server/prisma/schema.prisma` to include the required `stepOrder` field. It should likely be an integer (`Int`).
4.  **Apply the Fix:** After updating the schema, run the necessary Prisma command to apply the migration to the database (e.g., `prisma migrate dev`).
5.  **Validate the Fix:** Write a simple test or temporarily modify an existing endpoint to confirm that you can now create a `WorkflowStep` with the `stepOrder` field without errors.