const { prisma } = require('./config/prisma');

async function fixAllProjectTotalLineItems() {
  try {
    console.log('🔧 Fixing totalLineItems for ALL projects...\n');
    
    // Get all projects with workflow trackers that have null or 0 totalLineItems
    const projects = await prisma.project.findMany({
      include: {
        workflowTrackers: {
          where: {
            OR: [
              { totalLineItems: null },
              { totalLineItems: 0 }
            ]
          }
        }
      }
    });
    
    let fixedCount = 0;
    
    console.log(`Found ${projects.length} projects with missing totalLineItems\n`);
    
    for (const project of projects) {
      if (project.workflowTrackers.length === 0) continue;
      
      console.log(`📋 Project ${project.projectNumber}: ${project.projectName} (${project.projectType})`);
      
      for (const tracker of project.workflowTrackers) {
        console.log(`  Tracker: ${tracker.workflowType}, Current totalLineItems: ${tracker.totalLineItems || 0}`);
        
        // Get correct total for this workflow type
        const correctTotal = await prisma.workflowLineItem.count({
          where: {
            isActive: true,
            isCurrent: true,
            workflowType: tracker.workflowType
          }
        });
        
        console.log(`  Should be: ${correctTotal}`);
        
        if (tracker.totalLineItems !== correctTotal) {
          await prisma.projectWorkflowTracker.update({
            where: { id: tracker.id },
            data: { totalLineItems: correctTotal }
          });
          console.log(`  ✅ Updated to ${correctTotal}`);
          fixedCount++;
        } else {
          console.log(`  ✅ Already correct`);
        }
      }
      console.log();
    }
    
    console.log(`✅ Fixed ${fixedCount} workflow trackers across ${projects.length} projects!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllProjectTotalLineItems();