// Mock data for dashboard components
export const mockProjects = [
  {
    id: 1,
    projectName: "Johnson Residence Roof Replacement",
    projectNumber: "PRJ-001",
    startDate: "2025-09-15",
    endDate: "2025-10-30",
    status: "active",
    budget: 12500,
    expenses: 8750,
    responsibleTeam: "Team Alpha",
    priority: "High",
    clientName: "Robert Johnson",
    clientEmail: "robert.johnson@email.com",
    projectManager: "Sarah Owner",
    phase: "execution"
  },
  {
    id: 2,
    projectName: "Smith Commercial Roof Repair",
    projectNumber: "PRJ-002",
    startDate: "2025-09-01",
    endDate: "2025-11-15",
    status: "active",
    budget: 35000,
    expenses: 15200,
    responsibleTeam: "Team Beta",
    priority: "Medium",
    clientName: "Smith Corporation",
    clientEmail: "contact@smithcorp.com",
    projectManager: "Mike Foreman",
    phase: "prospect"
  },
  {
    id: 3,
    projectName: "Williams Garage Roof Installation",
    projectNumber: "PRJ-003",
    startDate: "2025-08-20",
    endDate: "2025-09-25",
    status: "completed",
    budget: 8500,
    expenses: 7200,
    responsibleTeam: "Team Gamma",
    priority: "Low",
    clientName: "Jennifer Williams",
    clientEmail: "jenn.williams@email.com",
    projectManager: "Sarah Owner",
    phase: "completion"
  },
  {
    id: 4,
    projectName: "Davis Apartment Complex Roofing",
    projectNumber: "PRJ-004",
    startDate: "2025-10-05",
    endDate: "2025-12-20",
    status: "planning",
    budget: 45000,
    expenses: 0,
    responsibleTeam: "Team Delta",
    priority: "High",
    clientName: "Davis Properties LLC",
    clientEmail: "info@davisproperties.com",
    projectManager: "Tom Supervisor",
    phase: "lead"
  },
  {
    id: 5,
    projectName: "Miller Office Building Roof Maintenance",
    projectNumber: "PRJ-005",
    startDate: "2025-09-10",
    endDate: "2025-10-10",
    status: "active",
    budget: 18500,
    expenses: 9800,
    responsibleTeam: "Team Epsilon",
    priority: "Medium",
    clientName: "Miller & Associates",
    clientEmail: "miller@business.com",
    projectManager: "Lisa Manager",
    phase: "approved"
  }
];

export const mockMessages = [
  {
    id: "message_1",
    projectId: 1,
    projectName: "Johnson Residence Roof Replacement",
    type: "project_update",
    subject: "Material Delivery Update",
    description: "Shingles delivered and ready for installation tomorrow",
    user: "Mike Foreman",
    timestamp: "2025-09-24T10:30:00Z",
    priority: "medium"
  },
  {
    id: "message_2",
    projectId: 2,
    projectName: "Smith Commercial Roof Repair",
    type: "customer_communication",
    subject: "Client Meeting Notes",
    description: "Discussed additional waterproofing requirements for the east wing",
    user: "Sarah Owner",
    timestamp: "2025-09-23T14:15:00Z",
    priority: "high"
  },
  {
    id: "message_3",
    projectId: 1,
    projectName: "Johnson Residence Roof Replacement",
    type: "schedule_change",
    subject: "Schedule Adjustment",
    description: "Installation delayed by one day due to weather forecast",
    user: "Tom Supervisor",
    timestamp: "2025-09-23T09:45:00Z",
    priority: "medium"
  },
  {
    id: "message_4",
    projectId: 3,
    projectName: "Williams Garage Roof Installation",
    type: "project_update",
    subject: "Project Completion",
    description: "Final inspection passed. Project officially completed",
    user: "Lisa Manager",
    timestamp: "2025-09-22T16:20:00Z",
    priority: "low"
  },
  {
    id: "message_5",
    projectId: 4,
    projectName: "Davis Apartment Complex Roofing",
    type: "documentation",
    subject: "Permit Status",
    description: "Building permits approved and on file",
    user: "Robert Johnson",
    timestamp: "2025-09-22T11:30:00Z",
    priority: "high"
  },
  {
    id: "message_6",
    projectId: 5,
    projectName: "Miller Office Building Roof Maintenance",
    type: "quality_check",
    subject: "Safety Inspection Results",
    description: "All safety protocols met. Work can proceed as scheduled",
    user: "Mike Foreman",
    timestamp: "2025-09-21T13:45:00Z",
    priority: "medium"
  },
  {
    id: "message_7",
    projectId: 2,
    projectName: "Smith Commercial Roof Repair",
    type: "budget_discussion",
    subject: "Budget Approval",
    description: "Client approved additional materials budget",
    user: "Sarah Owner",
    timestamp: "2025-09-21T10:15:00Z",
    priority: "high"
  },
  {
    id: "message_8",
    projectId: 1,
    projectName: "Johnson Residence Roof Replacement",
    type: "crew_assignment",
    subject: "Crew Schedule Update",
    description: "Added two additional roofers to the team for faster completion",
    user: "Tom Supervisor",
    timestamp: "2025-09-20T08:30:00Z",
    priority: "medium"
  }
];

export const mockTasks = [
  {
    id: "task_1",
    projectId: 1,
    projectName: "Johnson Residence Roof Replacement",
    title: "Order additional flashing materials",
    description: "Need to order extra flashing for the chimney installation",
    assignedTo: "Mike Foreman",
    dueDate: "2025-09-26",
    priority: "high",
    status: "pending"
  },
  {
    id: "task_2",
    projectId: 2,
    projectName: "Smith Commercial Roof Repair",
    title: "Schedule client meeting",
    description: "Meet with client to discuss waterproofing options",
    assignedTo: "Sarah Owner",
    dueDate: "2025-09-28",
    priority: "medium",
    status: "in-progress"
  },
  {
    id: "task_3",
    projectId: 1,
    projectName: "Johnson Residence Roof Replacement",
    title: "Complete roof deck inspection",
    description: "Inspect roof deck for any damage before shingle installation",
    assignedTo: "Tom Supervisor",
    dueDate: "2025-09-25",
    priority: "high",
    status: "pending"
  },
  {
    id: "task_4",
    projectId: 4,
    projectName: "Davis Apartment Complex Roofing",
    title: "Submit building permits",
    description: "File all necessary permits with the city building department",
    assignedTo: "Lisa Manager",
    dueDate: "2025-09-30",
    priority: "medium",
    status: "pending"
  },
  {
    id: "task_5",
    projectId: 5,
    projectName: "Miller Office Building Roof Maintenance",
    title: "Perform quarterly maintenance check",
    description: "Check all roof sections for wear and tear, document findings",
    assignedTo: "Mike Foreman",
    dueDate: "2025-10-05",
    priority: "low",
    status: "pending"
  },
  {
    id: "task_6",
    projectId: 3,
    projectName: "Williams Garage Roof Installation",
    title: "Final documentation",
    description: "Complete all project documentation and file reports",
    assignedTo: "Sarah Owner",
    dueDate: "2025-09-27",
    priority: "medium",
    status: "completed"
  },
  {
    id: "task_7",
    projectId: 2,
    projectName: "Smith Commercial Roof Repair",
    title: "Order premium waterproofing materials",
    description: "Purchase specified premium materials for east wing repair",
    assignedTo: "Tom Supervisor",
    dueDate: "2025-09-29",
    priority: "high",
    status: "in-progress"
  },
  {
    id: "task_8",
    projectId: 5,
    projectName: "Miller Office Building Roof Maintenance",
    title: "Coordinate with facility manager",
    description: "Schedule access to roof areas with building facility manager",
    assignedTo: "Lisa Manager",
    dueDate: "2025-10-02",
    priority: "medium",
    status: "pending"
  },
  {
    id: "task_9",
    projectId: 1,
    projectName: "Johnson Residence Roof Replacement",
    title: "Safety equipment check",
    description: "Verify all safety equipment is functional before work begins",
    assignedTo: "Mike Foreman",
    dueDate: "2025-09-24",
    priority: "high",
    status: "overdue"
  },
  {
    id: "task_10",
    projectId: 4,
    projectName: "Davis Apartment Complex Roofing",
    title: "Review contract terms",
    description: "Ensure all contract terms are understood before signing",
    assignedTo: "Sarah Owner",
    dueDate: "2025-09-27",
    priority: "medium",
    status: "pending"
  }
];

export const mockReminders = [
  {
    id: "reminder_1",
    projectId: 1,
    projectName: "Johnson Residence Roof Replacement",
    title: "Weekly Progress Meeting",
    description: "Team meeting to discuss progress and upcoming tasks",
    when: "2025-09-25T09:00:00Z",
    createdBy: "Sarah Owner",
    priority: "medium"
  },
  {
    id: "reminder_2",
    projectId: 2,
    projectName: "Smith Commercial Roof Repair",
    title: "Client Follow-up Call",
    description: "Call client to confirm waterproofing material selection",
    when: "2025-09-26T14:00:00Z",
    createdBy: "Mike Foreman",
    priority: "high"
  },
  {
    id: "reminder_3",
    projectId: 3,
    projectName: "Williams Garage Roof Installation",
    title: "Final Payment Due",
    description: "Send final invoice and collect payment from client",
    when: "2025-09-30T10:00:00Z",
    createdBy: "Tom Supervisor",
    priority: "medium"
  },
  {
    id: "reminder_4",
    projectId: 4,
    projectName: "Davis Apartment Complex Roofing",
    title: "Permit Application Deadline",
    description: "Submit permit application before deadline to avoid delays",
    when: "2025-09-28T16:00:00Z",
    createdBy: "Lisa Manager",
    priority: "high"
  },
  {
    id: "reminder_5",
    projectId: 5,
    projectName: "Miller Office Building Roof Maintenance",
    title: "Equipment Maintenance",
    description: "Schedule maintenance for roofing equipment and tools",
    when: "2025-10-01T08:00:00Z",
    createdBy: "Robert Johnson",
    priority: "low"
  },
  {
    id: "reminder_6",
    projectId: 1,
    projectName: "Johnson Residence Roof Replacement",
    title: "Material Delivery Confirmation",
    description: "Confirm delivery of additional materials with supplier",
    when: "2025-09-27T11:00:00Z",
    createdBy: "Sarah Owner",
    priority: "medium"
  },
  {
    id: "reminder_7",
    projectId: 2,
    projectName: "Smith Commercial Roof Repair",
    title: "Safety Inspection",
    description: "Conduct mandatory safety inspection of work site",
    when: "2025-09-29T07:30:00Z",
    createdBy: "Mike Foreman",
    priority: "high"
  },
  {
    id: "reminder_8",
    projectId: 4,
    projectName: "Davis Apartment Complex Roofing",
    title: "Contract Review Meeting",
    description: "Review contract terms with legal team before signing",
    when: "2025-09-26T15:00:00Z",
    createdBy: "Tom Supervisor",
    priority: "medium"
  }
];

// Mock team members
export const mockTeamMembers = [
  {
    id: "user_1",
    firstName: "Sarah",
    lastName: "Owner",
    email: "sarah.owner@company.com",
    role: "PROJECT_MANAGER"
  },
  {
    id: "user_2",
    firstName: "Mike",
    lastName: "Foreman",
    email: "mike.foreman@company.com",
    role: "FIELD_DIRECTOR"
  },
  {
    id: "user_3",
    firstName: "Tom",
    lastName: "Supervisor",
    email: "tom.supervisor@company.com",
    role: "PROJECT_MANAGER"
  },
  {
    id: "user_4",
    firstName: "Lisa",
    lastName: "Manager",
    email: "lisa.manager@company.com",
    role: "ADMINISTRATION"
  },
  {
    id: "user_5",
    firstName: "Robert",
    lastName: "Johnson",
    email: "robert.johnson@company.com",
    role: "OFFICE"
  }
];
