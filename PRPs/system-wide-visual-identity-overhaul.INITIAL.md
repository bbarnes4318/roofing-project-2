## FEATURE:
Execute a full-stack, state-of-the-art UI/UX overhaul to establish a new, modern, and cohesive visual identity for the application. This includes redesigning the company logos and implementing a new, psychologically-driven color scheme that is both aesthetically pleasing and enhances usability.

## PROBLEM CONTEXT:
The application's current visual design is outdated and lacks a strong, memorable brand identity. To position ourselves as a forward-thinking, "ahead of the curve" technology leader, we need a complete visual refresh. This task is to transform the application's look and feel into a sleek, professional, and impressive user experience.

## CORE DESIGN PRINCIPLES & PERSONA:
You are to adopt the persona of a world-class UI/UX design expert. Your work must be guided by the following principles:
- **Modern Color Theory:** Utilize principles of harmony, contrast, and psychological impact.
- **Minimalist & Clean:** The design must feel uncluttered, intuitive, and efficient.
- **Brand Cohesion:** The new logos and color scheme must work together to create a single, unified brand identity.
- **Aesthetic Excellence:** The final result must be visually impressive and feel "ahead of its time."

## TASK - EXECUTION BLUEPRINT:
You are to execute the following three phases in the precise order listed.

---

### --- PHASE 1: BRAND IDENTITY & LOGO REDESIGN ---

Your first step is to redefine the core visual identity of the brand.

1.  **Analyze Existing Logos:**
    * **Action:** Review the three existing logo concepts provided (`upfront-logo-1.png`, `upfront-logo-2.png`, `upfront-logo-3.png`).
    * **Task:** Identify the strongest elements from these concepts and synthesize them into a new, single, definitive logo. The new logo must be modern, easily recognizable, and versatile enough to work in different sizes and on both light and dark backgrounds.

2.  **Develop a New Color Palette:**
    * **Action:** Based on the new logo design and modern color theory, create a comprehensive color palette. This is not just about picking colors; it's about defining their purpose.
    * **Required Palette Structure:**
        * **Primary Brand Color:** The main color from the new logo.
        * **Secondary/Accent Color:** A complementary color for calls-to-action, highlights, and important notifications.
        * **Neutral Palette:** A range of grays (from light to dark) for backgrounds, borders, and text.
        * **System Colors:** Specific colors for success (green), warning (yellow/orange), and error (red) states.
    * **Validation:** Present the new logo and the full color palette for review before proceeding.

---

### --- PHASE 2: IMPLEMENT THE NEW DESIGN SYSTEM ---

With the brand identity defined, you will now integrate it into the application's frontend.

1.  **Update the Tailwind Configuration:**
    * **Action:** Open the `tailwind.config.js` file.
    * **Task:** Populate the `theme.extend.colors` section with the new, named color palette you created in Phase 1. This centralizes the design system.

2.  **Replace All Logos:**
    * **Action:** Perform a global search across the codebase to find and replace all instances of the old logos with the new, definitive logo you designed. This includes favicons, login page logos, and header logos.

3.  **Apply the New Color Scheme Globally:**
    * **Action:** Go through the entire application, component by component, and replace the old color classes with the new ones defined in your Tailwind configuration.
    * **Key Areas of Focus:**
        * **Global Styles (`src/index.css`):** Update the base background and text colors.
        * **Buttons & Interactive Elements:** Ensure all buttons, links, and form inputs use the new primary, accent, and neutral colors consistently.
        * **Navigation & Layout:** Restyle the main sidebar and headers.
        * **Data Visualization:** Update the colors of all charts and graphs to match the new palette.

---

### --- PHASE 3: FINAL POLISH AND VALIDATION ---

1.  **Consistency Audit:**
    * **Action:** Navigate through every page of the application. Hunt down any remaining elements that are still using old logos or colors and correct them.
    * **Validation:** The entire application must present a single, cohesive, and visually impressive brand experience.

2.  **Accessibility Check:**
    * **Action:** Ensure that your new color scheme is accessible. All text must have a sufficient contrast ratio against its background to meet WCAG AA standards.
    * **Validation:** Use a browser extension or online tool to check color contrast ratios on all major components.