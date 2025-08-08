const { prisma } = require('./config/prisma');

async function debugAlerts() {
  try {
    console.log('🔍 DEBUGGING ALERTS SYSTEM...');
    
    // Check projects
    const projects = await prisma.project.findMany({
      select: { 
        id: true, 
        projectNumber: true, 
        projectName: true, 
        status: true 
      }
    });
    
    console.log(`📊 Found ${projects.length} projects in database:`);
    projects.forEach(p => {
      console.log(`  - ID: ${p.id}, #${p.projectNumber}, Name: ${p.projectName}, Status: ${p.status}`);
    });
    
    // Check projects with status that should generate alerts (PENDING or IN_PROGRESS)
    const activeProjects = projects.filter(p => p.status === 'PENDING' || p.status === 'IN_PROGRESS');
    console.log(`\n🎯 Projects that should have alerts (PENDING/IN_PROGRESS): ${activeProjects.length}`);
    activeProjects.forEach(p => {
      console.log(`  - ID: ${p.id}, #${p.projectNumber}, Name: ${p.projectName}, Status: ${p.status}`);
    });
    
    // Check existing workflow alerts
    const alerts = await prisma.workflowAlert.findMany({
      select: {
        id: true,
        title: true,
        stepName: true,
        status: true,
        projectId: true,
        createdAt: true
      }
    });
    
    console.log(`\n🚨 Found ${alerts.length} workflow alerts in database:`);
    alerts.forEach(alert => {
      console.log(`  - Alert: ${alert.title} (${alert.stepName}) - Project: ${alert.projectId} - Status: ${alert.status}`);
    });
    
    // Check project workflows
    const workflows = await prisma.projectWorkflow.findMany({
      select: {
        id: true,
        projectId: true,
        status: true,
        currentStepIndex: true,
        steps: {
          select: {
            stepName: true,
            isCompleted: true
          }
        }
      }
    });
    
    console.log(`\n📋 Found ${workflows.length} project workflows:`);
    workflows.forEach(wf => {
      const activeStep = wf.steps.find(step => !step.isCompleted);
      console.log(`  - Workflow for Project ${wf.projectId}: Status ${wf.status}, Current Step: ${activeStep?.stepName || 'All completed'}`);
    });
    
    // Check project workflow trackers
    const trackers = await prisma.projectWorkflowTracker.findMany({
      select: {
        id: true,
        projectId: true,
        currentPhase: true,
        currentSection: true,
        currentLineItemId: true
      }
    });
    
    console.log(`\n🎯 Found ${trackers.length} project workflow trackers:`);
    trackers.forEach(tracker => {
      console.log(`  - Tracker for Project ${tracker.projectId}: Phase ${tracker.currentPhase}, Section: ${tracker.currentSection}, Line Item ID: ${tracker.currentLineItemId}`);
    });
    
  } catch (error) {
    console.error('❌ Error debugging alerts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAlerts();