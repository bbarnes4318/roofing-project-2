// Phase definitions with weights
const PHASES = {
  LEAD: { name: "Lead", weight: 10, steps: [] },
  PROSPECT: { name: "Prospect", weight: 15, steps: [] },
  APPROVED: { name: "Approved", weight: 15, steps: [] },
  EXECUTION: { name: "Execution", weight: 40, steps: [] },
  SECOND_SUPPLEMENT: { name: "2nd Supplement", weight: 10, steps: [] },
  COMPLETION: { name: "Completion", weight: 10, steps: [] }
};

// Step definitions with individual weights - Updated to match actual database step IDs
const WORKFLOW_STEPS = {
  LEAD: [
    { id: "input_customer_info", name: "Input Customer Information", weight: 2 }
  ],
  PROSPECT: [
    { id: "site_inspection", name: "Site Inspection", weight: 4 },
    { id: "write_estimate", name: "Write Estimate", weight: 3 }
  ],
  APPROVED: [
    { id: "agreement_signing", name: "Agreement Signing", weight: 3 }
  ],
  EXECUTION: [
    { id: "installation", name: "Installation", weight: 10 },
    { id: "quality_check", name: "Quality Check", weight: 5 }
  ],
  SECOND_SUPPLEMENT: [
    { id: "supplement_1", name: "Create Supp in Xactimate", weight: 3 },
    { id: "supplement_2", name: "Follow-Up Calls", weight: 2 },
    { id: "supplement_3", name: "Review Approved Supp", weight: 3 },
    { id: "supplement_4", name: "Customer Update", weight: 2 }
  ],
  COMPLETION: [
    { id: "financial_processing", name: "Financial Processing", weight: 5 },
    { id: "project_closeout", name: "Project Closeout", weight: 5 }
  ]
};

module.exports = {
  PHASES,
  WORKFLOW_STEPS
}; 