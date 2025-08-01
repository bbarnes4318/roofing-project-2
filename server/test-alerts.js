const { PrismaClient } = require('@prisma/client');
const WorkflowAlertService = require('./services/WorkflowAlertService');

const prisma = new PrismaClient();

async function testAlertSystem() {
  console.log('🧪 Testing Alert System with Specific Users...\n');

  try {
    // Get all users to verify they were created correctly
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    console.log('📋 Created Users:');
    users.forEach(user => {
      console.log(`   - ${user.firstName} ${user.lastName} (${user.role}) - ${user.email}`);
    });

    // Get a project with workflow to test alerts
    const project = await prisma.project.findFirst({
      include: {
        workflow: {
          include: {
            steps: {
              include: {
                subTasks: true
              }
            }
          }
        },
        customer: true,
        projectManager: true
      }
    });

    if (!project) {
      console.log('❌ No projects found');
      return;
    }

    console.log(`🏗️ Testing alerts for project: ${project.address}`);
    console.log(`   Project ID: ${project.id}`);
    console.log(`   Workflow ID: ${project.workflow?.id}`);
    console.log(`   Steps: ${project.workflow?.steps?.length || 0}`);

    // Create some actual workflow alerts manually
    console.log('\n🔔 Creating test workflow alerts...');
    
    const testAlerts = [
      {
        title: 'Write Estimate - Overdue',
        message: 'Write Estimate step is overdue by 2 days. Please complete this step immediately.',
        type: 'WORKFLOW_ALERT',
        recipientId: users.find(u => u.role === 'PROJECT_MANAGER')?.id,
        actionData: {
          projectId: project.id,
          workflowId: project.workflow?.id,
          stepId: project.workflow?.steps?.find(s => s.stepName === 'Write Estimate')?.id,
          stepName: 'Write Estimate',
          phase: 'PROSPECT_NON_INSURANCE',
          daysOverdue: 2,
          priority: 'high',
          user: 'Project Manager'
        }
      },
      {
        title: 'Quality Check - Due Today',
        message: 'Quality Check step is due today. Please review and complete.',
        type: 'WORKFLOW_ALERT',
        recipientId: users.find(u => u.role === 'FOREMAN')?.id,
        actionData: {
          projectId: project.id,
          workflowId: project.workflow?.id,
          stepId: project.workflow?.steps?.find(s => s.stepName === 'Quality Check')?.id,
          stepName: 'Quality Check',
          phase: 'EXECUTION',
          daysUntilDue: 0,
          priority: 'medium',
          user: 'Roof Supervisor'
        }
      },
      {
        title: 'Installation - In Progress',
        message: 'Installation step requires your attention. Materials have been delivered.',
        type: 'WORKFLOW_ALERT',
        recipientId: users.find(u => u.role === 'MANAGER')?.id,
        actionData: {
          projectId: project.id,
          workflowId: project.workflow?.id,
          stepId: project.workflow?.steps?.find(s => s.stepName === 'Installation')?.id,
          stepName: 'Installation',
          phase: 'EXECUTION',
          progress: 25,
          priority: 'medium',
          user: 'Field Director'
        }
      }
    ];

    for (const alertData of testAlerts) {
      if (alertData.recipientId) {
        await prisma.notification.create({
          data: {
            title: alertData.title,
            message: alertData.message,
            type: alertData.type,
            recipientId: alertData.recipientId,
            actionData: alertData.actionData,
            isRead: false
          }
        });
        console.log(`   ✅ Created alert: ${alertData.title}`);
      }
    }

    // Get recent notifications
    const recentNotifications = await prisma.notification.findMany({
      where: {
        type: 'WORKFLOW_ALERT',
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
        }
      },
      include: {
        recipient: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('\n🔔 Recent Workflow Alerts:');
    if (recentNotifications.length === 0) {
      console.log('   No recent workflow alerts found');
    } else {
      recentNotifications.forEach(notification => {
        console.log(`   - ${notification.title}`);
        console.log(`     To: ${notification.recipient?.firstName} ${notification.recipient?.lastName} (${notification.recipient?.email})`);
        console.log(`     Message: ${notification.message}`);
        console.log(`     Type: ${notification.type}`);
      });
    }

    console.log('\n✅ Alert system test completed!');
    console.log('\n🌐 Now check the frontend at http://localhost:3000 to see the alerts in the UI!');
    console.log('📨 The alerts should now display properly with real project data instead of "00000" and "Unknown"');

  } catch (error) {
    console.error('❌ Error testing alert system:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAlertSystem(); 