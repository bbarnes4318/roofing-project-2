## FEATURE:
Surgically refactor **only the header section** of the "Project by Phase" dashboard component to fix visual inconsistencies.

## SCOPE & CONSTRAINTS:
**CRITICAL: You are forbidden from modifying any part of the component EXCEPT for the section that renders the six phase containers at the top of the dashboard.** The rest of the page, including any tables or other elements below this header, must remain completely untouched.

## PROBLEM CONTEXT:
The row of six phase containers at the top of the dashboard (e.g., "LEAD", "PROSPECT", etc.) displays with distorted layouts and incorrect colors on different computer screens. This must be corrected.

## ACCEPTANCE CRITERIA FOR THE HEADER SECTION ONLY:
1.  **Isolate the Component:** The primary task is to find the specific `div` or sub-component within `src/components/dashboard/ProjectCubes.jsx` that renders only this top row of six phase containers.
2.  **Uniform Containers:** Each of the six phase containers must be a uniform, pill-shaped (oval) container. They must have a fixed height and padding so their dimensions are identical.
3.  **Visual Elements:** Inside each container, there must be two elements, ordered from left to right:
    * A small, colored circle. The color must be dynamically set based on the phase's color code from `src/data/constants.js`.
    * The phase name text (e.g., "LEAD").
4.  **Responsive Layout:** The row of six containers must wrap cleanly and predictably on smaller screens without distorting the shape or content of the individual containers. Use Flexbox or Grid with wrapping enabled.
5.  **Styling:** Use only **Tailwind CSS** utility classes for all styling modifications.

## VALIDATION:
Confirm that your changes **only** affect the top header row and that no other part of the dashboard's layout or functionality has been altered.