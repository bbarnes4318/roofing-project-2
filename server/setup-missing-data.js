const mongoose = require('mongoose');
const User = require('./models/User');
const Project = require('./models/Project');
const ProjectWorkflow = require('./models/ProjectWorkflow');

async function setupMissingData() {
  try {
    console.log('🔍 Connecting to database...');
    
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://prospect_finder:Toobs3560@cluster0.s4mm3b5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected! Setting up missing data...');
    
    // Step 1: Create users from teammembers
    console.log('\n🔧 Creating users from teammembers...');
    const teammembers = await mongoose.connection.db.collection('teammembers').find({}).toArray();
    console.log(`📋 Found ${teammembers.length} teammembers`);
    
    for (const member of teammembers) {
      console.log(`👤 Creating user: ${member.name} (${member.role})`);
      
      // Map roles from teammembers to valid user roles
      let userRole = 'worker'; // default
      if (member.role === 'Team Member') {
        userRole = 'worker';
      } else if (member.name.toLowerCase().includes('owner')) {
        userRole = 'admin';
      } else if (member.name.toLowerCase().includes('supervisor')) {
        userRole = 'manager';
      } else if (member.name.toLowerCase().includes('field')) {
        userRole = 'foreman';
      }
      
      const userData = {
        firstName: member.name.split(' ')[0] || member.name,
        lastName: member.name.split(' ').slice(1).join(' ') || 'User',
        email: member.email,
        role: userRole,
        isActive: true,
        password: 'password123' // Default password
      };
      
      try {
        const existingUser = await User.findOne({ email: member.email });
        if (!existingUser) {
          await User.create(userData);
          console.log(`✅ Created user: ${member.name}`);
        } else {
          console.log(`⚠️ User already exists: ${member.name}`);
        }
      } catch (userError) {
        console.error(`❌ Error creating user ${member.name}:`, userError.message);
      }
    }
    
    // Step 2: Create workflows for existing projects
    console.log('\n🔧 Creating workflows for existing projects...');
    const projects = await mongoose.connection.db.collection('projects').find({}).toArray();
    console.log(`📋 Found ${projects.length} projects`);
    
    for (const project of projects) {
      console.log(`🏗️ Creating workflow for project: ${project.name}`);
      
      try {
        const existingWorkflow = await ProjectWorkflow.findOne({ project: project._id });
        if (!existingWorkflow) {
          // Create a basic workflow with Lead phase steps
          const workflowData = {
            project: project._id,
            status: 'not_started',
            overallProgress: 0,
            currentStep: 1,
            steps: [
              {
                stepId: 'lead_1',
                stepName: 'Input Customer Information',
                phase: 'Lead',
                orderInPhase: 1,
                defaultResponsible: 'office',
                isCompleted: false,
                description: 'Enter and verify customer contact information',
                estimatedDuration: 2, // days
                scheduledStartDate: new Date(),
                scheduledEndDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
                subTasks: [
                  {
                    subTaskId: 'lead_1_1',
                    subTaskName: 'Enter customer contact info',
                    isCompleted: false
                  },
                  {
                    subTaskId: 'lead_1_2',
                    subTaskName: 'Verify customer details',
                    isCompleted: false
                  }
                ],
                alertTriggers: {
                  priority: 'Medium',
                  overdueIntervals: [1, 3, 7]
                }
              },
              {
                stepId: 'lead_2',
                stepName: 'Complete Questions to Ask Checklist',
                phase: 'Lead',
                orderInPhase: 2,
                defaultResponsible: 'office',
                isCompleted: false,
                description: 'Complete initial customer questionnaire',
                estimatedDuration: 2, // days
                scheduledStartDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
                scheduledEndDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
                subTasks: [
                  {
                    subTaskId: 'lead_2_1',
                    subTaskName: 'Complete initial questions',
                    isCompleted: false
                  },
                  {
                    subTaskId: 'lead_2_2',
                    subTaskName: 'Review answers',
                    isCompleted: false
                  }
                ],
                alertTriggers: {
                  priority: 'Medium',
                  overdueIntervals: [1, 3, 7]
                }
              },
              {
                stepId: 'lead_3',
                stepName: 'Input Lead Property Information',
                phase: 'Lead',
                orderInPhase: 3,
                defaultResponsible: 'office',
                isCompleted: false,
                description: 'Enter property details and specifications',
                estimatedDuration: 2, // days
                scheduledStartDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
                scheduledEndDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
                subTasks: [
                  {
                    subTaskId: 'lead_3_1',
                    subTaskName: 'Enter property details',
                    isCompleted: false
                  },
                  {
                    subTaskId: 'lead_3_2',
                    subTaskName: 'Verify property information',
                    isCompleted: false
                  }
                ],
                alertTriggers: {
                  priority: 'Medium',
                  overdueIntervals: [1, 3, 7]
                }
              }
            ],
            teamAssignments: {
              office: [], // Will be populated from users
              administration: [],
              project_manager: [],
              field_director: [],
              roof_supervisor: []
            }
          };
          
          // Get users to assign to teams
          const users = await User.find({});
          const officeUsers = users.filter(u => ['admin', 'manager'].includes(u.role));
          const projectManagers = users.filter(u => u.role === 'project_manager');
          
          if (officeUsers.length > 0) {
            workflowData.teamAssignments.office = officeUsers.map(u => u._id);
            workflowData.teamAssignments.administration = officeUsers.map(u => u._id);
          }
          
          if (projectManagers.length > 0) {
            workflowData.teamAssignments.project_manager = projectManagers.map(u => u._id);
          }
          
          await ProjectWorkflow.create(workflowData);
          console.log(`✅ Created workflow for project: ${project.name}`);
        } else {
          console.log(`⚠️ Workflow already exists for project: ${project.name}`);
        }
      } catch (workflowError) {
        console.error(`❌ Error creating workflow for ${project.name}:`, workflowError.message);
      }
    }
    
    console.log('\n🎉 Setup complete! Database should now have:');
    console.log(`   - ${await User.countDocuments()} users`);
    console.log(`   - ${await ProjectWorkflow.countDocuments()} workflows`);
    console.log(`   - ${await Project.countDocuments()} projects`);
    
  } catch (error) {
    console.error('❌ Error setting up missing data:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the setup
setupMissingData(); 