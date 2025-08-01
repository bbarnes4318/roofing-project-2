// Workflow subjects that align directly with Project Workflow Checklist steps
export const WORKFLOW_SUBJECTS = [
  // Lead Phase
  'Input Customer Information',
  'Complete Questions to Ask Checklist', 
  'Input Lead Property Information',
  'Assign A Project Manager',
  'Schedule Initial Inspection',
  
  // Prospect Phase  
  'Site Inspection',
  'Write Estimate',
  'Insurance Process',
  'Agreement Preparation',
  'Agreement Signing',
  
  // Prospect Non-Insurance Phase
  'Write Estimate - Non-Insurance',
  'Agreement Signing - Non-Insurance',
  
  // Approved Phase
  'Administrative Setup',
  'Pre-Job Actions',
  'Prepare for Production',
  
  // Execution Phase
  'Installation',
  'Quality Check',
  'Multiple Trades',
  'Subcontractor Work',
  'Update Customer',
  
  // 2nd Supplement Phase
  'Create Supp in Xactimate',
  'Follow-Up Calls', 
  'Review Approved Supp',
  'Customer Update',
  
  // Completion Phase
  'Financial Processing',
  'Project Closeout'
];

// Additional general subjects for activity feeds (non-workflow specific)
export const GENERAL_SUBJECTS = [
  'General Update',
  'Project Status',
  'Material Delivery',
  'Safety Meeting',
  'Quality Inspection',
  'Client Communication',
  'Permit Update',
  'Weather Alert',
  'Equipment Issue',
  'Crew Assignment',
  'Budget Update',
  'Schedule Change',
  'Inspection Report',
  'Documentation',
  'Emergency Alert',
  'Training Update',
  'Maintenance Required',
  'Vendor Communication',
  'Insurance Update',
  'Warranty Information'
];

// Combined list for activity feeds (workflow + general subjects)
export const ACTIVITY_FEED_SUBJECTS = [...WORKFLOW_SUBJECTS, ...GENERAL_SUBJECTS];

// Alert subjects should primarily use workflow subjects 
export const ALERT_SUBJECTS = WORKFLOW_SUBJECTS; 