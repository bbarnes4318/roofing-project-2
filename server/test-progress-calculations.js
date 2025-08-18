const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testProgressCalculations() {
  console.log('🧪 Testing progress calculations for all 3 trade types...\n');
  
  try {
    // Get projects from each trade type
    const roofingProjects = await prisma.project.findMany({
      where: { projectType: 'ROOFING' },
      take: 3,
      include: {
        customer: true,
        workflowTrackers: {
          include: {
            currentPhase: true,
            currentSection: true,
            currentLineItem: true,
            completedItems: true
          }
        }
      }
    });
    
    const gutterProjects = await prisma.project.findMany({
      where: { projectType: 'GUTTERS' },
      take: 2,
      include: {
        customer: true,
        workflowTrackers: {
          include: {
            currentPhase: true,
            currentSection: true,
            currentLineItem: true,
            completedItems: true
          }
        }
      }
    });
    
    const paintProjects = await prisma.project.findMany({
      where: { projectType: 'INTERIOR_PAINT' },
      take: 5, // Include test project 99003
      include: {
        customer: true,
        workflowTrackers: {
          include: {
            currentPhase: true,
            currentSection: true,
            currentLineItem: true,
            completedItems: true
          }
        }
      }
    });
    
    console.log('📊 ROOFING Projects Progress:');
    roofingProjects.forEach(project => {
      const tracker = project.workflowTrackers[0];
      const completedCount = tracker?.completedItems?.length || 0;
      const totalItems = tracker?.totalLineItems || 0;
      const progress = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;
      
      console.log(`   ${project.projectNumber}: "${project.projectName}" - ${progress}% (${completedCount}/${totalItems} items)`);
      if (tracker?.currentPhase) {
        console.log(`      Phase: ${tracker.currentPhase.phaseType} - ${tracker.currentSection?.displayName || 'No section'}`);
      }
    });
    
    console.log('\n📊 GUTTERS Projects Progress:');
    if (gutterProjects.length === 0) {
      console.log('   No gutter projects found');
    } else {
      gutterProjects.forEach(project => {
        const tracker = project.workflowTrackers[0];
        const completedCount = tracker?.completedItems?.length || 0;
        const totalItems = tracker?.totalLineItems || 0;
        const progress = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;
        
        console.log(`   ${project.projectNumber}: "${project.projectName}" - ${progress}% (${completedCount}/${totalItems} items)`);
        if (tracker?.currentPhase) {
          console.log(`      Phase: ${tracker.currentPhase.phaseType} - ${tracker.currentSection?.displayName || 'No section'}`);
        }
      });
    }
    
    console.log('\n📊 INTERIOR_PAINT Projects Progress:');
    paintProjects.forEach(project => {
      const tracker = project.workflowTrackers[0];
      const completedCount = tracker?.completedItems?.length || 0;
      const totalItems = tracker?.totalLineItems || 0;
      const progress = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;
      
      console.log(`   ${project.projectNumber}: "${project.projectName}" - ${progress}% (${completedCount}/${totalItems} items)`);
      if (tracker?.currentPhase) {
        console.log(`      Phase: ${tracker.currentPhase.phaseType} - ${tracker.currentSection?.displayName || 'No section'}`);
      }
    });
    
    // Test multiple workflow project (should be project 20000)
    console.log('\n📊 Multiple Workflow Project Progress:');
    const multiWorkflowProject = await prisma.project.findFirst({
      where: { projectNumber: 20000 },
      include: {
        customer: true,
        workflowTrackers: {
          include: {
            currentPhase: true,
            currentSection: true,
            currentLineItem: true,
            completedItems: true
          }
        }
      }
    });
    
    if (multiWorkflowProject) {
      console.log(`   ${multiWorkflowProject.projectNumber}: "${multiWorkflowProject.projectName}" - ${multiWorkflowProject.workflowTrackers.length} workflows`);
      multiWorkflowProject.workflowTrackers.forEach((tracker, index) => {
        const completedCount = tracker.completedItems?.length || 0;
        const totalItems = tracker.totalLineItems || 25;
        const progress = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;
        const isMain = tracker.isMainWorkflow ? ' (MAIN)' : '';
        
        console.log(`      Workflow ${index + 1}: ${tracker.workflowType}${isMain} - ${progress}% (${completedCount}/${totalItems} items)`);
        if (tracker.currentPhase) {
          console.log(`         Phase: ${tracker.currentPhase.phaseType} - ${tracker.currentSection?.displayName || 'No section'}`);
        }
      });
    } else {
      console.log('   Multiple workflow project not found');
    }
    
    console.log('\n✅ Progress calculation test completed!');
    
  } catch (error) {
    console.error('❌ Error testing progress calculations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testProgressCalculations();