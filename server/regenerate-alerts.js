const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function regenerateAlerts() {
  console.log('Starting alert regeneration...');
  
  try {
    // First, clear any existing alerts (since you mentioned you deleted them)
    const deletedAlerts = await prisma.workflowAlert.deleteMany({});
    console.log(`Cleared ${deletedAlerts.count} existing alerts`);
    
    // Get all active projects with their workflow trackers
    const projects = await prisma.project.findMany({
      where: {
        archived: false,
        status: { not: 'COMPLETED' }
      },
      include: {
        workflowTracker: {
          include: {
            currentLineItem: true,
            currentSection: true,
            currentPhase: true
          }
        },
        customer: true
      }
    });
    
    console.log(`Found ${projects.length} active projects to process`);
    
    let alertsCreated = 0;
    
    for (const project of projects) {
      if (!project.workflowTracker) {
        console.log(`  Project ${project.projectNumber} - ${project.projectName}: No workflow tracker`);
        continue;
      }
      
      const tracker = project.workflowTracker;
      
      // Create alert for current line item
      if (tracker.currentLineItem) {
        try {
          // Check if user exists for assignment
          const users = await prisma.user.findMany({
            where: {
              isActive: true,
              role: {
                in: ['ADMIN', 'MANAGER', 'PROJECT_MANAGER', 'FOREMAN']
              }
            },
            take: 1
          });
          
          const assignedUserId = users.length > 0 ? users[0].id : null;
          
          const alert = await prisma.workflowAlert.create({
            data: {
              type: 'WORKFLOW_TASK',
              priority: tracker.currentLineItem.responsibleRole === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
              status: 'ACTIVE',
              title: `Complete: ${tracker.currentLineItem.itemName}`,
              message: `Line item "${tracker.currentLineItem.itemName}" is ready to be completed for project ${project.projectNumber} - ${project.projectName}`,
              stepName: tracker.currentLineItem.itemName,
              projectId: project.id,
              lineItemId: tracker.currentLineItemId,
              sectionId: tracker.currentSectionId,
              phaseId: tracker.currentPhaseId,
              responsibleRole: tracker.currentLineItem.responsibleRole || 'OFFICE',
              dueDate: new Date(Date.now() + (tracker.currentLineItem.alertDays || 1) * 24 * 60 * 60 * 1000),
              assignedToId: assignedUserId,
              isRead: false,
              acknowledged: false
            }
          });
          
          alertsCreated++;
          console.log(`  ✓ Project ${project.projectNumber}: Created alert for "${tracker.currentLineItem.itemName}"`);
        } catch (error) {
          console.error(`  ✗ Project ${project.projectNumber}: Failed to create alert - ${error.message}`);
        }
      } else {
        console.log(`  Project ${project.projectNumber}: No current line item`);
      }
      
      // Also check for overdue items
      if (tracker.lineItemStartedAt) {
        const daysSinceStart = Math.floor((Date.now() - new Date(tracker.lineItemStartedAt).getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceStart > (tracker.currentLineItem?.alertDays || 3)) {
          try {
            const overdueAlert = await prisma.workflowAlert.create({
              data: {
                type: 'OVERDUE',
                priority: 'HIGH',
                status: 'ACTIVE',
                title: `Overdue: ${tracker.currentLineItem?.itemName || 'Current Task'}`,
                message: `This task is ${daysSinceStart} days overdue for project ${project.projectNumber}`,
                stepName: tracker.currentLineItem?.itemName || 'Unknown',
                projectId: project.id,
                lineItemId: tracker.currentLineItemId,
                sectionId: tracker.currentSectionId,
                phaseId: tracker.currentPhaseId,
                responsibleRole: tracker.currentLineItem?.responsibleRole || 'OFFICE',
                dueDate: new Date(),
                isRead: false,
                acknowledged: false
              }
            });
            
            alertsCreated++;
            console.log(`  ✓ Project ${project.projectNumber}: Created OVERDUE alert`);
          } catch (error) {
            console.error(`  ✗ Project ${project.projectNumber}: Failed to create overdue alert - ${error.message}`);
          }
        }
      }
    }
    
    console.log(`\n=== Alert Regeneration Complete ===`);
    console.log(`Total alerts created: ${alertsCreated}`);
    console.log(`Projects processed: ${projects.length}`);
    
    // Verify alerts were created
    const totalAlerts = await prisma.workflowAlert.count();
    console.log(`Total alerts in database: ${totalAlerts}`);
    
  } catch (error) {
    console.error('Error regenerating alerts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

regenerateAlerts();