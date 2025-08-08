const { prisma } = require('./config/prisma');
const AlertGenerationService = require('./services/AlertGenerationService');

async function testGenerateAlerts() {
  try {
    console.log('🔍 TESTING ALERT GENERATION...');
    
    // Get projects that should have alerts
    const projects = await prisma.project.findMany({
      where: {
        status: { in: ['PENDING','IN_PROGRESS'] }
      },
      select: { id: true, projectNumber: true, projectName: true, status: true }
    });
    
    console.log(`📊 Found ${projects.length} projects that should have alerts:`);
    projects.forEach(p => {
      console.log(`  - ID: ${p.id}, #${p.projectNumber}, Name: ${p.projectName}, Status: ${p.status}`);
    });
    
    if (projects.length === 0) {
      console.log('❌ No projects found with PENDING/IN_PROGRESS status');
      return;
    }
    
    // Test batch alert generation
    const projectIds = projects.map(p => p.id);
    console.log(`\n🚀 Generating alerts for ${projectIds.length} projects...`);
    
    const alerts = await AlertGenerationService.generateBatchAlerts(projectIds);
    
    console.log(`\n✅ Generated ${alerts.length} alerts:`);
    alerts.forEach(alert => {
      console.log(`  - Alert: ${alert.title} (${alert.stepName}) - Project: ${alert.projectId}`);
    });
    
    // Check if alerts were actually saved to database
    const savedAlerts = await prisma.workflowAlert.findMany({
      select: {
        id: true,
        title: true,
        stepName: true,
        status: true,
        projectId: true,
        createdAt: true
      }
    });
    
    console.log(`\n📊 Alerts now in database: ${savedAlerts.length}`);
    savedAlerts.forEach(alert => {
      console.log(`  - DB Alert: ${alert.title} (${alert.stepName}) - Project: ${alert.projectId} - Status: ${alert.status}`);
    });
    
  } catch (error) {
    console.error('❌ Error testing alert generation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testGenerateAlerts();