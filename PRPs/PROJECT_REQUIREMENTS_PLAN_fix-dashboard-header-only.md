# PROJECT REQUIREMENTS PLAN (PRP)
## Fix Dashboard Header Only

---

## 1. EXECUTIVE SUMMARY

**Project Name**: Fix Dashboard Header Only

**Purpose**: Stabilize the application, restore core data flows, and repair dependent features for "Fix Dashboard Header Only".

**Scope**:
- Application stabilization (halt render/network loops)
- Core data pipeline restoration (projects, assignments)
- Dependent features repair (user assignment, roles)

---

## 2. PROBLEM STATEMENT

The row of six phase containers at the top of the dashboard (e.g., "LEAD", "PROSPECT", etc.) displays with distorted layouts and incorrect colors on different computer screens. This must be corrected.

---

## 3. SOLUTION PLAN

Detailed multi-phase repair plan is provided in the attached initial blueprint.

---

## 4. ACCEPTANCE CRITERIA

- The application is stable, core data loads correctly, and user-facing features function without errors.

---

## 5. NON-FUNCTIONAL REQUIREMENTS

- Performance: Page load stable and responsive (<2s typical)
- Reliability: No infinite loops or runaway requests after fix
- Observability: Logs and metrics available to confirm stability

---

## 6. RISKS AND MITIGATIONS

- Risk: Regression during stabilization
  - Mitigation: Stage fixes, verify after each phase
- Risk: Data integrity issues
  - Mitigation: Validate API/store/render paths end-to-end
- Risk: Hidden coupling causes re-loop
  - Mitigation: Memoization, decoupled effects, equality guards

---

## 7. DELIVERABLES

- Stable application with loops eliminated
- Restored project data flows across API, state, and UI
- Functional user assignment and roles screens
- Validation notes and before/after evidence (HAR/logs)

---

## 8. EXECUTION NOTES

- Prioritize halting loops before functional repairs
- Instrument network and state transitions for visibility
- Validate each phase explicitly before proceeding

---

## 9. TIMELINE

- Phase 1 (Stabilize): 1-2 hours
- Phase 2 (Restore Core Data): 1-2 hours
- Phase 3 (Repair Dependents): 1 hour

---

## 10. ATTACHED INITIAL BLUEPRINT

> Source: fix-dashboard-header-only.INITIAL.md


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

---

*Document Generated: 2025-08-08*
