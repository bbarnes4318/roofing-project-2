// Workflow Navigation Utilities
// Helper functions for navigating to specific workflow items

/**
 * Navigate to a specific line item in the workflow
 * @param {Function} handleProjectSelect - The project selection handler from App.jsx
 * @param {Object} project - The project object
 * @param {string} lineItemId - The specific line item ID to navigate to
 * @param {string} sectionId - The section containing the line item (optional)
 * @param {string} sourceSection - Where the navigation originated from
 */
export const navigateToLineItem = (handleProjectSelect, project, lineItemId, sectionId = null, sourceSection = 'Direct Navigation') => {
  console.log(`🎯 WORKFLOW NAV: Navigating to line item ${lineItemId} in project ${project.name}`);
  
  handleProjectSelect(
    project,
    'Project Workflow', // Always go to workflow view
    null, // phase not needed
    sourceSection, // track where navigation came from
    lineItemId, // target specific line item
    sectionId // target specific section if provided
  );
};

/**
 * Navigate to a specific section in the workflow
 * @param {Function} handleProjectSelect - The project selection handler from App.jsx
 * @param {Object} project - The project object
 * @param {string} sectionId - The section ID to navigate to
 * @param {string} sourceSection - Where the navigation originated from
 */
export const navigateToSection = (handleProjectSelect, project, sectionId, sourceSection = 'Direct Navigation') => {
  console.log(`🎯 WORKFLOW NAV: Navigating to section ${sectionId} in project ${project.name}`);
  
  handleProjectSelect(
    project,
    'Project Workflow', // Always go to workflow view
    null, // phase not needed
    sourceSection, // track where navigation came from
    null, // no specific line item
    sectionId // target specific section
  );
};

/**
 * Navigate to project workflow (general)
 * @param {Function} handleProjectSelect - The project selection handler from App.jsx
 * @param {Object} project - The project object
 * @param {string} sourceSection - Where the navigation originated from
 */
export const navigateToWorkflow = (handleProjectSelect, project, sourceSection = 'General Navigation') => {
  console.log(`🎯 WORKFLOW NAV: Navigating to workflow for project ${project.name}`);
  
  handleProjectSelect(
    project,
    'Project Workflow', // Go to workflow view
    null, // phase not needed
    sourceSection, // track where navigation came from
    null, // no specific line item
    null // no specific section
  );
};

/**
 * Create line item ID from phase, section, and index
 * This matches the ID format used in ProjectChecklistPage
 * @param {string} phaseId - The phase ID (e.g., 'LEAD', 'PROSPECT')
 * @param {string} sectionId - The section ID
 * @param {number} itemIndex - The index of the item within the section
 */
export const createLineItemId = (phaseId, sectionId, itemIndex) => {
  return `${phaseId}-${sectionId}-${itemIndex}`;
};

/**
 * Example usage:
 * 
 * // Navigate to a specific line item
 * navigateToLineItem(
 *   handleProjectSelect, 
 *   project, 
 *   'LEAD-cmdz32fsr0002umpc92vzc2ny-0', // line item ID
 *   'cmdz32fsr0002umpc92vzc2ny', // section ID
 *   'Dashboard Click'
 * );
 * 
 * // Navigate to a section
 * navigateToSection(
 *   handleProjectSelect, 
 *   project, 
 *   'cmdz32fsr0002umpc92vzc2ny', 
 *   'Phase Overview'
 * );
 * 
 * // Navigate to workflow generally
 * navigateToWorkflow(
 *   handleProjectSelect, 
 *   project, 
 *   'Menu Click'
 * );
 */