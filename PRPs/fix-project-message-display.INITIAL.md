## FEATURE:
Diagnose and fix the bug in the "My Project Messages" section causing assigned project names to display incorrectly as "Unknown Project."

## PROBLEM CONTEXT:
When a message is associated with a specific project, the UI fails to retrieve and display the correct project name, showing "Unknown Project" instead. This indicates a failure in the data lookup between the message and the project it belongs to.

## TASK - EXECUTION BLUEPRINT:

1.  **Backend Investigation:**
    * **Action:** The root cause is likely in the backend. Investigate the API endpoint that fetches messages, likely defined in `server/routes/projectMessages.js`. The query is probably not correctly joining the `messages` table with the `projects` table to include the project's name in the response.
    * **Validation:** The API response for a message must include the correct `projectName`.

2.  **Frontend Component Fix:**
    * **Action:** Once the backend is sending the correct data, ensure the frontend component responsible for rendering the message card, likely `src/components/ui/ProjectMessagesCard.jsx`, is accessing and displaying the `projectName` field from the API response.
    * **Validation:** Send a new message linked to the 'Jim Bob' project and confirm that the correct project name appears in the message list, not "Unknown Project."