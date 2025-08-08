## FEATURE:
Execute a comprehensive overhaul of the main dashboard to fix critical UI bugs, improve user experience, and repair broken navigation links.

## PROBLEM CONTEXT:
The main dashboard is suffering from multiple failures: project progress bars are non-functional and stuck at 0%, the phase containers at the top are visually inconsistent, and navigation from the dashboard to specific workflow items is broken, creating a frustrating user experience.

## TASK - EXECUTION BLUEPRINT:

1.  **Fix Project Progress Bars:**
    * **Action:** Investigate why all progress bars in the "Current Projects by Phase" section are stuck at 0%. Analyze the backend service `server/services/ProjectProgressService.js` to see if the progress calculation logic is flawed. If the backend is correct, debug the frontend component `src/components/ui/UnifiedProgressTracker.jsx` to ensure it's receiving and rendering the progress data correctly.
    * **Validation:** Progress bars must accurately reflect the completion percentage of each project.

2.  **Redesign Phase Containers:**
    * **Action:** Refactor the CSS for the six phase containers at the top of the "Current Projects by Phase" section, located in `src/components/dashboard/ProjectCubes.jsx`. Enforce uniform, larger dimensions for all containers and increase the size of the text and the colored circles within them using Tailwind CSS.
    * **Validation:** The six phase containers must be visually identical in size and style, and the layout must be responsive.

3.  **Improve UX for Empty Phases:**
    * **Action:** Modify the layout so that when a user clicks a phase with zero projects, the section header ("Current Projects by Phase") remains visible. This prevents the user from thinking the page is broken. The goal is to provide constant context, even when a list is empty.
    * **Validation:** Clicking on a phase with no projects should result in an empty list under a persistent header, not a blank-looking page.

4.  **Fix Workflow Deep-Linking:**
    * **Action:** The "Project Workflow" buttons on the dashboard currently link to the generic workflow page. Modify this behavior. The link must now navigate the user not just to the project's workflow page, but directly to the *currently active line item* for that specific project. This will likely require passing a line item ID or anchor tag in the URL and updating the routing logic in `src/App.jsx`.
    * **Validation:** Clicking the workflow button must take the user to the correct page and automatically scroll to or highlight the current task.

5.  **Repair "Back" Button Logic:**
    * **Action:** Fix the browser's back button behavior. After navigating to a workflow page from the "Current Project Access" section, clicking the back button must return the user to that section, not the top of the dashboard. Additionally, restore the dedicated back button that was in the lower-left corner of the project cubes on the "My Projects" page.
    * **Validation:** The navigation flow must feel intuitive and preserve the user's context.