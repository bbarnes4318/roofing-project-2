const { PrismaClient } = require('@prisma/client');
const WorkflowAlertService = require('./services/WorkflowAlertService');

const prisma = new PrismaClient();

async function testEventDrivenAlerts() {
  console.log('🧪 Testing Event-Driven Alert System...\n');

  try {
    // Get a project with workflow
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
        }
      }
    });

    if (!project || !project.workflow) {
      console.log('❌ No project with workflow found');
      return;
    }

    console.log(`🏗️ Testing alerts for project: ${project.projectName} (${project.projectNumber})`);
    console.log(`   Workflow ID: ${project.workflow.id}`);
    console.log(`   Current step index: ${project.workflow.currentStepIndex}`);
    console.log(`   Total steps: ${project.workflow.steps.length}`);

    // Find the current step
    const currentStep = project.workflow.steps[project.workflow.currentStepIndex];
    if (!currentStep) {
      console.log('❌ No current step found');
      return;
    }

    console.log(`\n📋 Current step: "${currentStep.stepName}" (${currentStep.phase})`);
    console.log(`   Assigned to: ${currentStep.assignedToId}`);
    console.log(`   Sub-tasks: ${currentStep.subTasks.length}`);
    console.log(`   Completed: ${currentStep.isCompleted}`);

    // Complete the current step
    console.log('\n🔔 COMPLETING CURRENT STEP...');
    const completionResult = await WorkflowAlertService.completeWorkflowStep(
      project.workflow.id,
      currentStep.stepId,
      currentStep.assignedToId,
      'Test completion'
    );

    if (completionResult.success) {
      console.log('✅ Step completed successfully!');
      
      if (completionResult.nextStep) {
        console.log(`\n📋 Next step: "${completionResult.nextStep.stepName}" (${completionResult.nextStep.phase})`);
        console.log(`   This step should now have alerts triggered automatically`);
      } else {
        console.log('\n🎉 Workflow completed! No more steps.');
      }
    } else {
      console.log('❌ Failed to complete step:', completionResult.error);
    }

    // Check for new alerts
    console.log('\n📨 Checking for new alerts...');
    const alerts = await prisma.notification.findMany({
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

    console.log(`📊 Found ${alerts.length} recent alerts:`);
    alerts.forEach(alert => {
      const projectName = alert.metadata?.projectName || alert.actionData?.projectName;
      const recipient = alert.recipient;
      console.log(`   - ${alert.title} for ${projectName} (${recipient.firstName} ${recipient.lastName})`);
    });

    console.log('\n🎉 Event-driven alert test completed!');
    console.log('💡 The system now triggers alerts immediately when workflow steps are completed,');
    console.log('   instead of waiting for time-based polling.');

  } catch (error) {
    console.error('❌ Error testing event-driven alerts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEventDrivenAlerts(); 