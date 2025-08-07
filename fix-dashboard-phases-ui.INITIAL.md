## FEATURE:
Refactor the "Project by Phase" component on the main dashboard to ensure it is fully responsive and visually consistent across all screen resolutions and devices.

## PROBLEM CONTEXT:
The UI component responsible for displaying project counts by phase currently renders inconsistently. On different screens, the layout, colors, and container dimensions are distorted, creating a broken and unprofessional user experience.

## ACCEPTANCE CRITERIA:
The refactored component must meet these precise requirements:
1.  **Consistent Container:** Each phase (e.g., "LEAD", "APPROVED") must be rendered inside a pill-shaped container with a fixed height and consistent internal padding.
2.  **Color Indicator:** Each container must display a small, colored circle on the left. The color of this circle must be dynamically bound to the color code defined for that specific phase.
3.  **Phase Name:** The name of the phase must be displayed cleanly to the right of the color indicator.
4.  **Full Responsiveness:** The layout must wrap gracefully on smaller viewports. The containers must never break, overlap, or have their contents distorted.
5.  **Styling:** All styling must be implemented using **Tailwind CSS utility classes** to maintain project consistency.

## TECHNICAL CONTEXT:
- **Primary Component File:** The code for this UI element is likely located in `src/components/dashboard/ProjectCubes.jsx`. Begin your analysis there.
- **Color Constants:** The color codes for each project phase are defined in `src/data/constants.js`. You must import and use these constants to ensure color consistency.