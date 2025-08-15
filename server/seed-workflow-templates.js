/**
 * Seed Workflow Template Data
 * Creates the normalized workflow structure: phases → sections → line items
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const workflowData = {
  phases: [
    { phaseType: 'LEAD', phaseName: 'Lead', displayOrder: 1 },
    { phaseType: 'PROSPECT', phaseName: 'Prospect', displayOrder: 2 },
    { phaseType: 'APPROVED', phaseName: 'Approved', displayOrder: 3 },
    { phaseType: 'EXECUTION', phaseName: 'Execution', displayOrder: 4 },
    { phaseType: 'SECOND_SUPPLEMENT', phaseName: 'Second Supplement', displayOrder: 5 },
    { phaseType: 'COMPLETION', phaseName: 'Completion', displayOrder: 6 }
  ],
  sections: {
    LEAD: [
      { sectionNumber: '1', sectionName: 'Input Customer Information', displayName: 'Input Customer Information', displayOrder: 1 },
      { sectionNumber: '2', sectionName: 'Complete Questions Checklist', displayName: 'Complete Questions Checklist', displayOrder: 2 },
      { sectionNumber: '3', sectionName: 'Initial Inspection', displayName: 'Initial Inspection', displayOrder: 3 }
    ],
    PROSPECT: [
      { sectionNumber: '4', sectionName: 'Estimate Creation', displayName: 'Estimate Creation', displayOrder: 1 },
      { sectionNumber: '5', sectionName: 'Customer Communication', displayName: 'Customer Communication', displayOrder: 2 }
    ],
    APPROVED: [
      { sectionNumber: '6', sectionName: 'Contract & Permitting', displayName: 'Contract & Permitting', displayOrder: 1 },
      { sectionNumber: '7', sectionName: 'Material Ordering', displayName: 'Material Ordering', displayOrder: 2 },
      { sectionNumber: '8', sectionName: 'Scheduling', displayName: 'Scheduling', displayOrder: 3 }
    ],
    EXECUTION: [
      { sectionNumber: '9', sectionName: 'Job Preparation', displayName: 'Job Preparation', displayOrder: 1 },
      { sectionNumber: '10', sectionName: 'Active Work', displayName: 'Active Work', displayOrder: 2 },
      { sectionNumber: '11', sectionName: 'Quality Control', displayName: 'Quality Control', displayOrder: 3 }
    ],
    SECOND_SUPPLEMENT: [
      { sectionNumber: '12', sectionName: 'Final Inspection', displayName: 'Final Inspection', displayOrder: 1 },
      { sectionNumber: '13', sectionName: 'Invoicing', displayName: 'Invoicing', displayOrder: 2 }
    ],
    COMPLETION: [
      { sectionNumber: '14', sectionName: 'Warranty & Documentation', displayName: 'Warranty & Documentation', displayOrder: 1 },
      { sectionNumber: '15', sectionName: 'Customer Feedback', displayName: 'Customer Feedback', displayOrder: 2 }
    ]
  },
  lineItems: {
    '1': [ // Input Customer Information
      { itemLetter: 'A', itemName: 'Confirm name spelled correctly', displayOrder: 1, responsibleRole: 'OFFICE' },
      { itemLetter: 'B', itemName: 'Verify phone number', displayOrder: 2, responsibleRole: 'OFFICE' },
      { itemLetter: 'C', itemName: 'Confirm email address', displayOrder: 3, responsibleRole: 'OFFICE' },
      { itemLetter: 'D', itemName: 'Verify property address', displayOrder: 4, responsibleRole: 'OFFICE' }
    ],
    '2': [ // Complete Questions Checklist
      { itemLetter: 'A', itemName: 'Insurance claim status', displayOrder: 1, responsibleRole: 'OFFICE' },
      { itemLetter: 'B', itemName: 'Property accessibility', displayOrder: 2, responsibleRole: 'OFFICE' },
      { itemLetter: 'C', itemName: 'Preferred timeline', displayOrder: 3, responsibleRole: 'OFFICE' }
    ],
    '3': [ // Initial Inspection
      { itemLetter: 'A', itemName: 'Schedule inspection', displayOrder: 1, responsibleRole: 'PROJECT_MANAGER' },
      { itemLetter: 'B', itemName: 'Conduct site visit', displayOrder: 2, responsibleRole: 'PROJECT_MANAGER' },
      { itemLetter: 'C', itemName: 'Document material colors', displayOrder: 3, responsibleRole: 'PROJECT_MANAGER' },
      { itemLetter: 'D', itemName: 'Take measurements', displayOrder: 4, responsibleRole: 'PROJECT_MANAGER' },
      { itemLetter: 'E', itemName: 'Photo documentation', displayOrder: 5, responsibleRole: 'PROJECT_MANAGER' }
    ],
    '4': [ // Estimate Creation
      { itemLetter: 'A', itemName: 'Calculate material costs', displayOrder: 1, responsibleRole: 'ADMINISTRATION' },
      { itemLetter: 'B', itemName: 'Calculate labor costs', displayOrder: 2, responsibleRole: 'ADMINISTRATION' },
      { itemLetter: 'C', itemName: 'Apply markup', displayOrder: 3, responsibleRole: 'ADMINISTRATION' },
      { itemLetter: 'D', itemName: 'Generate estimate document', displayOrder: 4, responsibleRole: 'ADMINISTRATION' }
    ],
    '5': [ // Customer Communication
      { itemLetter: 'A', itemName: 'Send estimate to customer', displayOrder: 1, responsibleRole: 'OFFICE' },
      { itemLetter: 'B', itemName: 'Follow up on estimate', displayOrder: 2, responsibleRole: 'OFFICE' },
      { itemLetter: 'C', itemName: 'Address customer questions', displayOrder: 3, responsibleRole: 'PROJECT_MANAGER' }
    ],
    '6': [ // Contract & Permitting
      { itemLetter: 'A', itemName: 'Prepare contract', displayOrder: 1, responsibleRole: 'ADMINISTRATION' },
      { itemLetter: 'B', itemName: 'Get contract signed', displayOrder: 2, responsibleRole: 'PROJECT_MANAGER' },
      { itemLetter: 'C', itemName: 'Apply for permits', displayOrder: 3, responsibleRole: 'ADMINISTRATION' },
      { itemLetter: 'D', itemName: 'Receive permits', displayOrder: 4, responsibleRole: 'ADMINISTRATION' }
    ],
    '7': [ // Material Ordering
      { itemLetter: 'A', itemName: 'Create material list', displayOrder: 1, responsibleRole: 'PROJECT_MANAGER' },
      { itemLetter: 'B', itemName: 'Place material order', displayOrder: 2, responsibleRole: 'ADMINISTRATION' },
      { itemLetter: 'C', itemName: 'Schedule delivery', displayOrder: 3, responsibleRole: 'PROJECT_MANAGER' }
    ],
    '8': [ // Scheduling
      { itemLetter: 'A', itemName: 'Assign crew', displayOrder: 1, responsibleRole: 'FIELD_DIRECTOR' },
      { itemLetter: 'B', itemName: 'Set start date', displayOrder: 2, responsibleRole: 'PROJECT_MANAGER' },
      { itemLetter: 'C', itemName: 'Notify customer of schedule', displayOrder: 3, responsibleRole: 'OFFICE' }
    ],
    '9': [ // Job Preparation
      { itemLetter: 'A', itemName: 'Confirm material delivery', displayOrder: 1, responsibleRole: 'FIELD_DIRECTOR' },
      { itemLetter: 'B', itemName: 'Stage equipment', displayOrder: 2, responsibleRole: 'FIELD_DIRECTOR' },
      { itemLetter: 'C', itemName: 'Safety briefing', displayOrder: 3, responsibleRole: 'FIELD_DIRECTOR' }
    ],
    '10': [ // Active Work
      { itemLetter: 'A', itemName: 'Remove old roofing', displayOrder: 1, responsibleRole: 'FIELD_DIRECTOR' },
      { itemLetter: 'B', itemName: 'Install underlayment', displayOrder: 2, responsibleRole: 'FIELD_DIRECTOR' },
      { itemLetter: 'C', itemName: 'Install new roofing', displayOrder: 3, responsibleRole: 'FIELD_DIRECTOR' },
      { itemLetter: 'D', itemName: 'Install flashing', displayOrder: 4, responsibleRole: 'FIELD_DIRECTOR' },
      { itemLetter: 'E', itemName: 'Clean up job site', displayOrder: 5, responsibleRole: 'FIELD_DIRECTOR' }
    ],
    '11': [ // Quality Control
      { itemLetter: 'A', itemName: 'Inspect completed work', displayOrder: 1, responsibleRole: 'PROJECT_MANAGER' },
      { itemLetter: 'B', itemName: 'Address punch list items', displayOrder: 2, responsibleRole: 'FIELD_DIRECTOR' },
      { itemLetter: 'C', itemName: 'Final quality check', displayOrder: 3, responsibleRole: 'PROJECT_MANAGER' }
    ],
    '12': [ // Final Inspection
      { itemLetter: 'A', itemName: 'Schedule final inspection', displayOrder: 1, responsibleRole: 'ADMINISTRATION' },
      { itemLetter: 'B', itemName: 'Pass inspection', displayOrder: 2, responsibleRole: 'PROJECT_MANAGER' },
      { itemLetter: 'C', itemName: 'Document completion', displayOrder: 3, responsibleRole: 'PROJECT_MANAGER' }
    ],
    '13': [ // Invoicing
      { itemLetter: 'A', itemName: 'Generate final invoice', displayOrder: 1, responsibleRole: 'ADMINISTRATION' },
      { itemLetter: 'B', itemName: 'Send invoice to customer', displayOrder: 2, responsibleRole: 'OFFICE' },
      { itemLetter: 'C', itemName: 'Process payment', displayOrder: 3, responsibleRole: 'ADMINISTRATION' }
    ],
    '14': [ // Warranty & Documentation
      { itemLetter: 'A', itemName: 'Issue warranty certificate', displayOrder: 1, responsibleRole: 'ADMINISTRATION' },
      { itemLetter: 'B', itemName: 'File project documentation', displayOrder: 2, responsibleRole: 'OFFICE' },
      { itemLetter: 'C', itemName: 'Update customer database', displayOrder: 3, responsibleRole: 'OFFICE' }
    ],
    '15': [ // Customer Feedback
      { itemLetter: 'A', itemName: 'Send satisfaction survey', displayOrder: 1, responsibleRole: 'OFFICE' },
      { itemLetter: 'B', itemName: 'Request online review', displayOrder: 2, responsibleRole: 'OFFICE' },
      { itemLetter: 'C', itemName: 'Close project file', displayOrder: 3, responsibleRole: 'ADMINISTRATION' }
    ]
  }
};

async function seedWorkflowTemplates() {
  console.log('🌱 Seeding workflow template data...');
  
  try {
    // Clear existing workflow template data
    await prisma.completedWorkflowItem.deleteMany({});
    await prisma.projectWorkflowTracker.deleteMany({});
    await prisma.workflowLineItem.deleteMany({});
    await prisma.workflowSection.deleteMany({});
    await prisma.workflowPhase.deleteMany({});
    
    console.log('✅ Cleared existing workflow template data');
    
    // Create phases
    for (const phaseData of workflowData.phases) {
      const phase = await prisma.workflowPhase.create({
        data: {
          phaseType: phaseData.phaseType,
          phaseName: phaseData.phaseName,
          displayOrder: phaseData.displayOrder,
          isActive: true,
          isCurrent: true
        }
      });
      
      console.log(`  ✅ Created phase: ${phase.phaseName}`);
      
      // Create sections for this phase
      const phaseSections = workflowData.sections[phaseData.phaseType] || [];
      for (const sectionData of phaseSections) {
        const section = await prisma.workflowSection.create({
          data: {
            phaseId: phase.id,
            sectionNumber: sectionData.sectionNumber,
            sectionName: sectionData.sectionName,
            displayName: sectionData.displayName,
            displayOrder: sectionData.displayOrder,
            isActive: true,
            isCurrent: true
          }
        });
        
        console.log(`    ✅ Created section: ${section.displayName}`);
        
        // Create line items for this section
        const sectionLineItems = workflowData.lineItems[sectionData.sectionNumber] || [];
        for (const itemData of sectionLineItems) {
          await prisma.workflowLineItem.create({
            data: {
              sectionId: section.id,
              itemLetter: itemData.itemLetter,
              itemName: itemData.itemName,
              displayOrder: itemData.displayOrder,
              responsibleRole: itemData.responsibleRole,
              estimatedMinutes: 30,
              alertDays: 1,
              isActive: true,
              isCurrent: true
            }
          });
        }
        
        console.log(`      ✅ Created ${sectionLineItems.length} line items`);
      }
    }
    
    // Verify the structure
    const phaseCount = await prisma.workflowPhase.count();
    const sectionCount = await prisma.workflowSection.count();
    const lineItemCount = await prisma.workflowLineItem.count();
    
    console.log('\n📊 Workflow Template Summary:');
    console.log(`  • ${phaseCount} phases`);
    console.log(`  • ${sectionCount} sections`);
    console.log(`  • ${lineItemCount} line items`);
    
    console.log('\n✨ Workflow template seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding workflow templates:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  seedWorkflowTemplates()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = seedWorkflowTemplates;