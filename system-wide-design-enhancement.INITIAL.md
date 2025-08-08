## FEATURE:
Execute a comprehensive UI/UX redesign to enhance the application's visual appeal and create a modern, cohesive brand identity based on the official company logos.

## PROBLEM CONTEXT:
The current application UI lacks a consistent and professional design language. The color scheme, typography, and component styling are inconsistent, leading to a disjointed user experience. This task is to refactor the entire frontend to align with the company's branding, improve usability, and create a visually appealing, modern interface.

## CORE DESIGN PRINCIPLES:
- **Professional & Trustworthy:** The design should feel clean, stable, and reliable.
- **Modern & Clean:** Utilize whitespace effectively; avoid clutter.
- **Cohesive:** All elements must share a unified design language.
- **Brand-Aligned:** The color palette and overall feel must be directly inspired by the provided company logos.

## TASK - EXECUTION BLUEPRINT:
You are to execute a precise, four-phase process to overhaul the application's design.

### --- PHASE 1: DEFINE THE BRAND & COLOR PALETTE ---

Your first step is to establish the foundational design system based on the provided logos.

1.  **Logo Analysis:**
    * **Action:** Analyze the three provided logo files: `upfront-logo-1.png`, `upfront-logo-2.png`, and `upfront-logo-3.png`.
    * **Validation:** Identify the core brand colors (e.g., the primary blue, the dark gray/black, the white, and any accent colors).

2.  **Create the Design System in Tailwind:**
    * **Action:** Open the `tailwind.config.js` file.
    * **Task:** Using the colors extracted from the logos, define a new color palette in the `theme.extend.colors` section. Create clear names for each color, for example:
        * `primary`: The main brand color (e.g., the logo's blue).
        * `secondary`: The supporting color (e.g., a light gray).
        * `accent`: The color for call-to-action buttons (e.g., a vibrant color from the logos).
        * `text-primary`: The main text color (e.g., the dark gray/black).
        * `text-secondary`: The lighter text color.
    * **Validation:** The `tailwind.config.js` file must contain a new, named color palette that directly reflects the branding.

### --- PHASE 2: IMPLEMENT GLOBAL STYLE OVERHAUL ---

With the design system defined, apply these styles globally.

1.  **Update Base Styles:**
    * **Action:** In `src/index.css`, apply the new primary text color and a secondary/background color to the `body` tag to set the default appearance for the entire application.
    * **Validation:** The application's default background and text color should immediately reflect the new brand palette.

2.  **Standardize Typography:**
    * **Action:** Review the application and choose a clean, modern, and readable font family (e.g., Inter, Poppins) available via Google Fonts or a similar service, and integrate it. Define consistent font sizes for headings (h1, h2, h3) and body text using Tailwind's theme configuration or base CSS.
    * **Validation:** All text across the application should use the new, standardized typography.

### --- PHASE 3: REDESIGN KEY UI COMPONENTS ---

Systematically update all major UI components to use the new design system.

1.  **Buttons:**
    * **Action:** Refactor all `<button>` elements. Primary buttons must use the `primary` and `accent` colors. Secondary buttons should have a more subtle design. Ensure all buttons have consistent padding, font size, and hover/focus states.
2.  **Cards:**
    * **Action:** Redesign the main card components, such as `src/components/common/ProjectCard.jsx` and `src/components/ui/ActivityCard.jsx`. Give them a modern look with consistent padding, subtle shadows, and border-radius.
3.  **Forms:**
    * **Action:** Restyle all input fields, text areas, and select dropdowns to have a consistent appearance, using the new brand colors for focus rings and borders.
4.  **Navigation & Layout:**
    * **Action:** Update the main sidebar and header components to use the new primary and secondary brand colors. Ensure the layout feels balanced and the navigation is clear.

### --- PHASE 4: FINAL REVIEW AND POLISH ---

1.  **Consistency Check:**
    * **Action:** Navigate through every single page of the application. Hunt down any remaining elements that are still using the old color scheme or styling and correct them.
    * **Validation:** The entire application must feel like a single, cohesive product.

2.  **Accessibility & Responsiveness:**
    * **Action:** Ensure that all text has sufficient color contrast against its background. Verify that the new design is fully responsive and looks great on both mobile and desktop screen sizes.
    * **Validation:** The application must be usable and visually appealing on all devices.