const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestAlerts() {
  try {
    console.log('🔍 Finding existing project...');
    
    // Find an existing project
    const project = await prisma.project.findFirst({
      include: {
        customer: true
      }
    });
    
    if (!project) {
      console.log('❌ No project found. Please create a project first.');
      return;
    }
    
    console.log(`✅ Found project: ${project.projectName} (ID: ${project.id})`);
    
    // Find a user to assign alerts to
    const user = await prisma.user.findFirst();
    
    if (!user) {
      console.log('❌ No user found. Please create a user first.');
      return;
    }
    
    console.log(`✅ Found user: ${user.firstName} ${user.lastName}`);
    
    // Create workflow alerts for the project
    const alerts = [
      {
        type: 'WORKFLOW_ALERT',
        title: 'Site Inspection - ' + project.projectName,
        message: 'Please complete the site inspection for project #' + (project.projectNumber || '12345'),
        recipientId: user.id,
        actionData: {
          projectId: project.id,
          projectNumber: project.projectNumber || '12345',
          projectName: project.projectName,
          phase: 'PROSPECT',
          priority: 'high',
          stepName: 'Site Inspection',
          stepId: 'PROSPECT-site-inspection'
        }
      },
      {
        type: 'WORKFLOW_ALERT',
        title: 'Write Estimate - ' + project.projectName,
        message: 'Please write the estimate for project #' + (project.projectNumber || '12345'),
        recipientId: user.id,
        actionData: {
          projectId: project.id,
          projectNumber: project.projectNumber || '12345',
          projectName: project.projectName,
          phase: 'PROSPECT',
          priority: 'medium',
          stepName: 'Write Estimate',
          stepId: 'PROSPECT-write-estimate'
        }
      },
      {
        type: 'WORKFLOW_ALERT',
        title: 'Schedule Initial Inspection - ' + project.projectName,
        message: 'Please schedule the initial inspection for project #' + (project.projectNumber || '12345'),
        recipientId: user.id,
        actionData: {
          projectId: project.id,
          projectNumber: project.projectNumber || '12345',
          projectName: project.projectName,
          phase: 'LEAD',
          priority: 'medium',
          stepName: 'Schedule Initial Inspection',
          stepId: 'LEAD-schedule-initial-inspection'
        }
      }
    ];
    
    console.log('📝 Creating workflow alerts...');
    
    for (const alertData of alerts) {
      const alert = await prisma.notification.create({
        data: alertData
      });
      console.log(`✅ Created alert: ${alert.title}`);
    }
    
    console.log(`\n🎉 Successfully created ${alerts.length} workflow alerts!`);
    
    // Display summary
    const totalAlerts = await prisma.notification.count({
      where: { type: 'WORKFLOW_ALERT' }
    });
    
    console.log(`\n📊 Total workflow alerts in database: ${totalAlerts}`);
    
  } catch (error) {
    console.error('❌ Error creating test alerts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestAlerts();