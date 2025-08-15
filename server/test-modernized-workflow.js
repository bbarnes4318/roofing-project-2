/**
 * Test the modernized workflow system 
 * Uses the new WorkflowLineItem system exclusively
 */
const { PrismaClient } = require('@prisma/client');
const WorkflowCompletionService = require('./services/WorkflowCompletionService');
const AlertGenerationService = require('./services/AlertGenerationService');

const prisma = new PrismaClient();

async function testModernizedWorkflow() {
  console.log('🧪 Testing Modernized Workflow System\n');

  try {
    // 1. Find a project with an active workflow tracker
    const project = await prisma.project.findFirst({
      where: {
        status: 'IN_PROGRESS',
        workflowTracker: {
          currentLineItemId: { not: null }
        }
      },
      include: {
        workflowTracker: {
          include: {
            currentLineItem: {
              include: {
                section: {
                  include: {
                    phase: true
                  }
                }
              }
            }
          }
        },
        customer: true
      }
    });

    if (!project) {
      console.log('❌ No active projects with workflow trackers found');
      return;
    }

    console.log(`📋 Testing with project: ${project.projectName} (${project.projectNumber})`);
    console.log(`📍 Current line item: ${project.workflowTracker.currentLineItem.itemName}`);
    console.log(`📍 Current section: ${project.workflowTracker.currentLineItem.section.displayName}`);
    console.log(`📍 Current phase: ${project.workflowTracker.currentLineItem.section.phase.phaseName}\n`);

    // 2. Test alert generation for current item
    console.log('🔔 Testing Alert Generation...');
    const alerts = await AlertGenerationService.generateBatchAlerts([project.id]);
    console.log(`Generated ${alerts.length} alerts`);
    if (alerts.length > 0) {
      console.log(`   Alert: ${alerts[0].title}`);
      console.log(`   Uses lineItemId: ${alerts[0].lineItemId}`);
      console.log(`   Uses sectionId: ${alerts[0].sectionId}`);
      console.log(`   Uses phaseId: ${alerts[0].phaseId}\n`);
    }

    // 3. Test workflow completion
    console.log('✅ Testing Line Item Completion...');
    const lineItemId = project.workflowTracker.currentLineItemId;
    const result = await WorkflowCompletionService.completeLineItem(
      project.id,
      lineItemId,
      null, // userId
      'Test completion via modernized system'
    );

    console.log('Completion Results:');
    console.log(`   ✅ Completed: ${result.completedItem.lineItemName}`);
    console.log(`   📍 Next item: ${result.nextItem ? result.nextItem.lineItemName : 'WORKFLOW COMPLETE'}`);
    console.log(`   📊 Progress: ${result.progress.completed}/${result.progress.total} (${result.progress.percentage}%)`);

    // 4. Test that CompletedWorkflowItem was created
    const completedItems = await prisma.completedWorkflowItem.findMany({
      where: {
        tracker: { projectId: project.id }
      },
      include: {
        tracker: {
          include: {
            project: true
          }
        }
      },
      orderBy: { completedAt: 'desc' },
      take: 3
    });

    console.log(`\n📋 Completed Items (last 3):`);
    completedItems.forEach((item, index) => {
      console.log(`   ${index + 1}. Line Item ID: ${item.lineItemId} (${item.completedAt.toISOString()})`);
    });

    // 5. Test that no WorkflowStep records were created/modified
    const recentWorkflowSteps = await prisma.workflowStep.findMany({
      where: {
        updatedAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
      },
      orderBy: { updatedAt: 'desc' },
      take: 5
    });

    console.log(`\n🚫 Recent WorkflowStep modifications: ${recentWorkflowSteps.length}`);
    if (recentWorkflowSteps.length > 0) {
      console.log('   ⚠️ WARNING: WorkflowStep table was modified - this indicates legacy system usage');
      recentWorkflowSteps.forEach(step => {
        console.log(`      Step: ${step.stepName} (${step.updatedAt.toISOString()})`);
      });
    } else {
      console.log('   ✅ GOOD: No WorkflowStep modifications detected');
    }

    // 6. Verify current workflow position
    const updatedProject = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        workflowTracker: {
          include: {
            currentLineItem: {
              include: {
                section: {
                  include: {
                    phase: true
                  }
                }
              }
            }
          }
        }
      }
    });

    console.log(`\n📍 Updated Position:`);
    if (updatedProject.workflowTracker.currentLineItem) {
      console.log(`   Current: ${updatedProject.workflowTracker.currentLineItem.itemName}`);
      console.log(`   Section: ${updatedProject.workflowTracker.currentLineItem.section.displayName}`);
      console.log(`   Phase: ${updatedProject.workflowTracker.currentLineItem.section.phase.phaseName}`);
    } else {
      console.log('   🎉 WORKFLOW COMPLETED!');
    }

    console.log('\n🎉 Modernized Workflow Test SUCCESSFUL!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n')
    });
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testModernizedWorkflow().catch(console.error);