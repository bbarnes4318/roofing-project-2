## FEATURE:
Execute a comprehensive, system-wide validation of all interactive elements (buttons, links) on the live production server to ensure they function as expected.

## PROBLEM CONTEXT:
We need to guarantee that every clickable element in the application is correctly linked and performs the intended action. Broken buttons and links lead to a dead-end user experience, destroy user trust, and can block critical workflows. This task requires a full audit of the production deployment, not the local environment.

## TASK - EXECUTION BLUEPRINT:
Your mission is to systematically crawl the live application, identify every interactive element, and validate its behavior. Follow this precise, three-phase process.

### PHASE 1: DISCOVERY - Crawl and Catalog All Interactive Elements

1.  **Action:** Start at the application's root URL. Programmatically crawl every page and view accessible from the main navigation and subsequent links.
2.  **Cataloging:** As you crawl, create a comprehensive inventory of every unique `<a>` tag, `<button>` tag, and any `div` or `span` with a click handler (`onClick`).
3.  **Data to Record:** For each element, record the following:
    * The page URL where it was found.
    * The element's text or accessible name (e.g., "Create New Project", "View Details").
    * The element's `href` attribute (for links) or its unique selector/ID.
4.  **Validation:** Your output for this phase must be a structured list (e.g., a JSON file) of all discovered interactive elements. This list will be your master checklist for the next phase.

### PHASE 2: VALIDATION - Execute and Verify

1.  **Action:** Iterate through the checklist you created in Phase 1. For each element:
    * Navigate to the page where the element exists.
    * Programmatically click the element.
2.  **Defining Expected Outcomes:**
    * **For Navigational Links:** The expected outcome is a successful navigation to the URL specified in the `href` attribute. The new page must load without a 404 error.
    * **For Action Buttons (e.g., "Save", "Delete", "Submit"):** The expected outcome is a successful API call (e.g., a `POST` or `PUT` request) that returns a `2xx` status code and a success message, or a UI state change (e.g., a modal appearing, a form being cleared).
3.  **Validation:** After each click, verify that the expected outcome occurred. Check the browser's current URL, look for success notifications in the UI, or monitor the network tab for successful API responses.

### PHASE 3: REPORTING - Document All Failures

1.  **Action:** If an element fails validation, log it immediately.
2.  **Failure Report Format:** Your final deliverable must be a `VALIDATION_REPORT.md` file that lists **only the failures**. Each entry must include:
    * **Page URL:** The page where the broken element was found.
    * **Element Name/Text:** The text of the broken button or link.
    * **Expected Outcome:** What was supposed to happen (e.g., "Navigate to /projects/new").
    * **Actual Outcome:** What actually happened (e.g., "Resulted in a 404 error" or "No action occurred").

## CRITICAL INSTRUCTION:
This entire process must be executed against our **live production domain**, not a local development server.