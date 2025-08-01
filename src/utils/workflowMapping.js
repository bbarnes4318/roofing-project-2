// Centralized workflow mapping utility
// This ensures consistent section and line item names across all components

export const workflowStructure = {
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
  '2ND_SUPP': {
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
export const mapStepToWorkflowStructure = (stepName, phase) => {
  // Normalize phase name
  const normalizedPhase = phase ? phase.toUpperCase() : 'LEAD';
  
  // Get phase structure
  const phaseStructure = workflowStructure[normalizedPhase];
  if (!phaseStructure) {
    return {
      section: 'Unknown Section',
      lineItem: stepName || 'Unknown Line Item',
      phase: normalizedPhase
    };
  }
  
  // Try to find matching section by checking if stepName contains section key
  for (const [sectionKey, sectionData] of Object.entries(phaseStructure)) {
    // Check if stepName contains the section key
    if (stepName && stepName.includes(sectionKey)) {
      // Try to find specific line item
      const matchingLineItem = sectionData.lineItems.find(item => 
        stepName.includes(item) || item.includes(stepName)
      );
      
      return {
        section: sectionData.section,
        lineItem: matchingLineItem || stepName,
        phase: normalizedPhase
      };
    }
    
    // Check if stepName matches any of the line items
    const matchingLineItem = sectionData.lineItems.find(item => 
      stepName && (stepName.includes(item) || item.includes(stepName))
    );
    
    if (matchingLineItem) {
      return {
        section: sectionData.section,
        lineItem: matchingLineItem,
        phase: normalizedPhase
      };
    }
  }
  
  // Default fallback
  return {
    section: 'Unknown Section',
    lineItem: stepName || 'Unknown Line Item', 
    phase: normalizedPhase
  };
};

/**
 * Get all sections for a specific phase
 */
export const getSectionsForPhase = (phase) => {
  const normalizedPhase = phase ? phase.toUpperCase() : 'LEAD';
  const phaseStructure = workflowStructure[normalizedPhase];
  
  if (!phaseStructure) return [];
  
  return Object.values(phaseStructure).map(sectionData => sectionData.section);
};

/**
 * Get section name from step name
 */
export const getSectionFromStepName = (stepName, phase) => {
  const mapping = mapStepToWorkflowStructure(stepName, phase);
  return mapping.section;
};