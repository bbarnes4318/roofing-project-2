require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixMissingSections() {
  const timestamp = new Date();
  const results = {
    newSections: [],
    errors: []
  };

  try {
    console.log('Fixing missing sections with correct section numbers...\n');

    // Check existing sections in EXECUTION phase to find available section numbers
    const executionPhaseId = "cmdz32jzp004aumpcxxcspp8d";
    const executionSections = await prisma.workflowSection.findMany({
      where: { phaseId: executionPhaseId },
      orderBy: { sectionNumber: 'asc' }
    });
    
    console.log('Existing sections in EXECUTION phase:');
    executionSections.forEach(section => {
      console.log(`- Section ${section.sectionNumber}: ${section.sectionName}`);
    });

    // Check existing sections in COMPLETION phase
    const completionPhaseId = "cmdz32qpc006eumpc31hcjco7";
    const completionSections = await prisma.workflowSection.findMany({
      where: { phaseId: completionPhaseId },
      orderBy: { sectionNumber: 'asc' }
    });
    
    console.log('\nExisting sections in COMPLETION phase:');
    completionSections.forEach(section => {
      console.log(`- Section ${section.sectionNumber}: ${section.sectionName}`);
    });

    // Add the missing sections with correct section numbers
    const missingSections = [
      {
        sectionNumber: "7", // This should be available in EXECUTION phase
        sectionName: "Update Daily Photos",
        displayName: "Update Daily Photos",
        displayOrder: 14, // Higher than existing ones
        description: "",
        isActive: true,
        phaseId: executionPhaseId
      },
      {
        sectionNumber: "5", // This should be available in COMPLETION phase
        sectionName: "Final Inspection",
        displayName: "Final Inspection",
        displayOrder: 8, // Higher than existing ones
        description: "",
        isActive: true,
        phaseId: completionPhaseId
      }
    ];

    console.log('\nAdding missing sections...');
    for (const section of missingSections) {
      try {
        const created = await prisma.workflowSection.create({
          data: {
            ...section,
            createdAt: timestamp,
            updatedAt: timestamp
          }
        });
        results.newSections.push({
          id: created.id,
          sectionName: created.sectionName,
          sectionNumber: created.sectionNumber,
          phaseId: created.phaseId,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt
        });
        console.log(`✓ Added: ${created.sectionName} (Section ${created.sectionNumber})`);
      } catch (error) {
        console.error(`✗ Error adding ${section.sectionName}:`, error.message);
        results.errors.push(`Failed to add ${section.sectionName}: ${error.message}`);
      }
    }

    // Generate final summary
    console.log('\n========================================');
    console.log('MISSING SECTIONS ADDED');
    console.log('========================================\n');
    
    results.newSections.forEach(section => {
      console.log(`• ${section.sectionName}`);
      console.log(`  ID: ${section.id}`);
      console.log(`  Section Number: ${section.sectionNumber}`);
      console.log(`  Created: ${section.createdAt.toISOString()}`);
      console.log(`  Phase ID: ${section.phaseId}\n`);
    });

    if (results.errors.length > 0) {
      console.log('REMAINING ERRORS:');
      results.errors.forEach(error => {
        console.log(`• ${error}`);
      });
    }

  } catch (error) {
    console.error('Error fixing missing sections:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixMissingSections();