/*
 * Debug script to check workflow data in the database
 */

const { prisma } = require('../config/prisma');

async function debugWorkflowData() {
  console.log('🔍 Checking workflow data in database...\n');

  // Check phases
  const phases = await prisma.workflowPhase.findMany({
    include: {
      sections: {
        include: {
          lineItems: true
        }
      }
    }
  });

  console.log(`📊 Found ${phases.length} workflow phases:`);
  phases.forEach(phase => {
    console.log(`  Phase: ${phase.phaseType} (ID: ${phase.id})`);
    console.log(`    Sections: ${phase.sections.length}`);
    phase.sections.forEach(section => {
      console.log(`      Section: ${section.sectionName} (ID: ${section.id})`);
      console.log(`        Line Items: ${section.lineItems.length}`);
      section.lineItems.forEach(item => {
        console.log(`          - ${item.itemName} (ID: ${item.id})`);
      });
    });
    console.log('');
  });

  // Check if there are any alerts or messages with wrong references
  const alerts = await prisma.workflowAlert.findMany({
    include: {
      phase: true,
      section: true,
      lineItem: true
    }
  });

  console.log(`📊 Found ${alerts.length} workflow alerts:`);
  alerts.forEach(alert => {
    console.log(`  Alert: ${alert.title}`);
    console.log(`    Phase: ${alert.phase?.phaseType || 'NULL'} (ID: ${alert.phaseId})`);
    console.log(`    Section: ${alert.section?.sectionName || 'NULL'} (ID: ${alert.sectionId})`);
    console.log(`    Line Item: ${alert.lineItem?.itemName || 'NULL'} (ID: ${alert.lineItemId})`);
    console.log('');
  });

  // Check messages
  const messages = await prisma.projectMessage.findMany({
    where: {
      isWorkflowMessage: true
    }
  });

  console.log(`📊 Found ${messages.length} workflow messages:`);
  messages.forEach(msg => {
    console.log(`  Message: ${msg.subject}`);
    console.log(`    Phase: ${msg.phase || 'NULL'}`);
    console.log(`    Section: ${msg.section || 'NULL'}`);
    console.log(`    Line Item: ${msg.lineItem || 'NULL'}`);
    console.log('');
  });

  // Check trackers
  const trackers = await prisma.projectWorkflowTracker.findMany({
    include: {
      currentPhase: true
    }
  });

  console.log(`📊 Found ${trackers.length} workflow trackers:`);
  trackers.forEach(tracker => {
    console.log(`  Tracker for Project: ${tracker.projectId}`);
    console.log(`    Current Phase: ${tracker.currentPhase?.phaseType || 'NULL'} (ID: ${tracker.currentPhaseId})`);
    console.log('');
  });
}

debugWorkflowData()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('Error during debug:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
