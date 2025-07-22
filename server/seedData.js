const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://jimbosky35:Balls3560@kenstruction.h0xgjuh.mongodb.net/?retryWrites=true&w=majority&appName=kenstruction', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Import schemas
const TeamMember = require('./models/TeamMember');
const Project = require('./models/Project');
const Task = require('./models/Task');
const Activity = require('./models/Activity');
const ProjectSchedule = require('./models/ProjectSchedule');

// Mock data
const teamMembers = [
    { id: 'user_1', name: 'Sarah Owner', email: 'sarah@example.com' },
    { id: 'user_2', name: 'Mike Field', email: 'mike@example.com' },
    { id: 'user_3', name: 'John Supervisor', email: 'john@example.com' },
];

const initialProjects = [
    {
        id: 1,
        name: 'Wilson Residence Roof Replacement',
        type: 'Roofing',
        status: 'active',
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
            { id: 1, author: 'Mike Field', avatar: 'M', content: 'Completed the initial inspection. Photos are uploaded. Decking looks solid.', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)},
            { id: 2, author: 'Sarah Owner', avatar: 'S', content: 'Great, thanks Mike. Let\'s get the estimate finalized and sent over to the client by EOD.', timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000) },
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
            { id: 3, author: 'Sarah Owner', avatar: 'S', content: 'We need to get the permit submitted for the Rodriguez job ASAP.', timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        ],
        checklist: [ { id: 4, stage: 'Pre-Production', items: [ { id: 10, text: 'Contract signed and uploaded', completed: true }, { id: 11, text: 'Permit application submitted', completed: false }, { id: 12, text: 'Material order finalized', completed: false } ] } ]
    },
    {
        id: 3,
        name: 'Residential Office Renovation',
        type: 'Renovation',
        status: 'completion',
        estimateValue: 120000,
        progress: 100,
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
            { id: 4, author: 'Emily Davis', avatar: 'E', content: 'Project completed successfully. Client is very satisfied with the results.', timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        ],
        checklist: [
            { id: 5, stage: 'Pre-Production', items: [ { id: 13, text: 'Contract signed and uploaded', completed: true }, { id: 14, text: 'Permit application submitted', completed: true }, { id: 15, text: 'Material order finalized', completed: true } ] },
            { id: 6, stage: 'Installation', items: [ { id: 16, text: 'Material delivery confirmed', completed: true }, { id: 17, text: 'Daily safety meeting conducted', completed: true }, { id: 18, text: 'Construction complete', completed: true } ] },
            { id: 7, stage: 'Closeout', items: [ { id: 19, text: 'Final inspection passed', completed: true }, { id: 20, text: 'Final invoice sent to customer', completed: true }, { id: 21, text: 'Warranty documents delivered', completed: true } ] },
        ]
    },
    {
        id: 4,
        name: 'Thompson Residence Remodel',
        type: 'Remodeling',
        status: 'execution',
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
            { id: 5, author: 'John Smith', avatar: 'J', content: 'Kitchen cabinets delivered and inspected. All pieces accounted for and in good condition.', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }
        ],
        checklist: [
            { id: 8, stage: 'Pre-Production', items: [ { id: 22, text: 'Contract signed and uploaded', completed: true }, { id: 23, text: 'Permit application submitted', completed: true }, { id: 24, text: 'Material order finalized', completed: true } ] },
            { id: 9, stage: 'Installation', items: [ { id: 25, text: 'Material delivery confirmed', completed: true }, { id: 26, text: 'Daily safety meeting conducted', completed: false }, { id: 27, text: 'Kitchen installation', completed: false } ] }
        ]
    },
    {
        id: 5,
        name: 'Foster Residence Deck Build',
        type: 'Decking',
        status: 'completion',
        estimateValue: 65000,
        progress: 100,
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
            { id: 6, author: 'Lisa Wong', avatar: 'L', content: 'Final deck inspection completed. All railings meet safety standards. Client very pleased with the finished product.', timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        ],
        checklist: [
            { id: 10, stage: 'Pre-Production', items: [ { id: 28, text: 'Contract signed and uploaded', completed: true }, { id: 29, text: 'Permit application submitted', completed: true }, { id: 30, text: 'Material order finalized', completed: true } ] },
            { id: 11, stage: 'Installation', items: [ { id: 31, text: 'Material delivery confirmed', completed: true }, { id: 32, text: 'Daily safety meeting conducted', completed: true }, { id: 33, text: 'Deck construction complete', completed: true } ] },
            { id: 12, stage: 'Closeout', items: [ { id: 34, text: 'Final inspection passed', completed: true }, { id: 35, text: 'Final invoice sent to customer', completed: true }, { id: 36, text: 'Warranty documents delivered', completed: true } ] }
        ]
    }
];

const initialTasks = [
    { id: 1, title: 'Roof inspection - 123 Main St', description: 'Complete safety inspection before work begins', assignedTo: 'user_2', projectId: 1, alertDate: '2024-06-04', priority: 'high', status: 'pending' },
    { id: 2, title: 'Submit insurance documentation', description: 'Upload all required forms to customer portal', assignedTo: 'user_3', projectId: 1, alertDate: '2024-06-02', priority: 'high', status: 'overdue' },
    { id: 3, title: 'Material delivery coordination', description: 'Coordinate with supplier for delivery schedule', assignedTo: 'user_3', projectId: 2, alertDate: '2024-06-10', priority: 'medium', status: 'in-progress' },
    { id: 4, title: 'Safety meeting required', description: 'Daily safety briefing needed before crew starts work', assignedTo: 'user_2', projectId: 1, alertDate: '2024-06-05', priority: 'high', status: 'pending' },
    { id: 5, title: 'Permit approval check', description: 'Verify building permit status for Rodriguez project', assignedTo: 'user_1', projectId: 2, alertDate: '2024-06-03', priority: 'medium', status: 'pending' },
    { id: 6, title: 'Client meeting scheduled', description: 'Final walkthrough meeting with Stephens family', assignedTo: 'user_1', projectId: 1, alertDate: '2024-06-06', priority: 'medium', status: 'pending' },
    { id: 7, title: 'Equipment maintenance due', description: 'Annual inspection of safety equipment required', assignedTo: 'user_3', projectId: null, alertDate: '2024-06-08', priority: 'high', status: 'pending' },
    { id: 8, title: 'Weather delay notification', description: 'Heavy rain forecast - reschedule outdoor work', assignedTo: 'user_2', projectId: 1, alertDate: '2024-06-05', priority: 'medium', status: 'pending' },
    { id: 9, title: 'Material shortage alert', description: 'Shingles delivery delayed - contact supplier', assignedTo: 'user_3', projectId: 1, alertDate: '2024-06-04', priority: 'high', status: 'overdue' },
    { id: 10, title: 'Quality inspection overdue', description: 'Mid-project quality check required for Thompson residence', assignedTo: 'user_2', projectId: 4, alertDate: '2024-06-01', priority: 'medium', status: 'overdue' },
    { id: 11, title: 'Invoice payment reminder', description: 'Follow up on outstanding payment from Foster residence', assignedTo: 'user_1', projectId: 5, alertDate: '2024-06-07', priority: 'low', status: 'pending' },
    { id: 12, title: 'Crew scheduling conflict', description: 'Mike and John both assigned to same time slot', assignedTo: 'user_1', projectId: 2, alertDate: '2024-06-06', priority: 'high', status: 'pending' },
    { id: 13, title: 'Safety violation report', description: 'Hard hat policy violation reported on site', assignedTo: 'user_3', projectId: 1, alertDate: '2024-06-05', priority: 'high', status: 'in-progress' },
    { id: 14, title: 'Equipment rental return', description: 'Scaffolding rental due back to supplier', assignedTo: 'user_2', projectId: 4, alertDate: '2024-06-09', priority: 'medium', status: 'pending' },
    { id: 15, title: 'Client complaint received', description: 'Noise complaint from neighbor - address immediately', assignedTo: 'user_1', projectId: 1, alertDate: '2024-06-04', priority: 'high', status: 'in-progress' }
];

const initialActivityData = [
    { 
        id: 1, 
        author: 'Mike Field', 
        avatar: 'M', 
        content: 'Completed the initial inspection for the Stephens Residence.', 
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        projectId: 1, 
        project: 'Stephens Residence Roof Replacement' 
    },
    { 
        id: 2, 
        author: 'Sarah Owner', 
        avatar: 'S', 
        content: 'We need to get the permit submitted for the Rodriguez job ASAP.', 
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        projectId: 2, 
        project: 'Residential Siding Repair' 
    },
    { 
        id: 3, 
        author: 'John Supervisor', 
        avatar: 'J', 
        content: 'Material delivery confirmed for Stephens job, scheduled for tomorrow morning.', 
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        projectId: 1, 
        project: 'Stephens Residence Roof Replacement' 
    }
];

async function seedDatabase() {
    try {
        console.log('Starting database seeding...');
        
        // Clear existing data
        await TeamMember.deleteMany({});
        await Project.deleteMany({});
        await Task.deleteMany({});
        await Activity.deleteMany({});
        await ProjectSchedule.deleteMany({});
        
        console.log('Cleared existing data');
        
        // Insert team members
        const teamMembersResult = await TeamMember.insertMany(teamMembers);
        console.log(`Inserted ${teamMembersResult.length} team members`);
        
        // Insert projects
        const projectsResult = await Project.insertMany(initialProjects);
        console.log(`Inserted ${projectsResult.length} projects`);
        
        // Insert tasks
        const tasksResult = await Task.insertMany(initialTasks);
        console.log(`Inserted ${tasksResult.length} tasks`);
        
        // Insert activities
        const activitiesResult = await Activity.insertMany(initialActivityData);
        console.log(`Inserted ${activitiesResult.length} activities`);
        
        // Insert project schedules
        const schedules = initialProjects.map(project => ({
            projectId: project.id,
            laborStart: project.laborStart,
            laborEnd: project.laborEnd,
            materialsDeliveryStart: project.materialsDeliveryStart,
            materialsDeliveryEnd: project.materialsDeliveryEnd
        }));
        
        const schedulesResult = await ProjectSchedule.insertMany(schedules);
        console.log(`Inserted ${schedulesResult.length} project schedules`);
        
        console.log('Database seeding completed successfully!');
        
    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        mongoose.connection.close();
    }
}

seedDatabase();
