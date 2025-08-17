
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function regenerateAlerts() {
  console.log('Starting alert regeneration...');
  
  try {
    // Get all active projects with their workflow trackers
    const projects = await prisma.project.findMany({
      where: {
        archived: false,
        status: { not: 'COMPLETED' }
      },
      include: {
        projectWorkflowTracker: {
          include: {
            currentLineItem: true,
            currentSection: true,
            currentPhase: true
          }
        }
      }
    });
    
    console.log(`Found ${projects.length} active projects`);
    
    for (const project of projects) {
      if (!project.projectWorkflowTracker) {
        console.log(`Project ${project.projectNumber} has no workflow tracker`);
        continue;
      }
      
      const tracker = project.projectWorkflowTracker;
      
      // Create alert for current line item
      if (tracker.currentLineItem) {
        const alert = await prisma.workflowAlert.create({
          data: {
            type: 'WORKFLOW_TASK',
            priority: 'MEDIUM',
            status: 'PENDING',
            title: `Complete: ${tracker.currentLineItem.itemName}`,
            message: `Line item "${tracker.currentLineItem.itemName}" is ready to be completed for project ${project.projectNumber}`,
            stepName: tracker.currentLineItem.itemName,
            projectId: project.id,
            lineItemId: tracker.currentLineItemId,
            sectionId: tracker.currentSectionId,
            phaseId: tracker.currentPhaseId,
            responsibleRole: tracker.currentLineItem.responsibleRole || 'OFFICE',
            dueDate: new Date(Date.now() + (tracker.currentLineItem.alertDays || 1) * 24 * 60 * 60 * 1000)
          }
        });
        
        console.log(`Created alert for project ${project.projectNumber}: ${tracker.currentLineItem.itemName}`);
      }
    }
    
    console.log('Alert regeneration complete!');
    
  } catch (error) {
    console.error('Error regenerating alerts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

regenerateAlerts();
