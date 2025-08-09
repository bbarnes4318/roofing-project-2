## FEATURE:
Execute a full-stack design overhaul to apply the new, state-of-the-art visual identity from the login page to the entire application. The goal is to create a seamless, visually cohesive, and modern user experience across all pages and components.

## PROBLEM CONTEXT:
The new login page has established a futuristic and professional design language for our brand. However, the rest of the application still uses the old, inconsistent styling. This creates a jarring user experience. This task is to refactor the entire application to adopt the new design system, ensuring every component, from buttons to dashboards, aligns with the new aesthetic.

## CORE DESIGN PRINCIPLES:
- **Consistency is Key:** The colors, typography, spacing, and component styles established on the new login page are the single source of truth.
- **Modern & Clean:** The design must feel uncluttered, intuitive, and efficient.
- **Brand Cohesion:** All elements must work together to create a single, unified brand identity.

## TASK - EXECUTION BLUEPRINT:
You are to execute the following three phases in the precise order listed. This will ensure the new design system is implemented logically and efficiently.

---

### --- PHASE 1: CENTRALIZE THE DESIGN SYSTEM ---

Before changing any components, you must first codify the new design language into a central, reusable system.

1.  **Extract Design Tokens from the Login Page:**
    * **Action:** Analyze the new login page component (`src/components/pages/BlueprintLoginPage.jsx` or `src/components/pages/HolographicLoginPage.jsx`).
    * **Task:** Identify all the core design elements: the primary color palette (primary, accent, neutrals), font families, font sizes, border radii, and spacing units.

2.  **Update the Tailwind Configuration:**
    * **Action:** Open the `tailwind.config.js` file.
    * **Task:** Populate the `theme.extend` section with the design tokens you just extracted. Create clear, named values for all colors, fonts, and other variables. This creates the application-wide design system.
    * **Validation:** The `tailwind.config.js` file must be the single source of truth for all styling.

---

### --- PHASE 2: REFACTOR GLOBAL & CORE UI COMPONENTS ---

With the design system in place, you will now apply it to the most impactful areas of the application.

1.  **Apply Global Styles:**
    * **Action:** In `src/index.css`, update the `body` styles to use the new default background and text colors from your Tailwind config. Apply the new primary font family.
    * **Validation:** The entire application's base styling should now reflect the new design.

2.  **Refactor the Main Application Shell:**
    * **Action:** Identify the main layout component that contains the sidebar and header (likely a wrapper component in `src/App.jsx`).
    * **Task:** Restyle the sidebar, top navigation bar, user profile dropdown, and notification panel to match the sleek, modern aesthetic of the login page. Use the new color palette and typography.

3.  **Standardize Common Components:**
    * **Action:** Refactor the most commonly used components to use the new design system. This is the most critical step for visual consistency.
    * **Checklist:**
        * **Buttons:** All buttons must match the style of the new login button (color, hover effects, padding).
        * **Cards:** All card components (e.g., `src/components/common/ProjectCard.jsx`) must have consistent padding, border-radius, and shadows.
        * **Forms & Inputs:** All input fields, selects, and labels must match the new, modern style.
        * **Modals:** Refactor `src/components/common/Modal.jsx` to use the new design.

---

### --- PHASE 3: FULL-APPLICATION CONSISTENCY AUDIT ---

Finally, you will perform a full review to ensure every corner of the application is perfect.

1.  **Page-by-Page Review:**
    * **Action:** Systematically navigate to every single page in the application, including:
        * `DashboardPage.jsx`
        * `ProjectsPage.jsx`
        * `ProjectDetailPage.jsx`
        * `TasksAndAlertsPage.jsx`
        * `SettingsPage.jsx`
    * **Task:** Hunt down and fix any remaining elements that still use old styles. Ensure all data visualizations, tables, and unique page components are updated.

2.  **Final Validation:**
    * **Action:** Perform a final check for responsiveness and accessibility.
    * **Success Criterion:** The entire application, from login to logout, must present a single, cohesive, and visually impressive brand experience. The UI must be flawless on both desktop and mobile devices.