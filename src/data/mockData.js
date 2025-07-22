export const teamMembers = [
    { id: 'user_1', name: 'Sarah Owner', email: 'sarah@example.com' },
    { id: 'user_2', name: 'Mike Field', email: 'mike@example.com' },
    { id: 'user_3', name: 'John Supervisor', email: 'john@example.com' },
];

export const crews = [
    {
        id: 1,
        name: 'Roofing Crew A',
        type: 'Roofing',
        members: ['Mike Field', 'Tom Wilson', 'Carlos Rodriguez'],
        capacity: 3,
        color: 'bg-blue-500',
        specialties: ['Shingle Installation', 'Metal Roofing', 'Roof Repairs']
    },
    {
        id: 2,
        name: 'Siding Crew B',
        type: 'Siding',
        members: ['John Supervisor', 'Dave Johnson', 'Mark Davis'],
        capacity: 3,
        color: 'bg-green-500',
        specialties: ['Vinyl Siding', 'Fiber Cement', 'Wood Siding']
    },
    {
        id: 3,
        name: 'Decking Crew C',
        type: 'Decking',
        members: ['Lisa Wong', 'Alex Chen'],
        capacity: 2,
        color: 'bg-yellow-500',
        specialties: ['Wood Decks', 'Composite Decks', 'Railings']
    },
    {
        id: 4,
        name: 'Renovation Crew D',
        type: 'Renovation',
        members: ['Emily Davis', 'Sarah Johnson', 'Mike Chen', 'John Smith'],
        capacity: 4,
        color: 'bg-purple-500',
        specialties: ['Kitchen Remodels', 'Bathroom Remodels', 'Interior Renovations']
    },
    {
        id: 5,
        name: 'Electrical Crew E',
        type: 'Electrical',
        members: ['Bob Electric', 'Steve Sparks'],
        capacity: 2,
        color: 'bg-orange-500',
        specialties: ['Wiring', 'Lighting', 'Panel Upgrades']
    },
    {
        id: 6,
        name: 'Plumbing Crew F',
        type: 'Plumbing',
        members: ['Joe Plumber', 'Frank Pipe'],
        capacity: 2,
        color: 'bg-teal-500',
        specialties: ['Pipe Installation', 'Fixture Installation', 'Repairs']
    }
];

export const initialProjects = [
    {
        id: 1,
        name: 'Wilson Residence Roof Replacement',
        type: 'Roofing',
        status: 'active',
        phase: 'Execution Phase',
        estimateValue: 25000,
        progress: 35,
        startDate: 'May 31, 2024',
        endDate: 'Jun 14, 2024',
        materialsDeliveryStart: 'July 15, 2024',
        materialsDeliveryEnd: 'July 16, 2024',
        laborStart: 'July 17, 2024',
        laborEnd: 'July 23, 2024',
        client: { name: 'Betsy Stephens', phone: '(555) 123-4567', email: 'betsy.stephens@email.com' },
        location: '123 Main St, Anytown USA',
        teamSize: 2,
        duration: 14,
        priority: 'High',
        projectManager: 'Sarah Johnson',
        accountManager: 'Sarah Owner',
        clientSince: '2021',
        messages: [
            { id: 1, author: 'Mike Field', avatar: 'M', content: 'Completed the initial inspection. Photos are uploaded. Decking looks solid.', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()},
            { id: 2, author: 'Sarah Owner', avatar: 'S', content: 'Great, thanks Mike. Let\'s get the estimate finalized and sent over to the client by EOD.', timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() },
        ],
        checklist: [
            { id: 1, stage: 'Pre-Production', items: [ { id: 1, text: 'Contract signed and uploaded', completed: true }, { id: 2, text: 'Permit application submitted', completed: true }, { id: 3, text: 'Material order finalized', completed: false } ] },
            { id: 2, stage: 'Installation', items: [ { id: 4, text: 'Material delivery confirmed', completed: false }, { id: 5, text: 'Daily safety meeting conducted', completed: false }, { id: 6, text: 'Tear-off complete', completed: false } ] },
            { id: 3, stage: 'Closeout', items: [ { id: 7, text: 'Final inspection passed', completed: false }, { id: 8, text: 'Final invoice sent to customer', completed: false }, { id: 9, text: 'Warranty documents delivered', completed: false } ] },
        ]
    },
    {
        id: 2,
        name: 'Residential Siding Repair',
        type: 'Siding',
        status: 'lead',
        phase: 'Lead Phase',
        estimateValue: 45000,
        progress: 10,
        startDate: 'Jun 9, 2024',
        endDate: 'Jun 24, 2024',
        materialsDeliveryStart: 'June 20, 2024',
        materialsDeliveryEnd: 'June 21, 2024',
        laborStart: 'June 22, 2024',
        laborEnd: 'June 28, 2024',
        client: { name: 'Michael Rodriguez', phone: '(555) 987-6543', email: 'michael.rodriguez@email.com' },
        location: '456 Business Park, Anytown USA',
        teamSize: 4,
        duration: 15,
        priority: 'Medium',
        projectManager: 'Mike Chen',
        accountManager: 'Sarah Owner',
        clientSince: '2022',
        messages: [
            { id: 3, author: 'Sarah Owner', avatar: 'S', content: 'We need to get the permit submitted for the Rodriguez job ASAP.', timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() }
        ],
        checklist: [ { id: 4, stage: 'Pre-Production', items: [ { id: 10, text: 'Contract signed and uploaded', completed: true }, { id: 11, text: 'Permit application submitted', completed: false }, { id: 12, text: 'Material order finalized', completed: false } ] } ]
    },
    {
        id: 3,
        name: 'Residential Office Renovation',
        type: 'Renovation',
        status: 'execution',
        phase: 'Execution Phase',
        estimateValue: 120000,
        progress: 75,
        startDate: '2022-11-01',
        endDate: '2023-01-30',
        materialsDeliveryStart: '2022-11-15',
        materialsDeliveryEnd: '2022-11-20',
        laborStart: '2022-11-21',
        laborEnd: '2023-01-25',
        client: { name: 'Jennifer Martinez', phone: '(555) 555-1234', email: 'jennifer.martinez@email.com' },
        location: '789 Business District, Anytown USA',
        teamSize: 6,
        duration: 90,
        priority: 'Low',
        projectManager: 'Emily Davis',
        accountManager: 'Sarah Owner',
        clientSince: '2020',
        messages: [
            { id: 4, author: 'Emily Davis', avatar: 'E', content: 'Project is 75% complete. Final phase of interior finishing is underway.', timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() }
        ],
        checklist: [
            { id: 5, stage: 'Pre-Production', items: [ { id: 13, text: 'Contract signed and uploaded', completed: true }, { id: 14, text: 'Permit application submitted', completed: true }, { id: 15, text: 'Material order finalized', completed: true } ] },
            { id: 6, stage: 'Installation', items: [ { id: 16, text: 'Material delivery confirmed', completed: true }, { id: 17, text: 'Daily safety meeting conducted', completed: true }, { id: 18, text: 'Construction in progress', completed: false } ] },
            { id: 7, stage: 'Closeout', items: [ { id: 19, text: 'Final inspection passed', completed: false }, { id: 20, text: 'Final invoice sent to customer', completed: false }, { id: 21, text: 'Warranty documents delivered', completed: false } ] },
        ]
    },
    {
        id: 4,
        name: 'Maple Street Remodel',
        type: 'Remodeling',
        status: 'active',
        phase: 'Execution Phase',
        estimateValue: 90000,
        progress: 35,
        startDate: '2023-03-01',
        endDate: '2023-06-15',
        materialsDeliveryStart: '2023-03-15',
        materialsDeliveryEnd: '2023-03-20',
        laborStart: '2023-03-21',
        laborEnd: '2023-06-10',
        client: { name: 'David Thompson', phone: '(555) 333-4444', email: 'david.thompson@email.com' },
        location: '321 Maple Street, Anytown USA',
        teamSize: 3,
        duration: 105,
        priority: 'High',
        projectManager: 'John Smith',
        accountManager: 'Sarah Owner',
        clientSince: '2023',
        messages: [
            { id: 5, author: 'John Smith', avatar: 'J', content: 'Kitchen cabinets delivered and inspected. All pieces accounted for and in good condition.', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() }
        ],
        checklist: [
            { id: 8, stage: 'Pre-Production', items: [ { id: 22, text: 'Contract signed and uploaded', completed: true }, { id: 23, text: 'Permit application submitted', completed: true }, { id: 24, text: 'Material order finalized', completed: true } ] },
            { id: 9, stage: 'Installation', items: [ { id: 25, text: 'Material delivery confirmed', completed: true }, { id: 26, text: 'Daily safety meeting conducted', completed: false }, { id: 27, text: 'Kitchen installation', completed: false } ] }
        ]
    },
    {
        id: 5,
        name: 'Lakeside Deck Build',
        type: 'Decking',
        status: 'approved',
        phase: 'Approved Phase',
        estimateValue: 65000,
        progress: 25,
        startDate: '2023-01-20',
        endDate: '2023-03-25',
        materialsDeliveryStart: '2023-02-01',
        materialsDeliveryEnd: '2023-02-05',
        laborStart: '2023-02-06',
        laborEnd: '2023-03-20',
        client: { name: 'Amanda Foster', phone: '(555) 777-8888', email: 'amanda.foster@email.com' },
        location: '555 Lake View Drive, Anytown USA',
        teamSize: 2,
        duration: 65,
        priority: 'Medium',
        projectManager: 'Lisa Wong',
        accountManager: 'Sarah Owner',
        clientSince: '2022',
        messages: [
            { id: 6, author: 'Lisa Wong', avatar: 'L', content: 'Project approved and materials ordered. Awaiting delivery confirmation.', timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() }
        ],
        checklist: [
            { id: 10, stage: 'Pre-Production', items: [ { id: 28, text: 'Contract signed and uploaded', completed: true }, { id: 29, text: 'Permit application submitted', completed: true }, { id: 30, text: 'Material order finalized', completed: true } ] },
            { id: 11, stage: 'Installation', items: [ { id: 31, text: 'Material delivery confirmed', completed: false }, { id: 32, text: 'Daily safety meeting conducted', completed: false }, { id: 33, text: 'Deck construction complete', completed: false } ] },
            { id: 12, stage: 'Closeout', items: [ { id: 34, text: 'Final inspection passed', completed: false }, { id: 35, text: 'Final invoice sent to customer', completed: false }, { id: 36, text: 'Warranty documents delivered', completed: false } ] }
        ]
    },
    // Additional completed projects for 2025 archive
    {
        id: 6,
        name: 'Riverside Residence Roofing',
        type: 'Roofing',
        status: 'prospect',
        phase: 'Lead Phase',
        estimateValue: 185000,
        progress: 15,
        startDate: '2025-01-15',
        endDate: '2025-03-20',
        materialsDeliveryStart: '2025-01-25',
        materialsDeliveryEnd: '2025-01-30',
        laborStart: '2025-02-01',
        laborEnd: '2025-03-15',
        client: { name: 'Carlos Rodriguez', phone: '(555) 111-2222', email: 'carlos.rodriguez@email.com' },
        location: '1000 Riverside Blvd, Anytown USA',
        teamSize: 8,
        duration: 65,
        priority: 'High',
        projectManager: 'Carlos Rodriguez',
        accountManager: 'Sarah Owner',
        clientSince: '2024',
        messages: [
            { id: 7, author: 'Carlos Rodriguez', avatar: 'C', content: 'Initial site inspection completed. Preparing detailed estimate for all 12 units.', timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() }
        ],
        checklist: [
            { id: 13, stage: 'Pre-Production', items: [ { id: 37, text: 'Contract signed and uploaded', completed: false }, { id: 38, text: 'Permit application submitted', completed: false }, { id: 39, text: 'Material order finalized', completed: false } ] },
            { id: 14, stage: 'Installation', items: [ { id: 40, text: 'Material delivery confirmed', completed: false }, { id: 41, text: 'Daily safety meeting conducted', completed: false }, { id: 42, text: 'Roof installation complete', completed: false } ] },
            { id: 15, stage: 'Closeout', items: [ { id: 43, text: 'Final inspection passed', completed: false }, { id: 44, text: 'Final invoice sent to customer', completed: false }, { id: 45, text: 'Warranty documents delivered', completed: false } ] }
        ]
    },
    {
        id: 7,
        name: 'Historic Residence Restoration',
        type: 'Renovation',
        status: 'lead',
        phase: 'Lead Phase',
        estimateValue: 320000,
        progress: 5,
        startDate: '2024-09-01',
        endDate: '2025-02-28',
        materialsDeliveryStart: '2024-09-15',
        materialsDeliveryEnd: '2024-09-30',
        laborStart: '2024-10-01',
        laborEnd: '2025-02-20',
        client: { name: 'Patricia Johnson', phone: '(555) 444-5555', email: 'patricia.johnson@email.com' },
        location: '250 Theater District, Anytown USA',
        teamSize: 12,
        duration: 180,
        priority: 'High',
        projectManager: 'Jennifer Martinez',
        accountManager: 'Sarah Owner',
        clientSince: '2023',
        messages: [
            { id: 8, author: 'Jennifer Martinez', avatar: 'J', content: 'Initial client meeting scheduled. Gathering requirements for historic restoration project.', timestamp: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString() }
        ],
        checklist: [
            { id: 16, stage: 'Pre-Production', items: [ { id: 46, text: 'Contract signed and uploaded', completed: false }, { id: 47, text: 'Permit application submitted', completed: false }, { id: 48, text: 'Material order finalized', completed: false } ] },
            { id: 17, stage: 'Installation', items: [ { id: 49, text: 'Material delivery confirmed', completed: false }, { id: 50, text: 'Daily safety meeting conducted', completed: false }, { id: 51, text: 'Restoration complete', completed: false } ] },
            { id: 18, stage: 'Closeout', items: [ { id: 52, text: 'Final inspection passed', completed: false }, { id: 53, text: 'Final invoice sent to customer', completed: false }, { id: 54, text: 'Warranty documents delivered', completed: false } ] }
        ]
    },
    {
        id: 8,
        name: 'Mountain View Residence Windows',
        type: 'Windows',
        status: 'supplement',
        phase: 'Execution Phase',
        estimateValue: 95000,
        progress: 85,
        startDate: '2025-02-01',
        endDate: '2025-04-15',
        materialsDeliveryStart: '2025-02-10',
        materialsDeliveryEnd: '2025-02-15',
        laborStart: '2025-02-16',
        laborEnd: '2025-04-10',
        client: { name: 'Kevin O\'Brien', phone: '(555) 666-7777', email: 'kevin.obrien@email.com' },
        location: '5000 Mountain Peak Road, Anytown USA',
        teamSize: 5,
        duration: 75,
        priority: 'Medium',
        projectManager: 'David Thompson',
        accountManager: 'Sarah Owner',
        clientSince: '2024',
        messages: [
            { id: 9, author: 'David Thompson', avatar: 'D', content: 'Window installation 85% complete. Preparing supplement for additional energy efficiency upgrades requested by client.', timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() }
        ],
        checklist: [
            { id: 19, stage: 'Pre-Production', items: [ { id: 55, text: 'Contract signed and uploaded', completed: true }, { id: 56, text: 'Permit application submitted', completed: true }, { id: 57, text: 'Material order finalized', completed: true } ] },
            { id: 20, stage: 'Installation', items: [ { id: 58, text: 'Material delivery confirmed', completed: true }, { id: 59, text: 'Daily safety meeting conducted', completed: true }, { id: 60, text: 'Window installation in progress', completed: false } ] },
            { id: 21, stage: 'Closeout', items: [ { id: 61, text: 'Final inspection passed', completed: false }, { id: 62, text: 'Final invoice sent to customer', completed: false }, { id: 63, text: 'Warranty documents delivered', completed: false } ] }
        ]
    },
    {
        id: 9,
        name: 'Residential Warehouse Siding',
        type: 'Siding',
        status: 'execution',
        phase: 'Execution Phase',
        estimateValue: 145000,
        progress: 60,
        startDate: '2024-11-01',
        endDate: '2025-01-31',
        materialsDeliveryStart: '2024-11-15',
        materialsDeliveryEnd: '2024-11-25',
        laborStart: '2024-11-26',
        laborEnd: '2025-01-25',
        client: { name: 'Robert Wilson', phone: '(555) 888-9999', email: 'robert.wilson@email.com' },
        location: '7500 Industrial Park Way, Anytown USA',
        teamSize: 6,
        duration: 90,
        priority: 'High',
        projectManager: 'Robert Wilson',
        accountManager: 'Sarah Owner',
        clientSince: '2023',
        messages: [
            { id: 10, author: 'Robert Wilson', avatar: 'R', content: 'Warehouse siding project 60% complete. North and east walls finished, working on south wall.', timestamp: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() }
        ],
        checklist: [
            { id: 22, stage: 'Pre-Production', items: [ { id: 64, text: 'Contract signed and uploaded', completed: true }, { id: 65, text: 'Permit application submitted', completed: true }, { id: 66, text: 'Material order finalized', completed: true } ] },
            { id: 23, stage: 'Installation', items: [ { id: 67, text: 'Material delivery confirmed', completed: true }, { id: 68, text: 'Daily safety meeting conducted', completed: true }, { id: 69, text: 'Siding installation in progress', completed: false } ] },
            { id: 24, stage: 'Closeout', items: [ { id: 70, text: 'Final inspection passed', completed: false }, { id: 71, text: 'Final invoice sent to customer', completed: false }, { id: 72, text: 'Warranty documents delivered', completed: false } ] }
        ]
    },
    {
        id: 10,
        name: 'Residential Gutters & Downspouts',
        type: 'Gutters',
        status: 'approved',
        phase: 'Approved Phase',
        estimateValue: 35000,
        progress: 30,
        startDate: '2025-01-10',
        endDate: '2025-02-05',
        materialsDeliveryStart: '2025-01-15',
        materialsDeliveryEnd: '2025-01-16',
        laborStart: '2025-01-17',
        laborEnd: '2025-02-01',
        client: { name: 'Lisa Wong', phone: '(555) 222-3333', email: 'lisa.wong@email.com' },
        location: '1500 Country Club Drive, Anytown USA',
        teamSize: 3,
        duration: 25,
        priority: 'Medium',
        projectManager: 'Amanda Foster',
        accountManager: 'Sarah Owner',
        clientSince: '2024',
        messages: [
            { id: 11, author: 'Amanda Foster', avatar: 'A', content: 'Copper gutters project approved. Materials ordered and delivery scheduled for next week.', timestamp: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString() }
        ],
        checklist: [
            { id: 25, stage: 'Pre-Production', items: [ { id: 73, text: 'Contract signed and uploaded', completed: true }, { id: 74, text: 'Permit application submitted', completed: true }, { id: 75, text: 'Material order finalized', completed: true } ] },
            { id: 26, stage: 'Installation', items: [ { id: 76, text: 'Material delivery confirmed', completed: false }, { id: 77, text: 'Daily safety meeting conducted', completed: false }, { id: 78, text: 'Gutter installation complete', completed: false } ] },
            { id: 27, stage: 'Closeout', items: [ { id: 79, text: 'Final inspection passed', completed: false }, { id: 80, text: 'Final invoice sent to customer', completed: false }, { id: 81, text: 'Warranty documents delivered', completed: false } ] }
        ]
    },
    {
        id: 11,
        name: 'Residential Insulation Upgrade',
        type: 'Insulation',
        status: 'prospect',
        phase: 'Lead Phase',
        estimateValue: 75000,
        progress: 20,
        startDate: '2024-12-01',
        endDate: '2025-01-31',
        materialsDeliveryStart: '2024-12-10',
        materialsDeliveryEnd: '2024-12-15',
        laborStart: '2024-12-16',
        laborEnd: '2025-01-25',
        client: { name: 'Michael Chang', phone: '(555) 333-4444', email: 'michael.chang@email.com' },
        location: '2000 Business Center Blvd, Anytown USA',
        teamSize: 4,
        duration: 60,
        priority: 'Medium',
        projectManager: 'Michael Chang',
        accountManager: 'Sarah Owner',
        clientSince: '2022',
        messages: [
            { id: 12, author: 'Michael Chang', avatar: 'M', content: 'Energy audit completed. Preparing detailed proposal for insulation upgrade to improve efficiency by 40%.', timestamp: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString() }
        ],
        checklist: [
            { id: 28, stage: 'Pre-Production', items: [ { id: 82, text: 'Contract signed and uploaded', completed: false }, { id: 83, text: 'Permit application submitted', completed: false }, { id: 84, text: 'Material order finalized', completed: false } ] },
            { id: 29, stage: 'Installation', items: [ { id: 85, text: 'Material delivery confirmed', completed: false }, { id: 86, text: 'Daily safety meeting conducted', completed: false }, { id: 87, text: 'Insulation installation complete', completed: false } ] },
            { id: 30, stage: 'Closeout', items: [ { id: 88, text: 'Final inspection passed', completed: false }, { id: 89, text: 'Final invoice sent to customer', completed: false }, { id: 90, text: 'Warranty documents delivered', completed: false } ] }
        ]
    },
    {
        id: 12,
        name: 'Residential Community Roofing',
        type: 'Roofing',
        status: 'execution',
        phase: 'Execution Phase',
        estimateValue: 220000,
        progress: 70,
        startDate: '2024-10-01',
        endDate: '2025-01-15',
        materialsDeliveryStart: '2024-10-15',
        materialsDeliveryEnd: '2024-10-25',
        laborStart: '2024-10-26',
        laborEnd: '2025-01-10',
        client: { name: 'Dr. Sarah Williams', phone: '(555) 777-8888', email: 'sarah.williams@email.com' },
        location: '3000 Senior Living Lane, Anytown USA',
        teamSize: 10,
        duration: 105,
        priority: 'High',
        projectManager: 'Patricia Johnson',
        accountManager: 'Sarah Owner',
        clientSince: '2023',
        messages: [
            { id: 13, author: 'Patricia Johnson', avatar: 'P', content: 'Retirement community roofing 70% complete. 18 of 25 buildings finished. Residents reporting improved comfort.', timestamp: new Date(Date.now() - 105 * 24 * 60 * 60 * 1000).toISOString() }
        ],
        checklist: [
            { id: 31, stage: 'Pre-Production', items: [ { id: 91, text: 'Contract signed and uploaded', completed: true }, { id: 92, text: 'Permit application submitted', completed: true }, { id: 93, text: 'Material order finalized', completed: true } ] },
            { id: 32, stage: 'Installation', items: [ { id: 94, text: 'Material delivery confirmed', completed: true }, { id: 95, text: 'Daily safety meeting conducted', completed: true }, { id: 96, text: 'Roof installation in progress', completed: false } ] },
            { id: 33, stage: 'Closeout', items: [ { id: 97, text: 'Final inspection passed', completed: false }, { id: 98, text: 'Final invoice sent to customer', completed: false }, { id: 99, text: 'Warranty documents delivered', completed: false } ] }
        ]
    },
    {
        id: 13,
        name: 'Residential Siding Project',
        type: 'Siding',
        status: 'supplement',
        phase: 'Execution Phase',
        estimateValue: 165000,
        progress: 90,
        startDate: '2024-08-01',
        endDate: '2024-12-15',
        materialsDeliveryStart: '2024-08-15',
        materialsDeliveryEnd: '2024-08-25',
        laborStart: '2024-08-26',
        laborEnd: '2024-12-10',
        client: { name: 'Emily Davis', phone: '(555) 999-0000', email: 'emily.davis@email.com' },
        location: '8000 Retail Plaza, Anytown USA',
        teamSize: 7,
        duration: 135,
        priority: 'Medium',
        projectManager: 'Kevin O\'Brien',
        accountManager: 'Sarah Owner',
        clientSince: '2022',
        messages: [
            { id: 14, author: 'Kevin O\'Brien', avatar: 'K', content: 'Shopping center siding 90% complete. Preparing final supplement for additional aesthetic enhancements requested.', timestamp: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString() }
        ],
        checklist: [
            { id: 34, stage: 'Pre-Production', items: [ { id: 100, text: 'Contract signed and uploaded', completed: true }, { id: 101, text: 'Permit application submitted', completed: true }, { id: 102, text: 'Material order finalized', completed: true } ] },
            { id: 35, stage: 'Installation', items: [ { id: 103, text: 'Material delivery confirmed', completed: true }, { id: 104, text: 'Daily safety meeting conducted', completed: true }, { id: 105, text: 'Siding installation nearly complete', completed: false } ] },
            { id: 36, stage: 'Closeout', items: [ { id: 106, text: 'Final inspection passed', completed: false }, { id: 107, text: 'Final invoice sent to customer', completed: false }, { id: 108, text: 'Warranty documents delivered', completed: false } ] }
        ]
    },
    {
        id: 14,
        name: 'Residential Windows & Doors',
        type: 'Windows',
        status: 'approved',
        phase: 'Execution Phase',
        estimateValue: 125000,
        progress: 35,
        startDate: '2024-09-15',
        endDate: '2024-12-31',
        materialsDeliveryStart: '2024-09-25',
        materialsDeliveryEnd: '2024-10-05',
        laborStart: '2024-10-06',
        laborEnd: '2024-12-25',
        client: { name: 'Dr. James Anderson', phone: '(555) 111-3333', email: 'james.anderson@email.com' },
        location: '4500 Medical Center Drive, Anytown USA',
        teamSize: 6,
        duration: 105,
        priority: 'High',
        projectManager: 'Dr. Sarah Williams',
        accountManager: 'Sarah Owner',
        clientSince: '2023',
        messages: [
            { id: 15, author: 'Dr. Sarah Williams', avatar: 'S', content: 'Medical center upgrade approved. Energy-efficient windows and doors ordered. Installation scheduled for next month.', timestamp: new Date(Date.now() - 135 * 24 * 60 * 60 * 1000).toISOString() }
        ],
        checklist: [
            { id: 37, stage: 'Pre-Production', items: [ { id: 109, text: 'Contract signed and uploaded', completed: true }, { id: 110, text: 'Permit application submitted', completed: true }, { id: 111, text: 'Material order finalized', completed: true } ] },
            { id: 38, stage: 'Installation', items: [ { id: 112, text: 'Material delivery confirmed', completed: false }, { id: 113, text: 'Daily safety meeting conducted', completed: false }, { id: 114, text: 'Window installation complete', completed: false } ] },
            { id: 39, stage: 'Closeout', items: [ { id: 115, text: 'Final inspection passed', completed: false }, { id: 116, text: 'Final invoice sent to customer', completed: false }, { id: 117, text: 'Warranty documents delivered', completed: false } ] }
        ]
    },
    {
        id: 15,
        name: 'Residential Insulation',
        type: 'Insulation',
        status: 'lead',
        phase: 'Lead Phase',
        estimateValue: 180000,
        progress: 10,
        startDate: '2024-07-01',
        endDate: '2024-11-30',
        materialsDeliveryStart: '2024-07-15',
        materialsDeliveryEnd: '2024-07-25',
        laborStart: '2024-07-26',
        laborEnd: '2024-11-25',
        client: { name: 'John Smith', phone: '(555) 444-6666', email: 'john.smith@email.com' },
        location: '12000 University Campus, Anytown USA',
        teamSize: 8,
        duration: 150,
        priority: 'High',
        projectManager: 'Dr. James Anderson',
        accountManager: 'Sarah Owner',
        clientSince: '2021',
        messages: [
            { id: 16, author: 'Dr. James Anderson', avatar: 'J', content: 'Initial consultation with university facilities team. Gathering requirements for dormitory insulation project.', timestamp: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString() }
        ],
        checklist: [
            { id: 40, stage: 'Pre-Production', items: [ { id: 118, text: 'Contract signed and uploaded', completed: false }, { id: 119, text: 'Permit application submitted', completed: false }, { id: 120, text: 'Material order finalized', completed: false } ] },
            { id: 41, stage: 'Installation', items: [ { id: 121, text: 'Material delivery confirmed', completed: false }, { id: 122, text: 'Daily safety meeting conducted', completed: false }, { id: 123, text: 'Insulation installation complete', completed: false } ] },
            { id: 42, stage: 'Closeout', items: [ { id: 124, text: 'Final inspection passed', completed: false }, { id: 125, text: 'Final invoice sent to customer', completed: false }, { id: 126, text: 'Warranty documents delivered', completed: false } ] }
        ]
    }
];

export const initialTasks = [
    { id: 1, title: 'Roof inspection - 123 Main St', description: 'Complete safety inspection before work begins', assignedTo: 'user_2', projectId: 1, alertDate: '2024-06-04', priority: 'high', status: 'pending' },
    { id: 2, title: 'Submit insurance documentation', description: 'Upload all required forms to customer portal', assignedTo: 'user_3', projectId: 1, alertDate: '2024-06-02', priority: 'high', status: 'overdue' },
    { id: 3, title: 'Material delivery coordination', description: 'Coordinate with supplier for delivery schedule', assignedTo: 'user_3', projectId: 2, alertDate: '2024-06-10', priority: 'medium', status: 'in-progress' },
    { id: 4, title: 'Safety meeting required', description: 'Daily safety briefing needed before crew starts work', assignedTo: 'user_2', projectId: 1, alertDate: '2024-06-05', priority: 'high', status: 'pending' },
    { id: 5, title: 'Permit approval check', description: 'Verify building permit status for Rodriguez project', assignedTo: 'user_1', projectId: 2, alertDate: '2024-06-03', priority: 'medium', status: 'pending' },
    { id: 6, title: 'Client meeting scheduled', description: 'Final walkthrough meeting with Stephens family', assignedTo: 'user_1', projectId: 1, alertDate: '2024-06-06', priority: 'medium', status: 'pending' },
    { id: 8, title: 'Weather delay notification', description: 'Heavy rain forecast - reschedule outdoor work', assignedTo: 'user_2', projectId: 1, alertDate: '2024-06-05', priority: 'medium', status: 'pending' },
    { id: 9, title: 'Material shortage alert', description: 'Shingles delivery delayed - contact supplier', assignedTo: 'user_3', projectId: 1, alertDate: '2024-06-04', priority: 'high', status: 'overdue' },
    { id: 10, title: 'Quality inspection overdue', description: 'Mid-project quality check required for Thompson residence', assignedTo: 'user_2', projectId: 4, alertDate: '2024-06-01', priority: 'medium', status: 'overdue' },
    { id: 11, title: 'Invoice payment reminder', description: 'Follow up on outstanding payment from Foster residence', assignedTo: 'user_1', projectId: 5, alertDate: '2024-06-07', priority: 'low', status: 'pending' },
    { id: 12, title: 'Crew scheduling conflict', description: 'Mike and John both assigned to same time slot', assignedTo: 'user_1', projectId: 2, alertDate: '2024-06-06', priority: 'high', status: 'pending' },
    { id: 13, title: 'Safety violation report', description: 'Hard hat policy violation reported on site', assignedTo: 'user_3', projectId: 1, alertDate: '2024-06-05', priority: 'high', status: 'in-progress' },
    { id: 14, title: 'Equipment rental return', description: 'Scaffolding rental due back to supplier', assignedTo: 'user_2', projectId: 4, alertDate: '2024-06-09', priority: 'medium', status: 'pending' },
    { id: 15, title: 'Client complaint received', description: 'Noise complaint from neighbor - address immediately', assignedTo: 'user_1', projectId: 1, alertDate: '2024-06-04', priority: 'high', status: 'in-progress' }
];

export const initialActivityData = [
    { 
        id: 1, 
        author: 'Mike Field', 
        avatar: 'M', 
        content: 'Completed the initial inspection for the Stephens Residence. All structural elements appear sound and ready for the roof replacement project. Photos have been uploaded to the project folder.', 
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        projectId: 1, 
        project: 'Stephens Residence Roof Replacement',
        subject: 'Inspection Report'
    },
    { 
        id: 2, 
        author: 'Sarah Owner', 
        avatar: 'S', 
        content: 'We need to get the permit submitted for the Rodriguez job ASAP. The city is experiencing delays and we want to avoid any project timeline issues. Please ensure all documentation is complete before submission.', 
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        projectId: 2, 
        project: 'Residential Siding Repair',
        subject: 'Permit Update'
    },
    { 
        id: 3, 
        author: 'John Supervisor', 
        avatar: 'J', 
        content: 'Material delivery confirmed for Stephens job, scheduled for tomorrow morning. The supplier has confirmed all shingles and underlayment will be delivered by 8 AM. Crew should be ready to begin tear-off immediately after delivery.', 
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        projectId: 1, 
        project: 'Stephens Residence Roof Replacement',
        subject: 'Material Delivery'
    },
    { 
        id: 4, 
        author: 'Emily Davis', 
        avatar: 'E', 
        content: 'Project Martinez Office Renovation is now 75% complete. Final phase of interior finishing is underway. Expecting completion ahead of schedule.', 
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 3, 
        project: 'Residential Office Renovation',
        subject: 'Project Status'
    },
    { 
        id: 5, 
        author: 'Carlos Crew Lead', 
        avatar: 'C', 
        content: 'Weather conditions are favorable for the Thompson remodel this week. All outdoor work scheduled for completion by Friday.', 
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 4, 
        project: 'Maple Street Remodel',
        subject: 'Weather Alert'
    },
    { 
        id: 6, 
        author: 'Anna Estimator', 
        avatar: 'A', 
        content: 'Final estimate approved for Foster Lakeside Deck Build. Client is very satisfied with the pricing and timeline. Ready to proceed to next phase.', 
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 5, 
        project: 'Lakeside Deck Build',
        subject: 'Budget Update'
    },
    { 
        id: 7, 
        author: 'Lisa Coordinator', 
        avatar: 'L', 
        content: 'Equipment rental has been arranged for the Wilson project. Scaffolding and safety equipment will be delivered Monday morning.', 
        timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 1, 
        project: 'Wilson Residence Roof Replacement',
        subject: 'Equipment Issue'
    },
    { 
        id: 8, 
        author: 'Mike Field', 
        avatar: 'M', 
        content: 'Quality inspection completed for Rodriguez siding repair. All work meets our standards and client expectations. Moving to final phase.', 
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 2, 
        project: 'Residential Siding Repair',
        subject: 'Quality Inspection'
    },
    { 
        id: 9, 
        author: 'John Supervisor', 
        avatar: 'J', 
        content: 'Safety meeting conducted for all crew members. New OSHA guidelines reviewed and acknowledged by all team members.', 
        timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 3, 
        project: 'Residential Office Renovation',
        subject: 'Safety Meeting'
    },
    { 
        id: 10, 
        author: 'Sarah Owner', 
        avatar: 'S', 
        content: 'Client communication update: Thompson family is very pleased with progress. They have requested an additional bathroom renovation to be scheduled after current project completion.', 
        timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 4, 
        project: 'Maple Street Remodel',
        subject: 'Client Communication'
    },
    { 
        id: 11, 
        author: 'Emily Davis', 
        avatar: 'E', 
        content: 'Crew assignment finalized for Foster deck project. Team Alpha will handle the foundation work while Team Beta manages the decking installation.', 
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 5, 
        project: 'Lakeside Deck Build',
        subject: 'Crew Assignment'
    },
    { 
        id: 12, 
        author: 'Carlos Crew Lead', 
        avatar: 'C', 
        content: 'Schedule change notification: Wilson roof replacement moved up by 2 days due to favorable weather forecast. All materials ready.', 
        timestamp: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 1, 
        project: 'Wilson Residence Roof Replacement',
        subject: 'Schedule Change'
    },
    { 
        id: 13, 
        author: 'Anna Estimator', 
        avatar: 'A', 
        content: 'Documentation update: All warranty paperwork has been prepared for Rodriguez siding project. Ready for final delivery upon completion.', 
        timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 2, 
        project: 'Residential Siding Repair',
        subject: 'Documentation'
    },
    { 
        id: 14, 
        author: 'Lisa Coordinator', 
        avatar: 'L', 
        content: 'Emergency alert resolved: Gas leak issue at Martinez renovation site has been addressed by utility company. Work can resume Monday.', 
        timestamp: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 3, 
        project: 'Residential Office Renovation',
        subject: 'Emergency Alert'
    },
    { 
        id: 15, 
        author: 'Mike Field', 
        avatar: 'M', 
        content: 'Training update: All crew members have completed the new safety certification program. Certificates have been filed in personnel records.', 
        timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 4, 
        project: 'Maple Street Remodel',
        subject: 'Training Update'
    },
    { 
        id: 16, 
        author: 'John Supervisor', 
        avatar: 'J', 
        content: 'Maintenance required: Power tools inspection completed. Two items need servicing before next project. Scheduled for this weekend.', 
        timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 5, 
        project: 'Lakeside Deck Build',
        subject: 'Maintenance Required'
    },
    { 
        id: 17, 
        author: 'Sarah Owner', 
        avatar: 'S', 
        content: 'Vendor communication: New supplier partnership established for premium roofing materials. 15% cost savings on future projects.', 
        timestamp: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 1, 
        project: 'Wilson Residence Roof Replacement',
        subject: 'Vendor Communication'
    },
    { 
        id: 18, 
        author: 'Emily Davis', 
        avatar: 'E', 
        content: 'Insurance update: All projects now covered under new comprehensive policy. Additional coverage for high-value renovations included.', 
        timestamp: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 2, 
        project: 'Residential Siding Repair',
        subject: 'Insurance Update'
    },
    { 
        id: 19, 
        author: 'Carlos Crew Lead', 
        avatar: 'C', 
        content: 'Warranty information updated: Extended 10-year warranty now available for all roofing projects. Client education materials prepared.', 
        timestamp: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 3, 
        project: 'Residential Office Renovation',
        subject: 'Warranty Information'
    },
    { 
        id: 20, 
        author: 'Anna Estimator', 
        avatar: 'A', 
        content: 'General update: Q2 performance metrics show 23% improvement in project completion times. Team efficiency continues to improve.', 
        timestamp: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 4, 
        project: 'Maple Street Remodel',
        subject: 'General Update'
    },
    { 
        id: 21, 
        author: 'Lisa Coordinator', 
        avatar: 'L', 
        content: 'Material delivery scheduled for Foster project postponed due to supplier delay. New delivery date confirmed for next Tuesday.', 
        timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 5, 
        project: 'Lakeside Deck Build',
        subject: 'Material Delivery'
    },
    { 
        id: 22, 
        author: 'Mike Field', 
        avatar: 'M', 
        content: 'Project status: Wilson roof replacement is ahead of schedule. Weather has been favorable and crew productivity is excellent.', 
        timestamp: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 1, 
        project: 'Wilson Residence Roof Replacement',
        subject: 'Project Status'
    },
    { 
        id: 23, 
        author: 'John Supervisor', 
        avatar: 'J', 
        content: 'Safety meeting reminder: Weekly safety briefing scheduled for Friday 3 PM. All project managers and crew leads must attend.', 
        timestamp: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 2, 
        project: 'Residential Siding Repair',
        subject: 'Safety Meeting'
    },
    { 
        id: 24, 
        author: 'Sarah Owner', 
        avatar: 'S', 
        content: 'Quality inspection passed: Martinez office renovation meets all building codes and quality standards. Client walkthrough scheduled.', 
        timestamp: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 3, 
        project: 'Residential Office Renovation',
        subject: 'Quality Inspection'
    },
    { 
        id: 25, 
        author: 'Emily Davis', 
        avatar: 'E', 
        content: 'Client communication: Thompson family requests color change for kitchen cabinets. Change order processed and materials ordered.', 
        timestamp: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 4, 
        project: 'Maple Street Remodel',
        subject: 'Client Communication'
    },
    { 
        id: 26, 
        author: 'Carlos Crew Lead', 
        avatar: 'C', 
        content: 'Permit update: Final inspection permit approved for Foster deck project. Inspector visit scheduled for next week.', 
        timestamp: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 5, 
        project: 'Lakeside Deck Build',
        subject: 'Permit Update'
    },
    { 
        id: 27, 
        author: 'Anna Estimator', 
        avatar: 'A', 
        content: 'Weather alert: Storm system approaching. All outdoor work should be secured by Thursday evening. Safety protocols in effect.', 
        timestamp: new Date(Date.now() - 26 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 1, 
        project: 'Wilson Residence Roof Replacement',
        subject: 'Weather Alert'
    },
    { 
        id: 28, 
        author: 'Lisa Coordinator', 
        avatar: 'L', 
        content: 'Equipment issue resolved: Damaged scaffolding has been replaced. New equipment delivered and safety inspected.', 
        timestamp: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 2, 
        project: 'Residential Siding Repair',
        subject: 'Equipment Issue'
    },
    { 
        id: 29, 
        author: 'Mike Field', 
        avatar: 'M', 
        content: 'Crew assignment update: Additional electrician assigned to Martinez project for final phase. Completion timeline unchanged.', 
        timestamp: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 3, 
        project: 'Residential Office Renovation',
        subject: 'Crew Assignment'
    },
    { 
        id: 30, 
        author: 'John Supervisor', 
        avatar: 'J', 
        content: 'Budget update: Thompson remodel project remains on budget. Cost savings achieved through efficient material usage.', 
        timestamp: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 4, 
        project: 'Maple Street Remodel',
        subject: 'Budget Update'
    },
    { 
        id: 31, 
        author: 'Sarah Owner', 
        avatar: 'S', 
        content: 'Schedule change: Foster deck project moved to accommodate material delivery delay. New start date communicated to client.', 
        timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 5, 
        project: 'Lakeside Deck Build',
        subject: 'Schedule Change'
    },
    { 
        id: 32, 
        author: 'Emily Davis', 
        avatar: 'E', 
        content: 'Inspection report: Monthly safety audit completed across all active job sites. Minor recommendations implemented immediately.', 
        timestamp: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 1, 
        project: 'Wilson Residence Roof Replacement',
        subject: 'Inspection Report'
    },
    { 
        id: 33, 
        author: 'Carlos Crew Lead', 
        avatar: 'C', 
        content: 'Documentation complete: All project files have been digitized and uploaded to the cloud storage system. Backup completed.', 
        timestamp: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 2, 
        project: 'Residential Siding Repair',
        subject: 'Documentation'
    },
    { 
        id: 34, 
        author: 'Anna Estimator', 
        avatar: 'A', 
        content: 'Emergency alert: Water main break near Martinez project site. Access may be limited tomorrow. Alternative parking arranged.', 
        timestamp: new Date(Date.now() - 33 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 3, 
        project: 'Residential Office Renovation',
        subject: 'Emergency Alert'
    },
    { 
        id: 35, 
        author: 'Lisa Coordinator', 
        avatar: 'L', 
        content: 'Training update: New crew members have completed orientation program. Ready for assignment to Thompson remodel project.', 
        timestamp: new Date(Date.now() - 34 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 4, 
        project: 'Maple Street Remodel',
        subject: 'Training Update'
    },
    { 
        id: 36, 
        author: 'Mike Field', 
        avatar: 'M', 
        content: 'Maintenance required: Truck fleet scheduled for quarterly service. All vehicles will be inspected and serviced this weekend.', 
        timestamp: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 5, 
        project: 'Lakeside Deck Build',
        subject: 'Maintenance Required'
    },
    { 
        id: 37, 
        author: 'John Supervisor', 
        avatar: 'J', 
        content: 'Vendor communication: New concrete supplier confirmed for future projects. Better pricing and faster delivery times negotiated.', 
        timestamp: new Date(Date.now() - 36 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 1, 
        project: 'Wilson Residence Roof Replacement',
        subject: 'Vendor Communication'
    },
    { 
        id: 38, 
        author: 'Sarah Owner', 
        avatar: 'S', 
        content: 'Insurance update: Annual policy renewal completed with expanded coverage. All projects now include additional liability protection.', 
        timestamp: new Date(Date.now() - 37 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 2, 
        project: 'Residential Siding Repair',
        subject: 'Insurance Update'
    },
    { 
        id: 39, 
        author: 'Emily Davis', 
        avatar: 'E', 
        content: 'Warranty information: Extended warranty terms now available for all renovation projects. Marketing materials updated accordingly.', 
        timestamp: new Date(Date.now() - 38 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 3, 
        project: 'Residential Office Renovation',
        subject: 'Warranty Information'
    },
    { 
        id: 40, 
        author: 'Carlos Crew Lead', 
        avatar: 'C', 
        content: 'General update: Company safety record continues to improve. Zero incidents reported for the third consecutive month.', 
        timestamp: new Date(Date.now() - 39 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 4, 
        project: 'Maple Street Remodel',
        subject: 'General Update'
    }
];

export const filteredActivityData = initialActivityData.filter(activity => {
    return !(
        (activity.timestamp === '2025-07-03T12:03:20.000Z' || new Date(activity.timestamp).toLocaleString() === '7/3/2025, 12:03:20 PM') &&
        activity.subject === 'System Alert' &&
        activity.content.includes('Emergency Alert') &&
        activity.project === 'Wilson Residence Roof Replacement'
    );
});

// Mock alerts data for the system
export const mockAlerts = [
    {
        _id: 'alert_001',
        id: 'alert_001',
        type: 'workflow',
        priority: 'high',
        status: 'active',
        isRead: false,
        title: 'Permit Application Overdue',
        message: 'Permit application for Wilson Residence Roof Replacement is 3 days overdue. Submit immediately to avoid project delays.',
        projectId: 1,
        assignedTo: 'admin@kenstruction.com',
        assignedToUser: 'admin@kenstruction.com',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        user: {
            _id: 'admin',
            id: 'admin',
            firstName: 'Admin',
            lastName: 'User',
            name: 'Admin User',
            email: 'admin@kenstruction.com'
        },
        project: {
            _id: 1,
            id: 1,
            name: 'Wilson Residence Roof Replacement',
            projectName: 'Wilson Residence Roof Replacement'
        },
        relatedProject: {
            _id: 1,
            id: 1,
            name: 'Wilson Residence Roof Replacement',
            projectName: 'Wilson Residence Roof Replacement',
            projectType: 'Roofing',
            status: 'active'
        },
        metadata: {
            workflowId: 1,
            stepId: 'step_002',
            stepName: 'Pre-Job Actions',
            cleanTaskName: 'Pre-Job Actions',
            projectName: 'Wilson Residence Roof Replacement',
            phase: 'Approved',
            daysOverdue: 3,
            daysUntilDue: -3
        }
    },
    {
        _id: 'alert_002',
        id: 'alert_002',
        type: 'workflow',
        priority: 'medium',
        status: 'active',
        isRead: false,
        title: 'Safety Meeting Required',
        message: 'Daily safety meeting required before crew starts work on Residential Siding Repair project.',
        projectId: 2,
        assignedTo: 'user_2',
        assignedToUser: 'user_2',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        user: {
            _id: 'user_2',
            id: 'user_2',
            firstName: 'Mike',
            lastName: 'Field',
            name: 'Mike Field',
            email: 'mike@example.com'
        },
        project: {
            _id: 2,
            id: 2,
            name: 'Residential Siding Repair',
            projectName: 'Residential Siding Repair'
        },
        relatedProject: {
            _id: 2,
            id: 2,
            name: 'Residential Siding Repair',
            projectName: 'Residential Siding Repair',
            projectType: 'Siding',
            status: 'lead'
        },
        metadata: {
            workflowId: 2,
            stepId: 'step_004',
            stepName: 'Installation',
            cleanTaskName: 'Installation',
            projectName: 'Residential Siding Repair',
            phase: 'Execution',
            daysOverdue: 1,
            daysUntilDue: -1
        }
    },
    {
        _id: 'alert_003',
        id: 'alert_003',
        type: 'workflow',
        priority: 'high',
        status: 'active',
        isRead: false,
        title: 'Material Shortage Alert',
        message: 'Shingles delivery delayed for Wilson Residence - contact supplier immediately.',
        projectId: 1,
        assignedTo: 'admin@kenstruction.com',
        assignedToUser: 'admin@kenstruction.com',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        user: {
            _id: 'admin',
            id: 'admin',
            firstName: 'Admin',
            lastName: 'User',
            name: 'Admin User',
            email: 'admin@kenstruction.com'
        },
        project: {
            _id: 1,
            id: 1,
            name: 'Wilson Residence Roof Replacement',
            projectName: 'Wilson Residence Roof Replacement'
        },
        relatedProject: {
            _id: 1,
            id: 1,
            name: 'Wilson Residence Roof Replacement',
            projectName: 'Wilson Residence Roof Replacement',
            projectType: 'Roofing',
            status: 'active'
        },
        metadata: {
            workflowId: 1,
            stepId: 'step_005',
            stepName: 'Administrative Setup',
            cleanTaskName: 'Administrative Setup',
            projectName: 'Wilson Residence Roof Replacement',
            phase: 'Approved',
            daysOverdue: 2,
            daysUntilDue: -2
        }
    },
    {
        _id: 'alert_006',
        id: 'alert_006',
        type: 'workflow',
        priority: 'low',
        status: 'active',
        isRead: false,
        title: 'Invoice Payment Reminder',
        message: 'Follow up on outstanding payment from Foster residence deck project.',
        projectId: 5,
        assignedTo: 'user_1',
        assignedToUser: 'user_1',
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        user: {
            _id: 'user_1',
            id: 'user_1',
            firstName: 'Sarah',
            lastName: 'Owner',
            name: 'Sarah Owner',
            email: 'sarah@example.com'
        },
        project: {
            _id: 5,
            id: 5,
            name: 'Lakeside Deck Build',
            projectName: 'Lakeside Deck Build'
        },
        relatedProject: {
            _id: 5,
            id: 5,
            name: 'Lakeside Deck Build',
            projectName: 'Lakeside Deck Build',
            projectType: 'Decking',
            status: 'approved'
        },
        metadata: {
            workflowId: 5,
            stepId: 'step_008',
            stepName: 'Financial Processing',
            cleanTaskName: 'Financial Processing',
            projectName: 'Lakeside Deck Build',
            phase: 'Completion',
            daysOverdue: 0,
            daysUntilDue: 2
        }
    },
    {
        _id: 'alert_007',
        id: 'alert_007',
        type: 'workflow',
        priority: 'high',
        status: 'active',
        isRead: false,
        title: 'Crew Scheduling Conflict',
        message: 'Mike and John both assigned to same time slot for Rodriguez siding project.',
        projectId: 2,
        assignedTo: 'admin@kenstruction.com',
        assignedToUser: 'admin@kenstruction.com',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        user: {
            _id: 'admin',
            id: 'admin',
            firstName: 'Admin',
            lastName: 'User',
            name: 'Admin User',
            email: 'admin@kenstruction.com'
        },
        project: {
            _id: 2,
            id: 2,
            name: 'Residential Siding Repair',
            projectName: 'Residential Siding Repair'
        },
        relatedProject: {
            _id: 2,
            id: 2,
            name: 'Residential Siding Repair',
            projectName: 'Residential Siding Repair',
            projectType: 'Siding',
            status: 'lead'
        },
        metadata: {
            workflowId: 2,
            stepId: 'step_009',
            stepName: 'Prepare for Production',
            cleanTaskName: 'Prepare for Production',
            projectName: 'Residential Siding Repair',
            phase: 'Approved',
            daysOverdue: 1,
            daysUntilDue: -1
        }
    },
    {
        _id: 'alert_008',
        id: 'alert_008',
        type: 'workflow',
        priority: 'high',
        status: 'active',
        isRead: true,
        title: 'Safety Violation Report',
        message: 'Hard hat policy violation reported on Wilson residence site.',
        projectId: 1,
        assignedTo: 'user_2',
        assignedToUser: 'user_2',
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        user: {
            _id: 'user_2',
            id: 'user_2',
            firstName: 'Mike',
            lastName: 'Field',
            name: 'Mike Field',
            email: 'mike@example.com'
        },
        project: {
            _id: 1,
            id: 1,
            name: 'Wilson Residence Roof Replacement',
            projectName: 'Wilson Residence Roof Replacement'
        },
        relatedProject: {
            _id: 1,
            id: 1,
            name: 'Wilson Residence Roof Replacement',
            projectName: 'Wilson Residence Roof Replacement',
            projectType: 'Roofing',
            status: 'active'
        },
        metadata: {
            workflowId: 1,
            stepId: 'step_010',
            stepName: 'Installation',
            cleanTaskName: 'Installation',
            projectName: 'Wilson Residence Roof Replacement',
            phase: 'Execution',
            daysOverdue: 2,
            daysUntilDue: -2
        }
    },
    {
        _id: 'alert_009',
        id: 'alert_009',
        type: 'workflow',
        priority: 'medium',
        status: 'active',
        isRead: false,
        title: 'Equipment Rental Return',
        message: 'Scaffolding rental due back to supplier for Thompson remodel.',
        projectId: 4,
        assignedTo: 'user_3',
        assignedToUser: 'user_3',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        user: {
            _id: 'user_3',
            id: 'user_3',
            firstName: 'John',
            lastName: 'Supervisor',
            name: 'John Supervisor',
            email: 'john@example.com'
        },
        project: {
            _id: 4,
            id: 4,
            name: 'Maple Street Remodel',
            projectName: 'Maple Street Remodel'
        },
        relatedProject: {
            _id: 4,
            id: 4,
            name: 'Maple Street Remodel',
            projectName: 'Maple Street Remodel',
            projectType: 'Remodeling',
            status: 'active'
        },
        metadata: {
            workflowId: 4,
            stepId: 'step_011',
            stepName: 'Equipment Return',
            cleanTaskName: 'Equipment Return',
            projectName: 'Maple Street Remodel',
            phase: 'Installation',
            daysOverdue: 0,
            daysUntilDue: 1
        }
    },
    {
        _id: 'alert_010',
        id: 'alert_010',
        type: 'workflow',
        priority: 'medium',
        status: 'active',
        isRead: false,
        title: 'Weather Delay Notification',
        message: 'Heavy rain forecast for Martinez office renovation - reschedule outdoor work.',
        projectId: 3,
        assignedTo: 'user_1',
        assignedToUser: 'user_1',
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        user: {
            _id: 'user_1',
            id: 'user_1',
            firstName: 'Sarah',
            lastName: 'Owner',
            name: 'Sarah Owner',
            email: 'sarah@example.com'
        },
        project: {
            _id: 3,
            id: 3,
            name: 'Residential Office Renovation',
            projectName: 'Residential Office Renovation'
        },
        relatedProject: {
            _id: 3,
            id: 3,
            name: 'Residential Office Renovation',
            projectName: 'Residential Office Renovation',
            projectType: 'Renovation',
            status: 'execution'
        },
        metadata: {
            workflowId: 3,
            stepId: 'step_012',
            stepName: 'Installation',
            cleanTaskName: 'Installation',
            projectName: 'Residential Office Renovation',
            phase: 'Execution',
            daysOverdue: 3,
            daysUntilDue: -3
        }
    },
    {
        _id: 'alert_011',
        id: 'alert_011',
        type: 'workflow',
        priority: 'low',
        status: 'active',
        isRead: true,
        title: 'Documentation Update Required',
        message: 'Project documentation needs updating for Foster deck build project.',
        projectId: 5,
        assignedTo: 'user_2',
        assignedToUser: 'user_2',
        createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        user: {
            _id: 'user_2',
            id: 'user_2',
            firstName: 'Mike',
            lastName: 'Field',
            name: 'Mike Field',
            email: 'mike@example.com'
        },
        project: {
            _id: 5,
            id: 5,
            name: 'Lakeside Deck Build',
            projectName: 'Lakeside Deck Build'
        },
        relatedProject: {
            _id: 5,
            id: 5,
            name: 'Lakeside Deck Build',
            projectName: 'Lakeside Deck Build',
            projectType: 'Decking',
            status: 'approved'
        },
        metadata: {
            workflowId: 5,
            stepId: 'step_013',
            stepName: 'Project Closeout',
            cleanTaskName: 'Project Closeout',
            projectName: 'Lakeside Deck Build',
            phase: 'Completion',
            daysOverdue: 0,
            daysUntilDue: 3
        }
    },
    {
        _id: 'alert_012',
        id: 'alert_012',
        type: 'workflow',
        priority: 'high',
        status: 'active',
        isRead: false,
        title: 'Emergency Equipment Failure',
        message: 'Main generator failed on Wilson site - immediate replacement needed.',
        projectId: 1,
        assignedTo: 'admin@kenstruction.com',
        assignedToUser: 'admin@kenstruction.com',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        user: {
            _id: 'admin',
            id: 'admin',
            firstName: 'Admin',
            lastName: 'User',
            name: 'Admin User',
            email: 'admin@kenstruction.com'
        },
        project: {
            _id: 1,
            id: 1,
            name: 'Wilson Residence Roof Replacement',
            projectName: 'Wilson Residence Roof Replacement'
        },
        relatedProject: {
            _id: 1,
            id: 1,
            name: 'Wilson Residence Roof Replacement',
            projectName: 'Wilson Residence Roof Replacement',
            projectType: 'Roofing',
            status: 'active'
        },
        metadata: {
            workflowId: 1,
            stepId: 'step_014',
            stepName: 'Installation',
            cleanTaskName: 'Installation',
            projectName: 'Wilson Residence Roof Replacement',
            phase: 'Execution',
            daysOverdue: 5,
            daysUntilDue: -5
        }
    },
    {
        _id: 'alert_013',
        id: 'alert_013',
        type: 'workflow',
        priority: 'medium',
        status: 'active',
        isRead: false,
        title: 'Budget Variance Alert',
        message: 'Rodriguez siding project exceeding budget by 8% - review costs.',
        projectId: 2,
        assignedTo: 'user_1',
        assignedToUser: 'user_1',
        createdAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        user: {
            _id: 'user_1',
            id: 'user_1',
            firstName: 'Sarah',
            lastName: 'Owner',
            name: 'Sarah Owner',
            email: 'sarah@example.com'
        },
        project: {
            _id: 2,
            id: 2,
            name: 'Residential Siding Repair',
            projectName: 'Residential Siding Repair'
        },
        relatedProject: {
            _id: 2,
            id: 2,
            name: 'Residential Siding Repair',
            projectName: 'Residential Siding Repair',
            projectType: 'Siding',
            status: 'lead'
        },
        metadata: {
            workflowId: 2,
            stepId: 'step_015',
            stepName: 'Agreement Preparation',
            cleanTaskName: 'Agreement Preparation',
            projectName: 'Residential Siding Repair',
            phase: 'Prospect',
            daysOverdue: 1,
            daysUntilDue: -1
        }
    },
    {
        _id: 'alert_014',
        id: 'alert_014',
        type: 'workflow',
        priority: 'low',
        status: 'active',
        isRead: true,
        title: 'Training Certification Expiring',
        message: 'Safety certification expires next month for Thompson remodel crew.',
        projectId: 4,
        assignedTo: 'user_2',
        assignedToUser: 'user_2',
        createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
        user: {
            _id: 'user_2',
            id: 'user_2',
            firstName: 'Mike',
            lastName: 'Field',
            name: 'Mike Field',
            email: 'mike@example.com'
        },
        project: {
            _id: 4,
            id: 4,
            name: 'Maple Street Remodel',
            projectName: 'Maple Street Remodel'
        },
        relatedProject: {
            _id: 4,
            id: 4,
            name: 'Maple Street Remodel',
            projectName: 'Maple Street Remodel',
            projectType: 'Remodeling',
            status: 'active'
        },
        metadata: {
            workflowId: 4,
            stepId: 'step_016',
            stepName: 'Training Renewal',
            cleanTaskName: 'Training Renewal',
            projectName: 'Maple Street Remodel',
            phase: 'Pre-Production',
            daysOverdue: 0,
            daysUntilDue: 18
        }
    },
    {
        _id: 'alert_015',
        id: 'alert_015',
        type: 'workflow',
        priority: 'high',
        status: 'active',
        isRead: false,
        title: 'Client Emergency Contact',
        message: 'Martinez client reports water leak - emergency response required.',
        projectId: 3,
        assignedTo: 'user_3',
        assignedToUser: 'user_3',
        createdAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        user: {
            _id: 'user_3',
            id: 'user_3',
            firstName: 'John',
            lastName: 'Supervisor',
            name: 'John Supervisor',
            email: 'john@example.com'
        },
        project: {
            _id: 3,
            id: 3,
            name: 'Residential Office Renovation',
            projectName: 'Residential Office Renovation'
        },
        relatedProject: {
            _id: 3,
            id: 3,
            name: 'Residential Office Renovation',
            projectName: 'Residential Office Renovation',
            projectType: 'Renovation',
            status: 'execution'
        },
        metadata: {
            workflowId: 3,
            stepId: 'step_017',
            stepName: 'Emergency Response',
            cleanTaskName: 'Emergency Response',
            projectName: 'Residential Office Renovation',
            phase: 'Installation',
            daysOverdue: 8,
            daysUntilDue: -8
        }
    },
    {
        _id: 'alert_016',
        id: 'alert_016',
        type: 'workflow',
        priority: 'medium',
        status: 'active',
        isRead: false,
        title: 'Material Quality Issue',
        message: 'Defective lumber shipment identified for Foster deck project.',
        projectId: 5,
        assignedTo: 'admin@kenstruction.com',
        assignedToUser: 'admin@kenstruction.com',
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        user: {
            _id: 'admin',
            id: 'admin',
            firstName: 'Admin',
            lastName: 'User',
            name: 'Admin User',
            email: 'admin@kenstruction.com'
        },
        project: {
            _id: 5,
            id: 5,
            name: 'Lakeside Deck Build',
            projectName: 'Lakeside Deck Build'
        },
        relatedProject: {
            _id: 5,
            id: 5,
            name: 'Lakeside Deck Build',
            projectName: 'Lakeside Deck Build',
            projectType: 'Decking',
            status: 'approved'
        },
        metadata: {
            workflowId: 5,
            stepId: 'step_018',
            stepName: 'Administrative Setup',
            cleanTaskName: 'Administrative Setup',
            projectName: 'Lakeside Deck Build',
            phase: 'Approved',
            daysOverdue: 4,
            daysUntilDue: -4
        }
    },
    {
        _id: 'alert_017',
        id: 'alert_017',
        type: 'workflow',
        priority: 'low',
        status: 'active',
        isRead: true,
        title: 'Insurance Documentation',
        message: 'Annual insurance policy update required for Wilson project.',
        projectId: 1,
        assignedTo: 'user_1',
        assignedToUser: 'user_1',
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        user: {
            _id: 'user_1',
            id: 'user_1',
            firstName: 'Sarah',
            lastName: 'Owner',
            name: 'Sarah Owner',
            email: 'sarah@example.com'
        },
        project: {
            _id: 1,
            id: 1,
            name: 'Wilson Residence Roof Replacement',
            projectName: 'Wilson Residence Roof Replacement'
        },
        relatedProject: {
            _id: 1,
            id: 1,
            name: 'Wilson Residence Roof Replacement',
            projectName: 'Wilson Residence Roof Replacement',
            projectType: 'Roofing',
            status: 'active'
        },
        metadata: {
            workflowId: 1,
            stepId: 'step_019',
            stepName: 'Insurance Process',
            cleanTaskName: 'Insurance Process',
            projectName: 'Wilson Residence Roof Replacement',
            phase: 'Prospect',
            daysOverdue: 0,
            daysUntilDue: 15
        }
    },
    {
        _id: 'alert_018',
        id: 'alert_018',
        type: 'workflow',
        priority: 'high',
        status: 'active',
        isRead: false,
        title: 'Permit Inspection Failed',
        message: 'Building inspection failed for Rodriguez siding - corrections needed.',
        projectId: 2,
        assignedTo: 'user_3',
        assignedToUser: 'user_3',
        createdAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        user: {
            _id: 'user_3',
            id: 'user_3',
            firstName: 'John',
            lastName: 'Supervisor',
            name: 'John Supervisor',
            email: 'john@example.com'
        },
        project: {
            _id: 2,
            id: 2,
            name: 'Residential Siding Repair',
            projectName: 'Residential Siding Repair'
        },
        relatedProject: {
            _id: 2,
            id: 2,
            name: 'Residential Siding Repair',
            projectName: 'Residential Siding Repair',
            projectType: 'Siding',
            status: 'lead'
        },
        metadata: {
            workflowId: 2,
            stepId: 'step_020',
            stepName: 'Pre-Job Actions',
            cleanTaskName: 'Pre-Job Actions',
            projectName: 'Residential Siding Repair',
            phase: 'Approved',
            daysOverdue: 6,
            daysUntilDue: -6
        }
    },
    {
        _id: 'alert_019',
        id: 'alert_019',
        type: 'workflow',
        priority: 'medium',
        status: 'active',
        isRead: false,
        title: 'Subcontractor Scheduling',
        message: 'Electrical subcontractor needs rescheduling for Thompson remodel.',
        projectId: 4,
        assignedTo: 'user_2',
        assignedToUser: 'user_2',
        createdAt: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        user: {
            _id: 'user_2',
            id: 'user_2',
            firstName: 'Mike',
            lastName: 'Field',
            name: 'Mike Field',
            email: 'mike@example.com'
        },
        project: {
            _id: 4,
            id: 4,
            name: 'Maple Street Remodel',
            projectName: 'Maple Street Remodel'
        },
        relatedProject: {
            _id: 4,
            id: 4,
            name: 'Maple Street Remodel',
            projectName: 'Maple Street Remodel',
            projectType: 'Remodeling',
            status: 'active'
        },
        metadata: {
            workflowId: 4,
            stepId: 'step_021',
            stepName: 'Subcontractor Schedule',
            cleanTaskName: 'Subcontractor Schedule',
            projectName: 'Maple Street Remodel',
            phase: 'Installation',
            daysOverdue: 0,
            daysUntilDue: 2
        }
    },
    {
        _id: 'alert_020',
        id: 'alert_020',
        type: 'workflow',
        priority: 'low',
        status: 'active',
        isRead: true,
        title: 'Warranty Registration',
        message: 'Product warranties need registration for Martinez renovation.',
        projectId: 3,
        assignedTo: 'user_1',
        assignedToUser: 'user_1',
        createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        user: {
            _id: 'user_1',
            id: 'user_1',
            firstName: 'Sarah',
            lastName: 'Owner',
            name: 'Sarah Owner',
            email: 'sarah@example.com'
        },
        project: {
            _id: 3,
            id: 3,
            name: 'Residential Office Renovation',
            projectName: 'Residential Office Renovation'
        },
        relatedProject: {
            _id: 3,
            id: 3,
            name: 'Residential Office Renovation',
            projectName: 'Residential Office Renovation',
            projectType: 'Renovation',
            status: 'execution'
        },
        metadata: {
            workflowId: 3,
            stepId: 'step_022',
            stepName: 'Warranty Registration',
            cleanTaskName: 'Warranty Registration',
            projectName: 'Residential Office Renovation',
            phase: 'Closeout',
            daysOverdue: 0,
            daysUntilDue: 7
        }
    },
    {
        _id: 'alert_004',
        id: 'alert_004',
        type: 'workflow',
        priority: 'medium',
        status: 'active',
        isRead: false,
        title: 'Quality Inspection Due',
        message: 'Mid-project quality inspection required for Maple Street Remodel.',
        projectId: 4,
        assignedTo: 'user_3',
        assignedToUser: 'user_3',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        user: {
            _id: 'user_3',
            id: 'user_3',
            firstName: 'John',
            lastName: 'Supervisor',
            name: 'John Supervisor',
            email: 'john@example.com'
        },
        project: {
            _id: 4,
            id: 4,
            name: 'Maple Street Remodel',
            projectName: 'Maple Street Remodel'
        },
        relatedProject: {
            _id: 4,
            id: 4,
            name: 'Maple Street Remodel',
            projectName: 'Maple Street Remodel',
            projectType: 'Remodeling',
            status: 'active'
        },
        metadata: {
            workflowId: 4,
            stepId: 'step_007',
            stepName: 'Quality Check',
            cleanTaskName: 'Quality Check',
            projectName: 'Maple Street Remodel',
            phase: 'Execution',
            daysOverdue: 0,
            daysUntilDue: 1
        }
    },
    {
        _id: 'alert_005',
        id: 'alert_005',
        type: 'workflow',
        priority: 'high',
        status: 'active',
        isRead: false,
        title: 'Client Complaint Received',
        message: 'Noise complaint from neighbor regarding Wilson Residence project - address immediately.',
        projectId: 1,
        assignedTo: 'user_1',
        assignedToUser: 'user_1',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date().toISOString(),
        user: {
            _id: 'user_1',
            id: 'user_1',
            firstName: 'Sarah',
            lastName: 'Owner',
            name: 'Sarah Owner',
            email: 'sarah@example.com'
        },
        project: {
            _id: 1,
            id: 1,
            name: 'Wilson Residence Roof Replacement',
            projectName: 'Wilson Residence Roof Replacement'
        },
        relatedProject: {
            _id: 1,
            id: 1,
            name: 'Wilson Residence Roof Replacement',
            projectName: 'Wilson Residence Roof Replacement',
            projectType: 'Roofing',
            status: 'active'
        },
        metadata: {
            workflowId: 1,
            stepId: 'step_008',
            stepName: 'Update Customer',
            cleanTaskName: 'Update Customer',
            projectName: 'Wilson Residence Roof Replacement',
            phase: 'Execution',
            daysOverdue: 0,
            daysUntilDue: 0
        }
    },
    {
        _id: 'alert_006',
        id: 'alert_006',
        type: 'workflow',
        priority: 'medium',
        status: 'active',
        isRead: false,
        title: 'Equipment Rental Return',
        message: 'Scaffolding rental due back tomorrow for Lakeside Deck Build project.',
        projectId: 5,
        assignedTo: 'admin@kenstruction.com',
        assignedToUser: 'admin@kenstruction.com',
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        user: {
            _id: 'admin',
            id: 'admin',
            firstName: 'Admin',
            lastName: 'User',
            name: 'Admin User',
            email: 'admin@kenstruction.com'
        },
        project: {
            _id: 5,
            id: 5,
            name: 'Lakeside Deck Build',
            projectName: 'Lakeside Deck Build'
        },
        relatedProject: {
            _id: 5,
            id: 5,
            name: 'Lakeside Deck Build',
            projectName: 'Lakeside Deck Build',
            projectType: 'Decking',
            status: 'approved'
        },
        metadata: {
            workflowId: 5,
            stepId: 'step_010',
            stepName: 'Equipment Return',
            cleanTaskName: 'Equipment Return',
            projectName: 'Lakeside Deck Build',
            phase: 'Installation',
            daysOverdue: 0,
            daysUntilDue: 1
        }
    },
    {
        _id: 'alert_007',
        id: 'alert_007',
        type: 'workflow',
        priority: 'low',
        status: 'active',
        isRead: false,
        title: 'Invoice Payment Reminder',
        message: 'Follow up on outstanding payment from Foster residence.',
        projectId: 5,
        assignedTo: 'user_1',
        assignedToUser: 'user_1',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        user: {
            _id: 'user_1',
            id: 'user_1',
            firstName: 'Sarah',
            lastName: 'Owner',
            name: 'Sarah Owner',
            email: 'sarah@example.com'
        },
        project: {
            _id: 5,
            id: 5,
            name: 'Lakeside Deck Build',
            projectName: 'Lakeside Deck Build'
        },
        relatedProject: {
            _id: 5,
            id: 5,
            name: 'Lakeside Deck Build',
            projectName: 'Lakeside Deck Build',
            projectType: 'Decking',
            status: 'approved'
        },
        metadata: {
            workflowId: 5,
            stepId: 'step_011',
            stepName: 'Financial Processing',
            cleanTaskName: 'Financial Processing',
            projectName: 'Lakeside Deck Build',
            phase: 'Completion',
            daysOverdue: 0,
            daysUntilDue: 3
        }
    },
    {
        _id: 'alert_008',
        id: 'alert_008',
        type: 'workflow',
        priority: 'high',
        status: 'active',
        isRead: false,
        title: 'Crew Scheduling Conflict',
        message: 'Mike and John both assigned to same time slot - resolve scheduling conflict.',
        projectId: 2,
        assignedTo: 'admin@kenstruction.com',
        assignedToUser: 'admin@kenstruction.com',
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        user: {
            _id: 'admin',
            id: 'admin',
            firstName: 'Admin',
            lastName: 'User',
            name: 'Admin User',
            email: 'admin@kenstruction.com'
        },
        project: {
            _id: 2,
            id: 2,
            name: 'Residential Siding Repair',
            projectName: 'Residential Siding Repair'
        },
        relatedProject: {
            _id: 2,
            id: 2,
            name: 'Residential Siding Repair',
            projectName: 'Residential Siding Repair',
            projectType: 'Siding',
            status: 'lead'
        },
        metadata: {
            workflowId: 2,
            stepId: 'step_012',
            stepName: 'Crew Scheduling',
            cleanTaskName: 'Crew Scheduling',
            projectName: 'Residential Siding Repair',
            phase: 'Pre-Production',
            daysOverdue: 0,
            daysUntilDue: 2
        }
    },
    {
        _id: 'alert_009',
        id: 'alert_009',
        type: 'workflow',
        priority: 'medium',
        status: 'active',
        isRead: false,
        title: 'Weather Delay Notification',
        message: 'Heavy rain forecast - reschedule outdoor work for Residential Office Renovation.',
        projectId: 3,
        assignedToUser: 'user_2',
        assignedTo: 'user_2',
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date().toISOString(),
        user: {
            _id: 'user_2',
            id: 'user_2',
            firstName: 'Mike',
            lastName: 'Field',
            name: 'Mike Field',
            email: 'mike@example.com'
        },
        project: {
            _id: 3,
            id: 3,
            name: 'Residential Office Renovation',
            projectName: 'Residential Office Renovation'
        },
        relatedProject: {
            _id: 3,
            id: 3,
            name: 'Residential Office Renovation',
            projectName: 'Residential Office Renovation',
            projectType: 'Renovation',
            status: 'execution'
        },
        metadata: {
            workflowId: 3,
            stepId: 'step_013',
            stepName: 'Weather Monitoring',
            cleanTaskName: 'Weather Monitoring',
            projectName: 'Residential Office Renovation',
            phase: 'Installation',
            daysOverdue: 0,
            daysUntilDue: 0
        }
    },
    {
        _id: 'alert_010',
        id: 'alert_010',
        type: 'workflow',
        priority: 'high',
        status: 'active',
        isRead: false,
        title: 'Safety Violation Report',
        message: 'Hard hat policy violation reported on Wilson Residence site - immediate corrective action required.',
        projectId: 1,
        assignedTo: 'admin@kenstruction.com',
        assignedToUser: 'admin@kenstruction.com',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date().toISOString(),
        user: {
            _id: 'admin',
            id: 'admin',
            firstName: 'Admin',
            lastName: 'User',
            name: 'Admin User',
            email: 'admin@kenstruction.com'
        },
        project: {
            _id: 1,
            id: 1,
            name: 'Wilson Residence Roof Replacement',
            projectName: 'Wilson Residence Roof Replacement'
        },
        relatedProject: {
            _id: 1,
            id: 1,
            name: 'Wilson Residence Roof Replacement',
            projectName: 'Wilson Residence Roof Replacement',
            projectType: 'Roofing',
            status: 'active'
        },
        metadata: {
            workflowId: 1,
            stepId: 'step_014',
            stepName: 'Installation',
            cleanTaskName: 'Installation',
            projectName: 'Wilson Residence Roof Replacement',
            phase: 'Execution',
            daysOverdue: 0,
            daysUntilDue: 0
        }
    }
];

// Export mockAlerts for use in the application
export { mockAlerts as alerts }; 