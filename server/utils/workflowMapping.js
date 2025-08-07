// Server-side workflow mapping utility
// This ensures consistent section and line item names across all API responses

const workflowStructure = {
  'LEAD': {
    'Input Customer Information': {
      section: 'Input Customer Information – Office 👩🏼‍💻',
      lineItems: ['Make sure the name is spelled correctly', 'Make sure the email is correct. Send a confirmation email to confirm email.']
    },
    'Complete Questions to Ask Checklist': {
      section: 'Complete Questions to Ask Checklist – Office 👩🏼‍💻',
      lineItems: ['Input answers from Question Checklist into notes', 'Record property details']
    },
    'Input Lead Property Information': {
      section: 'Input Lead Property Information – Office 👩🏼‍💻',
      lineItems: ['Add Home View photos – Maps', 'Add Street View photos – Google Maps', 'Add elevation screenshot – PPRBD', 'Add property age – County Assessor Website', 'Evaluate ladder requirements – By looking at the room']
    },
    'Assign A Project Manager': {
      section: 'Assign A Project Manager – Office 👩🏼‍💻',
      lineItems: ['Use workflow from Lead Assigning Flowchart', 'Select and brief the Project Manager']
    },
    'Schedule Initial Inspection': {
      section: 'Schedule Initial Inspection – Office 👩🏼‍💻',
      lineItems: ['Call Customer and coordinate with PM schedule', 'Create Calendar Appointment in AL']
    }
  },
  'PROSPECT': {
    'Site Inspection': {
      section: 'Site Inspection – Project Manager 👷🏼',
      lineItems: ['Take site photos', 'Complete inspection form', 'Document material colors', 'Capture Hover photos', 'Present upgrade options']
    },
    'Write Estimate': {
      section: 'Write Estimate – Project Manager 👷🏼',
      lineItems: ['Fill out Estimate Form', 'Write initial estimate – AccuLynx', 'Write Customer Pay Estimates', 'Send for Approval']
    },
    'Insurance Process': {
      section: 'Insurance Process – Administration 📝',
      lineItems: ['Compare field vs insurance estimates', 'Identify supplemental items', 'Draft estimate in Xactimate']
    },
    'Agreement Preparation': {
      section: 'Agreement Preparation – Administration 📝',
      lineItems: ['Trade cost analysis', 'Prepare Estimate Forms', 'Match AL estimates', 'Calculate customer pay items', 'Send shingle/class4 email – PDF']
    },
    'Agreement Signing': {
      section: 'Agreement Signing – Administration 📝',
      lineItems: ['Review and send signature request', 'Record in QuickBooks', 'Process deposit', 'Collect signed disclaimers']
    }
  },
  'APPROVED': {
    'Administrative Setup': {
      section: 'Administrative Setup – Administration 📝',
      lineItems: ['Confirm shingle choice', 'Order materials', 'Create labor orders', 'Send labor order to roofing crew']
    },
    'Pre-Job Actions': {
      section: 'Pre-Job Actions – Office 👩🏼‍💻',
      lineItems: ['Pull permits']
    },
    'Prepare for Production': {
      section: 'Prepare for Production – Administration 📝',
      lineItems: ['All pictures in Job (Gutter, Ventilation, Elevation)', 'Verify Labor Order in Scheduler', 'Verify Material Orders', 'Subcontractor Work']
    }
  },
  'EXECUTION': {
    'Installation': {
      section: 'Installation – Field Director 🛠️',
      lineItems: ['Document work start', 'Capture progress photos', 'Daily Job Progress Note', 'Upload Pictures']
    },
    'Quality Check': {
      section: 'Quality Check – Field + Admin',
      lineItems: ['Completion photos – Roof Supervisor 🛠️', 'Complete inspection – Roof Supervisor 🛠️', 'Upload Roof Packet', 'Verify Packet is complete – Admin 📝']
    },
    'Multiple Trades': {
      section: 'Multiple Trades – Administration 📝',
      lineItems: ['Confirm start date', 'Confirm material/labor for all trades']
    },
    'Subcontractor Work': {
      section: 'Subcontractor Work – Administration 📝',
      lineItems: ['Coordinate with subcontractors', 'Verify subcontractor permits']
    }
  },
  'SECOND_SUPPLEMENT': {
    'Supplement Assessment': {
      section: 'Supplement Assessment – Administration 📝',
      lineItems: ['Assess additional damage', 'Document supplement needs', 'Prepare supplement estimate']
    },
    'Additional Work': {
      section: 'Additional Work – Field Director 🛠️',
      lineItems: ['Execute additional scope', 'Document additional work', 'Update completion status']
    }
  },
  'COMPLETION': {
    'Project Closeout': {
      section: 'Project Closeout – Administration 📝',
      lineItems: ['Final inspection completed', 'Customer walkthrough', 'Submit warranty information', 'Process final payment']
    },
    'Customer Satisfaction': {
      section: 'Customer Satisfaction – Administration 📝',
      lineItems: ['Send satisfaction survey', 'Collect customer feedback', 'Update customer records']
    }
  }
};

/**
 * Maps a step name to the correct section and line item structure
 */
const mapStepToWorkflowStructure = (stepName, phase) => {
  // Normalize phase name
  let normalizedPhase = phase ? phase.toString().toUpperCase() : 'LEAD';
  
  // Handle phase variations
  if (normalizedPhase === '2ND_SUPP') normalizedPhase = 'SECOND_SUPPLEMENT';
  if (normalizedPhase === 'SECOND_SUPP') normalizedPhase = 'SECOND_SUPPLEMENT';
  
  // Get phase structure
  const phaseStructure = workflowStructure[normalizedPhase];
  if (!phaseStructure) {
    return {
      section: 'General Workflow',
      lineItem: stepName || 'Workflow Step',
      phase: normalizedPhase
    };
  }
  
  // Direct exact matches first - but return specific line item, not section name
  if (phaseStructure[stepName]) {
    const sectionData = phaseStructure[stepName];
    // Return the first line item instead of the section name for stepName
    const firstLineItem = sectionData.lineItems && sectionData.lineItems.length > 0 
      ? sectionData.lineItems[0] 
      : stepName;
    
    return {
      section: sectionData.section,
      lineItem: firstLineItem,
      phase: normalizedPhase
    };
  }
  
  // Try to find matching section by checking step name variations
  for (const [sectionKey, sectionData] of Object.entries(phaseStructure)) {
    // Check for exact match
    if (stepName === sectionKey) {
      return {
        section: sectionData.section,
        lineItem: stepName,
        phase: normalizedPhase
      };
    }
    
    // Check if stepName contains the section key (case insensitive)
    if (stepName && stepName.toLowerCase().includes(sectionKey.toLowerCase())) {
      // Try to find specific line item
      const matchingLineItem = sectionData.lineItems.find(item => 
        stepName.toLowerCase().includes(item.toLowerCase()) || 
        item.toLowerCase().includes(stepName.toLowerCase())
      );
      
      return {
        section: sectionData.section,
        lineItem: matchingLineItem || stepName,
        phase: normalizedPhase
      };
    }
    
    // Check if stepName matches any of the line items (case insensitive)
    const matchingLineItem = sectionData.lineItems.find(item => 
      stepName && (
        stepName.toLowerCase().includes(item.toLowerCase()) || 
        item.toLowerCase().includes(stepName.toLowerCase())
      )
    );
    
    if (matchingLineItem) {
      return {
        section: sectionData.section,
        lineItem: matchingLineItem,
        phase: normalizedPhase
      };
    }
  }
  
  // Fallback with better defaults based on phase
  const phaseDefaults = {
    'LEAD': 'Lead Management – Office 👩🏼‍💻',
    'PROSPECT': 'Prospect Development – Project Manager 👷🏼',
    'APPROVED': 'Project Setup – Administration 📝',
    'EXECUTION': 'Project Execution – Field Director 🛠️',
    'SECOND_SUPPLEMENT': 'Supplement Work – Administration 📝',
    'COMPLETION': 'Project Completion – Administration 📝'
  };
  
  return {
    section: phaseDefaults[normalizedPhase] || 'General Workflow',
    lineItem: stepName || 'Workflow Step', 
    phase: normalizedPhase
  };
};

/**
 * Get all sections for a specific phase
 */
const getSectionsForPhase = (phase) => {
  const normalizedPhase = phase ? phase.toUpperCase() : 'LEAD';
  const phaseStructure = workflowStructure[normalizedPhase];
  
  if (!phaseStructure) return [];
  
  return Object.values(phaseStructure).map(sectionData => sectionData.section);
};

/**
 * Get section name from step name
 */
const getSectionFromStepName = (stepName, phase) => {
  const mapping = mapStepToWorkflowStructure(stepName, phase);
  return mapping.section;
};

/**
 * Transform workflow step to include section and lineItem fields
 */
const transformWorkflowStep = (step) => {
  const mapping = mapStepToWorkflowStructure(step.stepName, step.phase);
  
  return {
    ...step,
    section: mapping.section,
    lineItem: mapping.lineItem,
    // Also add computed fields for compatibility
    isActive: !step.isCompleted && step.actualStartDate != null
  };
};

/**
 * Transform workflow subtask to include parent section info
 */
const transformWorkflowSubTask = (subTask, parentStep) => {
  const mapping = mapStepToWorkflowStructure(parentStep.stepName, parentStep.phase);
  
  return {
    ...subTask,
    section: mapping.section,
    parentLineItem: mapping.lineItem,
    phase: parentStep.phase
  };
};

module.exports = {
  workflowStructure,
  mapStepToWorkflowStructure,
  getSectionsForPhase,
  getSectionFromStepName,
  transformWorkflowStep,
  transformWorkflowSubTask
};