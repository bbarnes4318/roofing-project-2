export const teamMembers = [
  { id: 'user_1', name: 'Sarah Owner', email: 'sarah@example.com' },
  { id: 'user_2', name: 'Mike Field', email: 'mike@example.com' },
  { id: 'user_3', name: 'John Supervisor', email: 'john@example.com' },
];

export const initialProjects = [
  {
    id: 1,
    name: 'Wilson Residence Roof Replacement',
    type: 'Roofing',
    status: 'execution',
    estimateValue: 25000,
    progress: 35,
    startDate: 'May 31, 2024',
    endDate: 'Jun 14, 2024',
    client: { name: 'Betsy Stephens', phone: '(555) 123-4567', email: 'betsy.stephens@email.com' },
    location: '123 Main St, Anytown USA',
    teamSize: 2,
    duration: 14,
    messages: [
      { id: 1, author: 'Mike Field', avatar: 'M', content: 'Completed the initial inspection. Photos are uploaded. Decking looks solid.', timestamp: '2 hours ago'},
      { id: 2, author: 'Sarah Owner', avatar: 'S', content: 'Great, thanks Mike. Let\'s get the estimate finalized and sent over to the client by EOD.', timestamp: '1 hour ago' },
    ],
    checklist: [
      { id: 1, stage: 'Pre-Production', items: [ 
        { id: 1, text: 'Contract signed and uploaded', completed: true }, 
        { id: 2, text: 'Permit application submitted', completed: true }, 
        { id: 3, text: 'Material order finalized', completed: false } 
      ]},
      { id: 2, stage: 'Installation', items: [ 
        { id: 4, text: 'Material delivery confirmed', completed: false }, 
        { id: 5, text: 'Daily safety meeting conducted', completed: false }, 
        { id: 6, text: 'Tear-off complete', completed: false } 
      ]},
      { id: 3, stage: 'Closeout', items: [ 
        { id: 7, text: 'Final inspection passed', completed: false }, 
        { id: 8, text: 'Final invoice sent to customer', completed: false }, 
        { id: 9, text: 'Warranty documents delivered', completed: false } 
      ]},
    ]
  },
  {
    id: 2,
    name: 'Residential Siding Repair',
    type: 'Siding',
    status: 'lead',
    estimateValue: 45000,
    progress: 10,
    startDate: 'Jun 9, 2024',
    endDate: 'Jun 24, 2024',
    client: { name: 'Michael Rodriguez', phone: '(555) 987-6543', email: 'michael.rodriguez@email.com' },
    location: '456 Business Park, Anytown USA',
    teamSize: 4,
    duration: 15,
    messages: [ 
      { id: 3, author: 'Sarah Owner', avatar: 'S', content: 'We need to get the permit submitted for the Rodriguez job ASAP.', timestamp: 'Yesterday' } 
    ],
    checklist: [ 
      { id: 4, stage: 'Pre-Production', items: [ 
        { id: 10, text: 'Contract signed and uploaded', completed: true }, 
        { id: 11, text: 'Permit application submitted', completed: false }, 
        { id: 12, text: 'Material order finalized', completed: false } 
      ]} 
    ]
  }
];

export const initialTasks = [
  { id: 1, title: 'Roof inspection - 123 Main St', description: 'Complete safety inspection before work begins', assignedTo: 'user_2', projectId: 1, alertDate: '2024-06-04', priority: 'high', status: 'pending' },
  { id: 2, title: 'Submit insurance documentation', description: 'Upload all required forms to customer portal', assignedTo: 'user_3', projectId: 1, alertDate: '2024-06-02', priority: 'high', status: 'overdue' },
  { id: 3, title: 'Material delivery coordination', description: 'Coordinate with supplier for delivery schedule', assignedTo: 'user_3', projectId: 2, alertDate: '2024-06-10', priority: 'medium', status: 'in-progress' }
];

export const initialActivityData = [
  { id: 1, author: 'Mike Field', avatar: 'M', content: 'Completed the initial inspection for the Stephens Residence.', timestamp: '2 hours ago', projectId: 1, project: 'Stephens Residence Roof Replacement' },
  { id: 2, author: 'Sarah Owner', avatar: 'S', content: 'We need to get the permit submitted for the Rodriguez job ASAP.', timestamp: 'Yesterday', projectId: 2, project: 'Residential Siding Repair' },
  { id: 3, author: 'John Supervisor', avatar: 'J', content: 'Material delivery confirmed for Stephens job, scheduled for tomorrow morning.', timestamp: 'Yesterday', projectId: 1, project: 'Stephens Residence Roof Replacement' }
];
