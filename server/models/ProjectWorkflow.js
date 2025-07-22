const mongoose = require('mongoose');

const workflowSubTaskSchema = new mongoose.Schema({
  subTaskId: {
    type: String,
    required: true
  },
  subTaskName: {
    type: String,
    required: true
  },
  description: String,
  isCompleted: { type: Boolean, default: false },
  completedAt: Date,
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String
});

const workflowStepSchema = new mongoose.Schema({
  stepId: {
    type: String,
    required: true
  },
  stepName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  phase: {
    type: String,
    required: true,
    enum: ['Lead', 'Prospect', 'Approved', 'Execution', '2nd Supplement', 'Completion']
  },
  defaultResponsible: {
    type: String, // Default role
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Specific user assigned by admin
  },
  estimatedDuration: {
    type: Number, // in days
    required: true
  },
  subTasks: [workflowSubTaskSchema],
  dependencies: [String], // Array of stepIds that must be completed first
  
  // Alert configuration
  alertTriggers: {
    // Alert priority level
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium'
    },
    
    // Days before due date to send alerts based on priority
    // Low: within a few days (3-5 days)
    // Medium: Important 24-48 hrs (1-2 days)  
    // High: Urgent same day (0 days)
    alertDays: {
      type: Number,
      default: function() {
        switch(this.priority) {
          case 'High': return 0; // Same day
          case 'Medium': return 1; // 24-48 hrs (1-2 days)
          case 'Low': return 3; // Within a few days
          default: return 1;
        }
      }
    },
    
    // Alert intervals for overdue items
    overdueIntervals: {
      type: [Number], // [1, 3, 7] means alert after 1, 3, and 7 days overdue
      default: [1, 3, 7, 14]
    },
    
    // Who gets the alerts (in addition to assignedTo)
    alertRecipients: {
      primary: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Specific users
      escalation: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Escalation users
      cc: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] // CC users
    }
  },
  
  // Completion tracking
  isCompleted: { type: Boolean, default: false },
  completedAt: Date,
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Timing
  scheduledStartDate: Date,
  scheduledEndDate: Date,
  actualStartDate: Date,
  actualEndDate: Date,
  
  // Notes and documentation
  notes: String,
  completionNotes: String,
  attachments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }]
});

const projectWorkflowSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    unique: true
  },
  
  // Workflow definition
  workflowType: {
    type: String,
    enum: ['roofing', 'kitchen_remodel', 'bathroom_renovation', 'siding', 'windows', 'general'],
    default: 'roofing'
  },
  
  // Workflow steps in order
  steps: [workflowStepSchema],
  
  // Overall workflow status
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'on_hold', 'cancelled'],
    default: 'not_started'
  },
  
  // Current step tracking
  currentStepIndex: {
    type: Number,
    default: 0
  },
  
  // Progress tracking
  overallProgress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Timing
  workflowStartDate: Date,
  workflowEndDate: Date,
  estimatedCompletionDate: Date,
  actualCompletionDate: Date,
  
  // Alert preferences
  alertSettings: {
    enableAlerts: { type: Boolean, default: true },
    alertMethods: {
      type: [String],
      enum: ['in_app', 'email', 'sms'],
      default: ['in_app', 'email']
    },
    escalationEnabled: { type: Boolean, default: true },
    escalationDelayDays: { type: Number, default: 2 }
  },
  
  // Team assignments (admin can override defaults)
  teamAssignments: {
    office: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    administration: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    project_manager: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    field_director: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    roof_supervisor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
projectWorkflowSchema.index({ project: 1 });
projectWorkflowSchema.index({ status: 1 });
projectWorkflowSchema.index({ currentStepIndex: 1 });
projectWorkflowSchema.index({ 'steps.scheduledEndDate': 1 });
projectWorkflowSchema.index({ 'steps.isCompleted': 1 });
projectWorkflowSchema.index({ 'steps.assignedTo': 1 });

// Virtual for current step
projectWorkflowSchema.virtual('currentStep').get(function() {
  if (this.steps && this.steps.length > this.currentStepIndex) {
    return this.steps[this.currentStepIndex];
  }
  return null;
});

// Virtual for overdue steps
projectWorkflowSchema.virtual('overdueSteps').get(function() {
  if (!this.steps) return [];
  
  const now = new Date();
  return this.steps.filter(step => 
    !step.isCompleted && 
    step.scheduledEndDate && 
    step.scheduledEndDate < now
  );
});

// Virtual for upcoming steps (due in next 7 days)
projectWorkflowSchema.virtual('upcomingSteps').get(function() {
  if (!this.steps) return [];
  
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  return this.steps.filter(step => 
    !step.isCompleted && 
    step.scheduledEndDate && 
    step.scheduledEndDate >= now &&
    step.scheduledEndDate <= nextWeek
  );
});

// Static method to create detailed workflow template
projectWorkflowSchema.statics.createDetailedWorkflow = function(projectId, projectType, createdBy) {
  // Map project types to workflow types
  const workflowTypeMapping = {
    'Roof Replacement': 'roofing',
    'Kitchen Remodel': 'kitchen_remodel',
    'Bathroom Renovation': 'bathroom_renovation',
    'Siding Installation': 'siding',
    'Window Replacement': 'windows',
    'Flooring': 'general',
    'Painting': 'general',
    'Electrical Work': 'general',
    'Plumbing': 'general',
    'HVAC': 'general',
    'Deck Construction': 'general',
    'Landscaping': 'general',
    'Other': 'general'
  };

  const mappedWorkflowType = workflowTypeMapping[projectType] || 'general';

  const detailedWorkflowTemplate = [
    // LEAD PHASE
    {
      stepId: 'lead_1',
      stepName: 'Input Customer Information',
      description: 'Input customer information and verify details',
      phase: 'Lead',
      defaultResponsible: 'office',
      estimatedDuration: 1,
      subTasks: [
        { subTaskId: 'lead_1_1', subTaskName: 'Make sure the name is spelled correctly' },
        { subTaskId: 'lead_1_2', subTaskName: 'Make sure the email is correct. Send a confirmation email to confirm email.' }
      ],
      alertTriggers: {
        priority: 'Medium',
        alertRecipients: { primary: [], escalation: [], cc: [] }
      }
    },
    {
      stepId: 'lead_2',
      stepName: 'Complete Questions to Ask Checklist',
      description: 'Complete customer questions checklist and record details',
      phase: 'Lead',
      defaultResponsible: 'office',
      estimatedDuration: 1,
      dependencies: ['lead_1'],
      subTasks: [
        { subTaskId: 'lead_2_1', subTaskName: 'Input answers from Question Checklist into notes' },
        { subTaskId: 'lead_2_2', subTaskName: 'Record property details' }
      ],
      alertTriggers: {
        priority: 'Medium',
        alertRecipients: { primary: [], escalation: [], cc: [] }
      }
    },
    {
      stepId: 'lead_3',
      stepName: 'Input Lead Property Information',
      description: 'Gather and input all property information and photos',
      phase: 'Lead',
      defaultResponsible: 'office',
      estimatedDuration: 1,
      dependencies: ['lead_2'],
      subTasks: [
        { subTaskId: 'lead_3_1', subTaskName: 'Add Home View photos – Maps' },
        { subTaskId: 'lead_3_2', subTaskName: 'Add Street View photos – Google Maps' },
        { subTaskId: 'lead_3_3', subTaskName: 'Add elevation screenshot – PPRBD' },
        { subTaskId: 'lead_3_4', subTaskName: 'Add property age – County Assessor Website' },
        { subTaskId: 'lead_3_5', subTaskName: 'Evaluate ladder requirements – By looking at the room' }
      ],
      alertTriggers: {
        priority: 'Medium',
        alertRecipients: { primary: [], escalation: [], cc: [] }
      }
    },
    {
      stepId: 'lead_4',
      stepName: 'Assign A Project Manager',
      description: 'Select and assign project manager using workflow',
      phase: 'Lead',
      defaultResponsible: 'office',
      estimatedDuration: 1,
      dependencies: ['lead_3'],
      subTasks: [
        { subTaskId: 'lead_4_1', subTaskName: 'Use workflow from Lead Assigning Flowchart' },
        { subTaskId: 'lead_4_2', subTaskName: 'Select and brief the Project Manager' }
      ],
      alertTriggers: {
        priority: 'Medium',
        alertRecipients: { primary: [], escalation: [], cc: [] }
      }
    },
    {
      stepId: 'lead_5',
      stepName: 'Schedule Initial Inspection',
      description: 'Coordinate and schedule initial inspection',
      phase: 'Lead',
      defaultResponsible: 'office',
      estimatedDuration: 1,
      dependencies: ['lead_4'],
      subTasks: [
        { subTaskId: 'lead_5_1', subTaskName: 'Call Customer and coordinate with PM schedule' },
        { subTaskId: 'lead_5_2', subTaskName: 'Create Calendar Appointment in AL' }
      ],
      alertTriggers: {
        priority: 'Medium',
        alertRecipients: { primary: [], escalation: [], cc: [] }
      }
    },

    // PROSPECT PHASE
    {
      stepId: 'prospect_1',
      stepName: 'Site Inspection',
      description: 'Conduct comprehensive site inspection',
      phase: 'Prospect',
      defaultResponsible: 'project_manager',
      estimatedDuration: 1,
      dependencies: ['lead_5'],
      subTasks: [
        { subTaskId: 'prospect_1_1', subTaskName: 'Take site photos' },
        { subTaskId: 'prospect_1_2', subTaskName: 'Complete inspection form' },
        { subTaskId: 'prospect_1_3', subTaskName: 'Document material colors' },
        { subTaskId: 'prospect_1_4', subTaskName: 'Capture Hover photos' },
        { subTaskId: 'prospect_1_5', subTaskName: 'Present upgrade options' }
      ],
      alertTriggers: {
        priority: 'Medium',
        alertRecipients: { primary: [], escalation: [], cc: [] }
      }
    },
    {
      stepId: 'prospect_2',
      stepName: 'Write Estimate',
      description: 'Prepare detailed project estimate',
      phase: 'Prospect',
      defaultResponsible: 'project_manager',
      estimatedDuration: 2,
      dependencies: ['prospect_1'],
      subTasks: [
        { subTaskId: 'prospect_2_1', subTaskName: 'Fill out Estimate Form' },
        { subTaskId: 'prospect_2_2', subTaskName: 'Write initial estimate – AccuLynx' },
        { subTaskId: 'prospect_2_3', subTaskName: 'Write Customer Pay Estimates' },
        { subTaskId: 'prospect_2_4', subTaskName: 'Send for Approval' }
      ],
      alertTriggers: {
        priority: 'Medium',
        alertRecipients: { primary: [], escalation: [], cc: [] }
      }
    },
    {
      stepId: 'prospect_3',
      stepName: 'Insurance Process',
      description: 'Process insurance estimates and supplements',
      phase: 'Prospect',
      defaultResponsible: 'administration',
      estimatedDuration: 2,
      dependencies: ['prospect_2'],
      subTasks: [
        { subTaskId: 'prospect_3_1', subTaskName: 'Compare field vs insurance estimates' },
        { subTaskId: 'prospect_3_2', subTaskName: 'Identify supplemental items' },
        { subTaskId: 'prospect_3_3', subTaskName: 'Draft estimate in Xactimate' }
      ],
      alertTriggers: {
        priority: 'Medium',
        alertRecipients: { primary: [], escalation: [], cc: [] }
      }
    },
    {
      stepId: 'prospect_4',
      stepName: 'Agreement Preparation',
      description: 'Prepare customer agreement and estimates',
      phase: 'Prospect',
      defaultResponsible: 'administration',
      estimatedDuration: 1,
      dependencies: ['prospect_3'],
      subTasks: [
        { subTaskId: 'prospect_4_1', subTaskName: 'Trade cost analysis' },
        { subTaskId: 'prospect_4_2', subTaskName: 'Prepare Estimate Forms' },
        { subTaskId: 'prospect_4_3', subTaskName: 'Match AL estimates' },
        { subTaskId: 'prospect_4_4', subTaskName: 'Calculate customer pay items' },
        { subTaskId: 'prospect_4_5', subTaskName: 'Send shingle/class4 email – PDF' }
      ],
      alertTriggers: {
        priority: 'Medium',
        alertRecipients: { primary: [], escalation: [], cc: [] }
      }
    },
    {
      stepId: 'prospect_5',
      stepName: 'Agreement Signing',
      description: 'Process agreement signing and deposits',
      phase: 'Prospect',
      defaultResponsible: 'administration',
      estimatedDuration: 1,
      dependencies: ['prospect_4'],
      subTasks: [
        { subTaskId: 'prospect_5_1', subTaskName: 'Review and send signature request' },
        { subTaskId: 'prospect_5_2', subTaskName: 'Record in QuickBooks' },
        { subTaskId: 'prospect_5_3', subTaskName: 'Process deposit' },
        { subTaskId: 'prospect_5_4', subTaskName: 'Collect signed disclaimers' }
      ],
      alertTriggers: {
        priority: 'Medium',
        alertRecipients: { primary: [], escalation: [], cc: [] }
      }
    },

    // APPROVED PHASE
    {
      stepId: 'approved_1',
      stepName: 'Administrative Setup',
      description: 'Setup administrative requirements for project',
      phase: 'Approved',
      defaultResponsible: 'administration',
      estimatedDuration: 1,
      dependencies: ['prospect_5'],
      subTasks: [
        { subTaskId: 'approved_1_1', subTaskName: 'Confirm shingle choice' },
        { subTaskId: 'approved_1_2', subTaskName: 'Order materials' },
        { subTaskId: 'approved_1_3', subTaskName: 'Create labor orders' },
        { subTaskId: 'approved_1_4', subTaskName: 'Send labor order to roofing crew' }
      ],
      alertTriggers: {
        priority: 'Medium',
        alertRecipients: { primary: [], escalation: [], cc: [] }
      }
    },
    {
      stepId: 'approved_2',
      stepName: 'Pre-Job Actions',
      description: 'Complete pre-job requirements',
      phase: 'Approved',
      defaultResponsible: 'office',
      estimatedDuration: 1,
      dependencies: ['approved_1'],
      subTasks: [
        { subTaskId: 'approved_2_1', subTaskName: 'Pull permits' }
      ],
      alertTriggers: {
        priority: 'Medium',
        alertRecipients: { primary: [], escalation: [], cc: [] }
      }
    },
    {
      stepId: 'approved_3',
      stepName: 'Prepare for Production',
      description: 'Final production preparation and coordination',
      phase: 'Approved',
      defaultResponsible: 'administration',
      estimatedDuration: 2,
      dependencies: ['approved_2'],
      subTasks: [
        { subTaskId: 'approved_3_1', subTaskName: 'All pictures in Job (Gutter, Ventilation, Elevation)' },
        { subTaskId: 'approved_3_2', subTaskName: 'Verify Labor Order in Scheduler - Correct Dates' },
        { subTaskId: 'approved_3_3', subTaskName: 'Verify Labor Order in Scheduler - Correct crew' },
        { subTaskId: 'approved_3_4', subTaskName: 'Send install schedule email to customer' },
        { subTaskId: 'approved_3_5', subTaskName: 'Verify Material Orders - Confirmations from supplier' },
        { subTaskId: 'approved_3_6', subTaskName: 'Verify Material Orders - Call if no confirmation' },
        { subTaskId: 'approved_3_7', subTaskName: 'Provide special crew instructions' },
        { subTaskId: 'approved_3_8', subTaskName: 'Subcontractor Work - Work order in scheduler' },
        { subTaskId: 'approved_3_9', subTaskName: 'Subcontractor Work - Schedule subcontractor' },
        { subTaskId: 'approved_3_10', subTaskName: 'Subcontractor Work - Communicate with customer' }
      ],
      alertTriggers: {
        priority: 'Medium',
        alertRecipients: { primary: [], escalation: [], cc: [] }
      }
    },

    // EXECUTION PHASE
    {
      stepId: 'execution_1',
      stepName: 'Installation',
      description: 'Field installation and documentation',
      phase: 'Execution',
      defaultResponsible: 'field_director',
      estimatedDuration: 5,
      dependencies: ['approved_3'],
      subTasks: [
        { subTaskId: 'execution_1_1', subTaskName: 'Document work start' },
        { subTaskId: 'execution_1_2', subTaskName: 'Capture progress photos' },
        { subTaskId: 'execution_1_3', subTaskName: 'Daily Job Progress Note - Work started/finished' },
        { subTaskId: 'execution_1_4', subTaskName: 'Daily Job Progress Note - Days and people needed' },
        { subTaskId: 'execution_1_5', subTaskName: 'Daily Job Progress Note - Format: 2 Guys for 4 hours' },
        { subTaskId: 'execution_1_6', subTaskName: 'Upload Pictures' }
      ],
      alertTriggers: {
        priority: 'Medium',
        alertRecipients: { primary: [], escalation: [], cc: [] }
      }
    },
    {
      stepId: 'execution_2',
      stepName: 'Quality Check',
      description: 'Quality inspection and documentation',
      phase: 'Execution',
      defaultResponsible: 'roof_supervisor',
      estimatedDuration: 1,
      dependencies: ['execution_1'],
      subTasks: [
        { subTaskId: 'execution_2_1', subTaskName: 'Completion photos – Roof Supervisor' },
        { subTaskId: 'execution_2_2', subTaskName: 'Complete inspection – Roof Supervisor' },
        { subTaskId: 'execution_2_3', subTaskName: 'Upload Roof Packet' },
        { subTaskId: 'execution_2_4', subTaskName: 'Verify Packet is complete – Admin' }
      ],
      alertTriggers: {
        priority: 'Medium',
        alertRecipients: { primary: [], escalation: [], cc: [] }
      }
    },
    {
      stepId: 'execution_3',
      stepName: 'Multiple Trades',
      description: 'Coordinate multiple trade work',
      phase: 'Execution',
      defaultResponsible: 'administration',
      estimatedDuration: 1,
      dependencies: ['execution_2'],
      subTasks: [
        { subTaskId: 'execution_3_1', subTaskName: 'Confirm start date' },
        { subTaskId: 'execution_3_2', subTaskName: 'Confirm material/labor for all trades' }
      ],
      alertTriggers: {
        priority: 'Medium',
        alertRecipients: { primary: [], escalation: [], cc: [] }
      }
    },
    {
      stepId: 'execution_4',
      stepName: 'Subcontractor Work',
      description: 'Manage subcontractor coordination',
      phase: 'Execution',
      defaultResponsible: 'administration',
      estimatedDuration: 1,
      dependencies: ['execution_3'],
      subTasks: [
        { subTaskId: 'execution_4_1', subTaskName: 'Confirm dates' },
        { subTaskId: 'execution_4_2', subTaskName: 'Communicate with customer' }
      ],
      alertTriggers: {
        priority: 'Medium',
        alertRecipients: { primary: [], escalation: [], cc: [] }
      }
    },
    {
      stepId: 'execution_5',
      stepName: 'Update Customer',
      description: 'Customer completion notification and payment',
      phase: 'Execution',
      defaultResponsible: 'administration',
      estimatedDuration: 1,
      dependencies: ['execution_4'],
      subTasks: [
        { subTaskId: 'execution_5_1', subTaskName: 'Notify of completion' },
        { subTaskId: 'execution_5_2', subTaskName: 'Share photos' },
        { subTaskId: 'execution_5_3', subTaskName: 'Send 2nd half payment link' }
      ],
      alertTriggers: {
        priority: 'Medium',
        alertRecipients: { primary: [], escalation: [], cc: [] }
      }
    },

    // 2ND SUPPLEMENT PHASE
    {
      stepId: 'supplement_1',
      stepName: 'Create Supp in Xactimate',
      description: 'Create supplement in Xactimate system',
      phase: '2nd Supplement',
      defaultResponsible: 'administration',
      estimatedDuration: 2,
      dependencies: ['execution_5'],
      subTasks: [
        { subTaskId: 'supplement_1_1', subTaskName: 'Check Roof Packet & Checklist' },
        { subTaskId: 'supplement_1_2', subTaskName: 'Label photos' },
        { subTaskId: 'supplement_1_3', subTaskName: 'Add to Xactimate' },
        { subTaskId: 'supplement_1_4', subTaskName: 'Submit to insurance' }
      ],
      alertTriggers: {
        priority: 'Medium',
        alertRecipients: { primary: [], escalation: [], cc: [] }
      }
    },
    {
      stepId: 'supplement_2',
      stepName: 'Follow-Up Calls',
      description: 'Insurance follow-up calls',
      phase: '2nd Supplement',
      defaultResponsible: 'administration',
      estimatedDuration: 7,
      dependencies: ['supplement_1'],
      subTasks: [
        { subTaskId: 'supplement_2_1', subTaskName: 'Call 2x/week until updated estimate' }
      ],
      alertTriggers: {
        priority: 'Medium',
        alertRecipients: { primary: [], escalation: [], cc: [] }
      }
    },
    {
      stepId: 'supplement_3',
      stepName: 'Review Approved Supp',
      description: 'Review and process approved supplement',
      phase: '2nd Supplement',
      defaultResponsible: 'administration',
      estimatedDuration: 1,
      dependencies: ['supplement_2'],
      subTasks: [
        { subTaskId: 'supplement_3_1', subTaskName: 'Update trade cost' },
        { subTaskId: 'supplement_3_2', subTaskName: 'Prepare counter-supp or email' },
        { subTaskId: 'supplement_3_3', subTaskName: 'Add to AL Estimate' }
      ],
      alertTriggers: {
        priority: 'Medium',
        alertRecipients: { primary: [], escalation: [], cc: [] }
      }
    },
    {
      stepId: 'supplement_4',
      stepName: 'Customer Update',
      description: 'Update customer on supplement status',
      phase: '2nd Supplement',
      defaultResponsible: 'administration',
      estimatedDuration: 1,
      dependencies: ['supplement_3'],
      subTasks: [
        { subTaskId: 'supplement_4_1', subTaskName: 'Share 2 items minimum' },
        { subTaskId: 'supplement_4_2', subTaskName: 'Let them know next steps' }
      ],
      alertTriggers: {
        priority: 'Medium',
        alertRecipients: { primary: [], escalation: [], cc: [] }
      }
    },

    // COMPLETION PHASE
    {
      stepId: 'completion_1',
      stepName: 'Financial Processing',
      description: 'Process final financial items',
      phase: 'Completion',
      defaultResponsible: 'administration',
      estimatedDuration: 2,
      dependencies: ['supplement_4'],
      subTasks: [
        { subTaskId: 'completion_1_1', subTaskName: 'Verify worksheet' },
        { subTaskId: 'completion_1_2', subTaskName: 'Final invoice & payment link' },
        { subTaskId: 'completion_1_3', subTaskName: 'AR follow-up calls' }
      ],
      alertTriggers: {
        priority: 'Medium',
        alertRecipients: { primary: [], escalation: [], cc: [] }
      }
    },
    {
      stepId: 'completion_2',
      stepName: 'Project Closeout',
      description: 'Complete project closeout procedures',
      phase: 'Completion',
      defaultResponsible: 'office',
      estimatedDuration: 1,
      dependencies: ['completion_1'],
      subTasks: [
        { subTaskId: 'completion_2_1', subTaskName: 'Register warranty' },
        { subTaskId: 'completion_2_2', subTaskName: 'Send documentation' },
        { subTaskId: 'completion_2_3', subTaskName: 'Submit insurance paperwork' },
        { subTaskId: 'completion_2_4', subTaskName: 'Send final receipt and close job' }
      ],
      alertTriggers: {
        priority: 'Medium',
        alertRecipients: { primary: [], escalation: [], cc: [] }
      }
    }
  ];

  return this.create({
    project: projectId,
    workflowType: mappedWorkflowType,
    steps: detailedWorkflowTemplate,
    createdBy: createdBy
  });
};

// Instance method to get steps requiring alerts
projectWorkflowSchema.methods.getStepsRequiringAlerts = function() {
  if (!this.steps) return [];
  
  const now = new Date();
  const alertSteps = [];
  
  this.steps.forEach(step => {
    if (step.isCompleted) return;
    
    const scheduledEnd = step.scheduledEndDate;
    if (!scheduledEnd) return;
    
    const daysUntilDue = Math.ceil((scheduledEnd - now) / (1000 * 60 * 60 * 24));
    const daysOverdue = Math.ceil((now - scheduledEnd) / (1000 * 60 * 60 * 24));
    
    // Set default alert triggers if missing
    const alertDays = step.alertTriggers?.alertDays || 1; // Default: alert 1 day before due
    const overdueIntervals = step.alertTriggers?.overdueIntervals || [1, 3, 7]; // Default: alert 1, 3, 7 days overdue
    
    // Check if alert needed
    if (daysUntilDue <= alertDays && daysUntilDue > 0) {
      alertSteps.push({
        step: step,
        alertType: 'warning',
        daysUntilDue: daysUntilDue
      });
    }
    
    // Check if urgent alert needed (due today)
    if (daysUntilDue === 0) {
      alertSteps.push({
        step: step,
        alertType: 'urgent',
        daysUntilDue: 0
      });
    }
    
    // Check if overdue alert needed
    if (daysOverdue > 0 && overdueIntervals.includes(daysOverdue)) {
      alertSteps.push({
        step: step,
        alertType: 'overdue',
        daysOverdue: daysOverdue
      });
    }
  });
  
  return alertSteps;
};

// Instance method to assign team member to step
projectWorkflowSchema.methods.assignTeamMemberToStep = function(stepId, userId) {
  const step = this.steps.find(s => s.stepId === stepId);
  if (step) {
    step.assignedTo = userId;
    return this.save();
  }
  return Promise.reject(new Error('Step not found'));
};

// Instance method to schedule step dates
projectWorkflowSchema.methods.scheduleStepDates = function(projectStartDate, projectEndDate) {
  if (!this.steps || this.steps.length === 0) return;
  
  const totalDuration = this.steps.reduce((sum, step) => sum + step.estimatedDuration, 0);
  const projectDuration = Math.ceil((projectEndDate - projectStartDate) / (1000 * 60 * 60 * 24));
  
  let currentDate = new Date(projectStartDate);
  
  this.steps.forEach(step => {
    step.scheduledStartDate = new Date(currentDate);
    
    // Calculate duration based on project timeline
    const stepDuration = Math.ceil((step.estimatedDuration / totalDuration) * projectDuration);
    currentDate.setDate(currentDate.getDate() + stepDuration);
    
    step.scheduledEndDate = new Date(currentDate);
  });
  
  this.estimatedCompletionDate = new Date(currentDate);
  return this.save();
};

module.exports = mongoose.model('ProjectWorkflow', projectWorkflowSchema); 