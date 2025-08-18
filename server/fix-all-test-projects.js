const { prisma } = require('./config/prisma');

async function fixAllTestProjects() {
  try {
    console.log('🔧 Fixing all test projects (99001, 99002, 99003)...\n');
    
    const testProjects = await prisma.project.findMany({
      where: {
        projectNumber: {
          in: [99001, 99002, 99003]
        }
      },
      include: {
        workflowTrackers: true
      }
    });
    
    console.log(`Found ${testProjects.length} test projects\n`);
    
    for (const project of testProjects) {
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
        } else {
          console.log(`  ✅ Already correct`);
        }
      }
      console.log();
    }
    
    console.log('✅ All test projects fixed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllTestProjects();