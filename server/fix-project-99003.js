const { prisma } = require('./config/prisma');

async function fixProject99003() {
  try {
    console.log('🔧 Fixing project 99003 totalLineItems...\n');
    
    // Get the project and its tracker
    const project = await prisma.project.findFirst({
      where: { projectNumber: 99003 },
      include: {
        workflowTrackers: true
      }
    });
    
    if (!project) {
      console.log('❌ Project 99003 not found');
      return;
    }
    
    console.log(`Found project: ${project.projectName} (${project.projectType})`);
    console.log(`Workflow trackers: ${project.workflowTrackers.length}`);
    
    for (const tracker of project.workflowTrackers) {
      console.log(`  Tracker: ${tracker.workflowType}, Current totalLineItems: ${tracker.totalLineItems}`);
      
      // Get correct total for this workflow type
      const correctTotal = await prisma.workflowLineItem.count({
        where: {
          isActive: true,
          isCurrent: true,
          workflowType: tracker.workflowType
        }
      });
      
      console.log(`  Correct totalLineItems should be: ${correctTotal}`);
      
      // Update the tracker
      await prisma.projectWorkflowTracker.update({
        where: { id: tracker.id },
        data: { totalLineItems: correctTotal }
      });
      
      console.log(`  ✅ Updated tracker with totalLineItems: ${correctTotal}`);
    }
    
    console.log('\n✅ Project 99003 fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixProject99003();