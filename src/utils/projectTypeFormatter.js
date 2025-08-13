/**
 * Utility function to format projectType enum values into proper display text
 * @param {string} projectType - The raw projectType enum value from database
 * @returns {string} - Formatted display text
 */
export const formatProjectType = (projectType) => {
  if (!projectType) return 'N/A';
  
  const typeMap = {
    'ROOF_REPLACEMENT': 'Roof Replacement',
    'KITCHEN_REMODEL': 'Kitchen Remodel',
    'BATHROOM_RENOVATION': 'Bathroom Renovation',
    'SIDING_INSTALLATION': 'Siding Installation',
    'WINDOW_REPLACEMENT': 'Window Replacement',
    'FLOORING': 'Flooring',
    'PAINTING': 'Painting',
    'ELECTRICAL_WORK': 'Electrical Work',
    'PLUMBING': 'Plumbing',
    'HVAC': 'HVAC',
    'DECK_CONSTRUCTION': 'Deck Construction',
    'LANDSCAPING': 'Landscaping',
    'OTHER': 'Other'
  };
  
  return typeMap[projectType] || projectType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Get a professional color class for project type badges
 * @param {string} projectType - The raw projectType enum value from database
 * @returns {string} - Tailwind CSS color classes
 */
export const getProjectTypeColor = (projectType) => {
  if (!projectType) return 'bg-gray-50 text-gray-600 border-gray-200';
  
  // Professional, subtle styling - no bright colors
  return 'bg-gray-50 text-gray-700 border-gray-300 shadow-sm';
};

/**
 * Get a professional dark mode color class for project type badges
 * @param {string} projectType - The raw projectType enum value from database
 * @returns {string} - Tailwind CSS color classes for dark mode
 */
export const getProjectTypeColorDark = (projectType) => {
  if (!projectType) return 'bg-gray-700 text-gray-300 border-gray-600';
  
  // Professional, subtle styling for dark mode
  return 'bg-gray-700/50 text-gray-200 border-gray-600 shadow-sm';
};
