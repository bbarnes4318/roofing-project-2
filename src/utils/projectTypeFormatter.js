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
    'OTHER': 'Other',
    // Common simple types used across UI
    'ROOFING': 'Roofing',
    'GUTTERS': 'Gutters',
    'INTERIOR_PAINT': 'Interior Paint'
  };
  // If we have an exact match, use it
  if (typeMap[projectType]) return typeMap[projectType];

  // Normalize unknown values to Title Case with spaces
  const normalized = String(projectType)
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
  return normalized;
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
