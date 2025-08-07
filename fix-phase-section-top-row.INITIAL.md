## FEATURE:
Surgically refactor the UI for the top row of the "Project by Phase" section on the main dashboard.

## SCOPE & CONSTRAINTS:
**CRITICAL: Your work is strictly confined to the single row of six phase containers that appears at the very top of the "Project by Phase" section.** You are explicitly forbidden from altering any other part of this component or the dashboard page. The tables and other elements located *below* this specific top row must remain completely untouched.

## PROBLEM CONTEXT:
The row of six phase containers at the top of the section displays with distorted layouts, inconsistent sizes, and incorrect colors on different computer screens. This must be corrected to ensure a uniform and professional appearance for all users.

## ACCEPTANCE CRITERIA FOR THE TOP ROW ONLY:
1.  **Isolate the Target:** Within the `src/components/dashboard/ProjectCubes.jsx` file, you must first identify and isolate the specific `div` or mapped array that renders **only the top row of the six phase containers.**
2.  **Uniform Containers:** Each of the six containers in that row must be a uniform, pill-shaped (oval) element with identical, fixed height and padding.
3.  **Internal Elements:** Inside each container, ensure these two elements are present and correctly styled, from left to right:
    * A small, colored circle. Its color must be dynamically set from the values in `src/data/constants.js`.
    * The phase name text (e.g., "LEAD").
4.  **Responsive Wrapping:** The row of six containers must wrap cleanly on smaller screens. Use Tailwind CSS Flexbox or Grid utilities to enable this behavior without distorting the containers.
5.  **No Side Effects:** The final validation step is to confirm that your changes have had zero impact on any other part of the dashboard.

## TECHNICAL CONTEXT:
- **Component File:** The code is located in `src/components/dashboard/ProjectCubes.jsx`.
- **Color Definitions:** Use the phase color codes from `src/data/constants.js`.