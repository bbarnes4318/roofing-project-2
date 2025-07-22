const mongoose = require('mongoose');
const User = require('./models/User');
const Project = require('./models/Project');
const ProjectWorkflow = require('./models/ProjectWorkflow');

async function addMissingWorkflows() {
  try {
    console.log('🔍 Connecting to database...');
    
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://prospect_finder:Toobs3560@cluster0.s4mm3b5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected! Finding projects without workflows...');
    
    // Find all projects
    const allProjects = await Project.find({});
    console.log(`📋 Found ${allProjects.length} total projects`);
    
    // Find all existing workflows
    const existingWorkflows = await ProjectWorkflow.find({});
    const existingProjectIds = existingWorkflows.map(w => w.project.toString());
    console.log(`🔧 Found ${existingWorkflows.length} existing workflows`);
    
    // Find projects without workflows
    const projectsWithoutWorkflows = allProjects.filter(p => !existingProjectIds.includes(p._id.toString()));
    console.log(`⚠️ Found ${projectsWithoutWorkflows.length} projects without workflows`);
    
    if (projectsWithoutWorkflows.length === 0) {
      console.log('🎉 All projects already have workflows!');
      return;
    }
    
    // Get all users for team assignments
    const users = await User.find({});
    const adminUsers = users.filter(u => u.role === 'admin');
    const managerUsers = users.filter(u => u.role === 'manager');
    const foremanUsers = users.filter(u => u.role === 'foreman');
    const projectManagerUsers = users.filter(u => u.role === 'project_manager');
    
    console.log(`👥 Available users: ${adminUsers.length} admins, ${managerUsers.length} managers, ${foremanUsers.length} foremen, ${projectManagerUsers.length} project managers`);
    
    // Create workflows for projects that don't have them
    for (const project of projectsWithoutWorkflows) {
      try {
        console.log(`🔧 Creating workflow for project: ${project.projectName || project.name}`);
        
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
            office: [...adminUsers.map(u => u._id), ...managerUsers.map(u => u._id)],
            administration: adminUsers.map(u => u._id),
            project_manager: [...projectManagerUsers.map(u => u._id), ...managerUsers.map(u => u._id)],
            field_director: foremanUsers.map(u => u._id),
            roof_supervisor: managerUsers.map(u => u._id)
          }
        };
        
        const workflow = await ProjectWorkflow.create(workflowData);
        console.log(`✅ Created workflow for project: ${project.projectName || project.name} (Workflow ID: ${workflow._id})`);
        
      } catch (workflowError) {
        console.error(`❌ Error creating workflow for project ${project.projectName || project.name}:`, workflowError.message);
      }
    }
    
    console.log('🎉 Finished adding missing workflows!');
    
    // Verify final count
    const finalWorkflows = await ProjectWorkflow.find({});
    const finalProjects = await Project.find({});
    console.log(`📊 Final results: ${finalProjects.length} projects, ${finalWorkflows.length} workflows`);
    
  } catch (error) {
    console.error('❌ Error adding missing workflows:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the fix
addMissingWorkflows(); 