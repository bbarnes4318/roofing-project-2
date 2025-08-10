require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyWorkflowSections() {
  try {
    console.log('WORKFLOW SECTIONS UPDATE VERIFICATION');
    console.log('=====================================\n');

    // Get all workflow sections with their phase information
    const allSections = await prisma.workflowSection.findMany({
      include: {
        phase: true
      },
      orderBy: [
        { phase: { phaseType: 'asc' } },
        { sectionNumber: 'asc' }
      ]
    });

    const phaseGroups = {};
    allSections.forEach(section => {
      const phaseType = section.phase.phaseType;
      if (!phaseGroups[phaseType]) {
        phaseGroups[phaseType] = [];
      }
      phaseGroups[phaseType].push(section);
    });

    // Show sections by phase
    Object.keys(phaseGroups).forEach(phaseType => {
      console.log(`${phaseType} PHASE:`);
      console.log('-'.repeat(phaseType.length + 7));
      phaseGroups[phaseType].forEach(section => {
        console.log(`  ${section.sectionNumber}. ${section.sectionName}`);
        console.log(`     ID: ${section.id}`);
        console.log(`     Display Order: ${section.displayOrder}`);
        console.log(`     Updated: ${section.updatedAt.toISOString()}`);
      });
      console.log('');
    });

    // Show newly added sections from our updates
    const newlyAddedSections = [
      'Paint',
      'Update Daily Photos',
      'Create Supplement in Xactimate',
      'Call on Supp Submission: 2x Weekly Until New Estimate',
      'Review Approved Items in Supp after receiving',
      'Update Customer',
      'Final Inspection',
      'AR Follow-Up'
    ];

    console.log('NEWLY ADDED SECTIONS VERIFICATION:');
    console.log('===================================');
    
    let foundCount = 0;
    for (const sectionName of newlyAddedSections) {
      const found = allSections.find(s => s.sectionName === sectionName);
      if (found) {
        foundCount++;
        console.log(`✓ ${sectionName}`);
        console.log(`  ID: ${found.id}`);
        console.log(`  Phase: ${found.phase.phaseType}`);
        console.log(`  Section #: ${found.sectionNumber}`);
        console.log(`  Created: ${found.createdAt.toISOString()}\n`);
      } else {
        console.log(`✗ ${sectionName} - NOT FOUND\n`);
      }
    }

    console.log(`SUMMARY: ${foundCount}/${newlyAddedSections.length} new sections successfully added`);
    console.log(`Total sections in database: ${allSections.length}`);

  } catch (error) {
    console.error('Error verifying workflow sections:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyWorkflowSections();