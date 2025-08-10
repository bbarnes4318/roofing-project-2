require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateWorkflowSections() {
  const timestamp = new Date();
  const results = {
    newSections: [],
    updatedSections: [],
    errors: []
  };

  try {
    console.log('Starting workflow_sections update process...\n');

    // 1. NEW SECTIONS TO ADD
    const newSections = [
      {
        sectionNumber: "7",
        sectionName: "Paint",
        displayName: "Paint",
        displayOrder: 12,
        description: "",
        isActive: true,
        phaseId: "cmdz32ing0033umpc4ixpym7z" // APPROVED phase
      },
      {
        sectionNumber: "3",
        sectionName: "Update Daily Photos",
        displayName: "Update Daily Photos",
        displayOrder: 4,
        description: "",
        isActive: true,
        phaseId: "cmdz32jzp004aumpcxxcspp8d" // EXECUTION phase
      },
      {
        sectionNumber: "1",
        sectionName: "Create Supplement in Xactimate",
        displayName: "Create Supplement in Xactimate",
        displayOrder: 0,
        description: "",
        isActive: true,
        phaseId: "cme1pk1r90000umz4tmheyw7g" // SECOND_SUPPLEMENT phase
      },
      {
        sectionNumber: "2",
        sectionName: "Call on Supp Submission: 2x Weekly Until New Estimate",
        displayName: "Call on Supp Submission: 2x Weekly Until New Estimate",
        displayOrder: 2,
        description: "",
        isActive: true,
        phaseId: "cme1pk1r90000umz4tmheyw7g" // SECOND_SUPPLEMENT phase
      },
      {
        sectionNumber: "3",
        sectionName: "Review Approved Items in Supp after receiving",
        displayName: "Review Approved Items in Supp after receiving",
        displayOrder: 4,
        description: "",
        isActive: true,
        phaseId: "cme1pk1r90000umz4tmheyw7g" // SECOND_SUPPLEMENT phase
      },
      {
        sectionNumber: "4",
        sectionName: "Update Customer",
        displayName: "Update Customer",
        displayOrder: 6,
        description: "",
        isActive: true,
        phaseId: "cme1pk1r90000umz4tmheyw7g" // SECOND_SUPPLEMENT phase
      },
      {
        sectionNumber: "1",
        sectionName: "Final Inspection",
        displayName: "Final Inspection",
        displayOrder: 0,
        description: "",
        isActive: true,
        phaseId: "cmdz32qpc006eumpc31hcjco7" // COMPLETION phase
      },
      {
        sectionNumber: "3",
        sectionName: "AR Follow-Up",
        displayName: "AR Follow-Up",
        displayOrder: 4,
        description: "",
        isActive: true,
        phaseId: "cmdz32qpc006eumpc31hcjco7" // COMPLETION phase
      }
    ];

    // Add new sections
    console.log('Adding new sections...');
    for (const section of newSections) {
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
          phaseId: created.phaseId,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt
        });
        console.log(`✓ Added: ${created.sectionName}`);
      } catch (error) {
        console.error(`✗ Error adding ${section.sectionName}:`, error.message);
        results.errors.push(`Failed to add ${section.sectionName}: ${error.message}`);
      }
    }

    // 2. UPDATE EXISTING SECTIONS
    const sectionsToUpdate = [
      {
        id: "cmdz32iww003jumpcasign2v2",
        sectionName: "Prepare for Production-Ensure all pictures in job (if roof work)",
        displayName: "Prepare for Production-Ensure all pictures in job (if roof work)"
      },
      {
        id: "cmdz32iz8003numpcbu6b1e6w",
        sectionName: "Prepare for Production-Verify Labor Order in Scheduler",
        displayName: "Prepare for Production-Verify Labor Order in Scheduler"
      },
      {
        id: "cmdz32j3x003vumpcb69d3gsi",
        sectionName: "Verify Material Orders-Confirm supplier orders",
        displayName: "Verify Material Orders-Confirm supplier orders"
      }
    ];

    console.log('\nUpdating existing sections...');
    for (const section of sectionsToUpdate) {
      try {
        const updated = await prisma.workflowSection.update({
          where: { id: section.id },
          data: {
            sectionName: section.sectionName,
            displayName: section.displayName,
            updatedAt: timestamp
          }
        });
        results.updatedSections.push({
          id: updated.id,
          sectionName: updated.sectionName,
          updatedAt: updated.updatedAt
        });
        console.log(`✓ Updated: ${updated.sectionName}`);
      } catch (error) {
        console.error(`✗ Error updating ${section.sectionName}:`, error.message);
        results.errors.push(`Failed to update ${section.sectionName}: ${error.message}`);
      }
    }

    // 3. GENERATE SUMMARY REPORT
    console.log('\n========================================');
    console.log('WORKFLOW SECTIONS UPDATE SUMMARY');
    console.log('========================================\n');
    
    console.log(`NEW SECTIONS ADDED: ${results.newSections.length}`);
    console.log('-------------------');
    results.newSections.forEach(section => {
      console.log(`• ${section.sectionName}`);
      console.log(`  ID: ${section.id}`);
      console.log(`  Created: ${section.createdAt.toISOString()}`);
      console.log(`  Phase ID: ${section.phaseId}\n`);
    });

    console.log(`SECTIONS UPDATED: ${results.updatedSections.length}`);
    console.log('-----------------');
    results.updatedSections.forEach(section => {
      console.log(`• ${section.sectionName}`);
      console.log(`  ID: ${section.id}`);
      console.log(`  Updated: ${section.updatedAt.toISOString()}\n`);
    });

    if (results.errors.length > 0) {
      console.log(`ERRORS: ${results.errors.length}`);
      console.log('-------');
      results.errors.forEach(error => {
        console.log(`• ${error}`);
      });
    }

    console.log('\n========================================');
    console.log('Update process completed successfully!');
    console.log('========================================');

    // Verify the updates
    console.log('\nVerifying database integrity...');
    const totalSections = await prisma.workflowSection.count();
    console.log(`Total workflow sections in database: ${totalSections}`);

  } catch (error) {
    console.error('Critical error during update process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateWorkflowSections();