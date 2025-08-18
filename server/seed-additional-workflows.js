const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedAdditionalWorkflows() {
  console.log('🌱 Starting to seed additional workflows (Gutters and Interior Paint)...');

  try {
    // Seed Gutter Workflow
    console.log('Creating Gutter workflow...');
    
    const gutterPhases = [
      {
        phaseType: 'LEAD',
        workflowType: 'GUTTERS',
        phaseName: 'Lead Phase - Gutters',
        displayOrder: 1,
        description: 'Initial customer contact and information gathering for gutter project',
        sections: [
          {
            sectionNumber: '1',
            sectionName: 'Customer Information',
            displayName: 'Customer Information',
            displayOrder: 1,
            lineItems: [
              { itemLetter: 'A', itemName: 'Input Customer Information', responsibleRole: 'OFFICE_STAFF', displayOrder: 1, description: 'Make sure the name is spelled correctly' },
              { itemLetter: 'B', itemName: 'Complete Questions to Ask Checklist', responsibleRole: 'OFFICE_STAFF', displayOrder: 2, description: 'Input answers from the Question Checklist into notes' },
              { itemLetter: 'C', itemName: 'Input Lead Supporting Property Information', responsibleRole: 'OFFICE_STAFF', displayOrder: 3, description: 'Add Home View and Street View photos from Maps' },
              { itemLetter: 'D', itemName: 'Assign A Project Manager', responsibleRole: 'OFFICE_STAFF', displayOrder: 4, description: 'Select and brief the Project Manager' },
              { itemLetter: 'E', itemName: 'Schedule Initial Inspection', responsibleRole: 'OFFICE_STAFF', displayOrder: 5, description: 'Call the Customer and arrange based on the PM schedule' }
            ]
          }
        ]
      },
      {
        phaseType: 'PROSPECT',
        workflowType: 'GUTTERS',
        phaseName: 'Prospect Phase - Gutters',
        displayOrder: 2,
        description: 'Site inspection and estimate preparation for gutter project',
        sections: [
          {
            sectionNumber: '2',
            sectionName: 'Inspection & Estimate',
            displayName: 'Inspection & Estimate',
            displayOrder: 1,
            lineItems: [
              { itemLetter: 'A', itemName: 'Site Inspection', responsibleRole: 'PROJECT_MANAGER', displayOrder: 1, description: 'Take site photos, complete inspection form, document linear footage' },
              { itemLetter: 'B', itemName: 'Write Estimate', responsibleRole: 'PROJECT_MANAGER', displayOrder: 2, description: 'Fill out Estimate Form with all measurements and material choices' },
              { itemLetter: 'C', itemName: 'Agreement Signing', responsibleRole: 'ADMINISTRATION', displayOrder: 3, description: 'Review agreement with customer and send signature request' }
            ]
          }
        ]
      },
      {
        phaseType: 'APPROVED',
        workflowType: 'GUTTERS',
        phaseName: 'Approved Phase - Gutters',
        displayOrder: 3,
        description: 'Administrative setup and preparation for gutter installation',
        sections: [
          {
            sectionNumber: '3',
            sectionName: 'Pre-Production',
            displayName: 'Pre-Production Setup',
            displayOrder: 1,
            lineItems: [
              { itemLetter: 'A', itemName: 'Administrative Setup', responsibleRole: 'ADMINISTRATION', displayOrder: 1, description: 'Order materials (gutters, downspouts, hangers, sealant)' },
              { itemLetter: 'B', itemName: 'Pre-Job Actions', responsibleRole: 'OFFICE_STAFF', displayOrder: 2, description: 'Pull necessary permits if required' },
              { itemLetter: 'C', itemName: 'Prepare for Production', responsibleRole: 'ADMINISTRATION', displayOrder: 3, description: 'Verify labor order in scheduler' },
              { itemLetter: 'D', itemName: 'Verify Material Orders', responsibleRole: 'ADMINISTRATION', displayOrder: 4, description: 'Confirm order from each supplier' }
            ]
          }
        ]
      },
      {
        phaseType: 'EXECUTION',
        workflowType: 'GUTTERS',
        phaseName: 'Execution Phase - Gutters',
        displayOrder: 4,
        description: 'Gutter installation and quality control',
        sections: [
          {
            sectionNumber: '4',
            sectionName: 'Installation',
            displayName: 'Gutter Installation',
            displayOrder: 1,
            lineItems: [
              { itemLetter: 'A', itemName: 'Installation Process', responsibleRole: 'FIELD_DIRECTOR', displayOrder: 1, description: 'Document work start, capture progress photos' },
              { itemLetter: 'B', itemName: 'Quality Check', responsibleRole: 'FIELD_DIRECTOR', displayOrder: 2, description: 'Complete final inspection checking for proper slope and secure attachment' },
              { itemLetter: 'C', itemName: 'Update Customer', responsibleRole: 'ADMINISTRATION', displayOrder: 3, description: 'Let customer know work is finished, send photos' }
            ]
          }
        ]
      },
      {
        phaseType: 'COMPLETION',
        workflowType: 'GUTTERS',
        phaseName: 'Completion Phase - Gutters',
        displayOrder: 5,
        description: 'Final inspection and project closeout for gutter installation',
        sections: [
          {
            sectionNumber: '5',
            sectionName: 'Project Closeout',
            displayName: 'Project Closeout',
            displayOrder: 1,
            lineItems: [
              { itemLetter: 'A', itemName: 'Final Inspection', responsibleRole: 'OFFICE_STAFF', displayOrder: 1, description: 'Schedule permit inspection if applicable' },
              { itemLetter: 'B', itemName: 'Financial Processing', responsibleRole: 'ADMINISTRATION', displayOrder: 2, description: 'Verify financial worksheet, send final invoice' },
              { itemLetter: 'C', itemName: 'AR Follow Up', responsibleRole: 'ADMINISTRATION', displayOrder: 3, description: 'Follow up on outstanding payments' },
              { itemLetter: 'D', itemName: 'Project Closeout', responsibleRole: 'OFFICE_STAFF', displayOrder: 4, description: 'Register warranties, send documentation to customer' }
            ]
          }
        ]
      }
    ];

    // Seed Interior Paint Workflow
    console.log('Creating Interior Paint workflow...');
    
    const paintPhases = [
      {
        phaseType: 'LEAD',
        workflowType: 'INTERIOR_PAINT',
        phaseName: 'Lead Phase - Interior Paint',
        displayOrder: 1,
        description: 'Initial customer contact and consultation scheduling for interior paint project',
        sections: [
          {
            sectionNumber: '1',
            sectionName: 'Customer Information',
            displayName: 'Customer Information',
            displayOrder: 1,
            lineItems: [
              { itemLetter: 'A', itemName: 'Input Customer Information', responsibleRole: 'OFFICE_STAFF', displayOrder: 1, description: 'Make sure the name is spelled correctly and email is correct' },
              { itemLetter: 'B', itemName: 'Complete Questions to Ask Checklist', responsibleRole: 'OFFICE_STAFF', displayOrder: 2, description: 'Input answers including rooms to be painted, ceilings and trim' },
              { itemLetter: 'C', itemName: 'Assign A Project Manager', responsibleRole: 'OFFICE_STAFF', displayOrder: 3, description: 'Select and brief the Project Manager' },
              { itemLetter: 'D', itemName: 'Schedule Initial Consultation', responsibleRole: 'OFFICE_STAFF', displayOrder: 4, description: 'Call the Customer and arrange based on the PM schedule' }
            ]
          }
        ]
      },
      {
        phaseType: 'PROSPECT',
        workflowType: 'INTERIOR_PAINT',
        phaseName: 'Prospect Phase - Interior Paint',
        displayOrder: 2,
        description: 'Site visit, consultation and estimate for interior paint project',
        sections: [
          {
            sectionNumber: '2',
            sectionName: 'Consultation & Estimate',
            displayName: 'Consultation & Estimate',
            displayOrder: 1,
            lineItems: [
              { itemLetter: 'A', itemName: 'Site Visit & Consultation', responsibleRole: 'PROJECT_MANAGER', displayOrder: 1, description: 'Take photos, measure square footage, discuss colors and sheens' },
              { itemLetter: 'B', itemName: 'Write Estimate', responsibleRole: 'PROJECT_MANAGER', displayOrder: 2, description: 'Fill out Estimate Form with detailed scope of work' },
              { itemLetter: 'C', itemName: 'Agreement Signing', responsibleRole: 'ADMINISTRATION', displayOrder: 3, description: 'Review agreement with customer and send for signature' }
            ]
          }
        ]
      },
      {
        phaseType: 'APPROVED',
        workflowType: 'INTERIOR_PAINT',
        phaseName: 'Approved Phase - Interior Paint',
        displayOrder: 3,
        description: 'Administrative setup and preparation for interior painting',
        sections: [
          {
            sectionNumber: '3',
            sectionName: 'Pre-Production',
            displayName: 'Pre-Production Setup',
            displayOrder: 1,
            lineItems: [
              { itemLetter: 'A', itemName: 'Administrative Setup', responsibleRole: 'ADMINISTRATION', displayOrder: 1, description: 'Order paint and necessary supplies' },
              { itemLetter: 'B', itemName: 'Pre-Job Actions', responsibleRole: 'OFFICE_STAFF', displayOrder: 2, description: 'Communicate with customer to confirm start date' },
              { itemLetter: 'C', itemName: 'Prepare for Production', responsibleRole: 'ADMINISTRATION', displayOrder: 3, description: 'Verify labor order, confirm paint colors and sheens' },
              { itemLetter: 'D', itemName: 'Verify Material Orders', responsibleRole: 'ADMINISTRATION', displayOrder: 4, description: 'Confirm paint and supplies ordered or allocated from stock' }
            ]
          }
        ]
      },
      {
        phaseType: 'EXECUTION',
        workflowType: 'INTERIOR_PAINT',
        phaseName: 'Execution Phase - Interior Paint',
        displayOrder: 4,
        description: 'Interior painting process and quality control',
        sections: [
          {
            sectionNumber: '4',
            sectionName: 'Painting Process',
            displayName: 'Painting Process',
            displayOrder: 1,
            lineItems: [
              { itemLetter: 'A', itemName: 'Painting Process', responsibleRole: 'FIELD_DIRECTOR', displayOrder: 1, description: 'Document work start, oversee prep and painting' },
              { itemLetter: 'B', itemName: 'Quality Check', responsibleRole: 'FIELD_DIRECTOR', displayOrder: 2, description: 'Conduct final walkthrough checking coverage and clean lines' },
              { itemLetter: 'C', itemName: 'Update Customer', responsibleRole: 'ADMINISTRATION', displayOrder: 3, description: 'Inform customer painting is complete, send photos' }
            ]
          }
        ]
      },
      {
        phaseType: 'COMPLETION',
        workflowType: 'INTERIOR_PAINT',
        phaseName: 'Completion Phase - Interior Paint',
        displayOrder: 5,
        description: 'Final processing and project closeout for interior paint',
        sections: [
          {
            sectionNumber: '5',
            sectionName: 'Project Closeout',
            displayName: 'Project Closeout',
            displayOrder: 1,
            lineItems: [
              { itemLetter: 'A', itemName: 'Financial Processing', responsibleRole: 'ADMINISTRATION', displayOrder: 1, description: 'Verify final project costs, send invoice' },
              { itemLetter: 'B', itemName: 'AR Follow Up', responsibleRole: 'ADMINISTRATION', displayOrder: 2, description: 'Follow up on final payment' },
              { itemLetter: 'C', itemName: 'Project Closeout', responsibleRole: 'OFFICE_STAFF', displayOrder: 3, description: 'Provide info on leftover paint, send receipt, close job' }
            ]
          }
        ]
      }
    ];

    // Create Gutter workflow phases, sections, and line items
    for (const phaseData of gutterPhases) {
      const { sections, ...phaseInfo } = phaseData;
      
      const phase = await prisma.workflowPhase.create({
        data: phaseInfo
      });
      
      console.log(`  ✓ Created phase: ${phase.phaseName}`);
      
      for (const sectionData of sections) {
        const { lineItems, ...sectionInfo } = sectionData;
        
        const section = await prisma.workflowSection.create({
          data: {
            ...sectionInfo,
            phaseId: phase.id,
            workflowType: 'GUTTERS'
          }
        });
        
        console.log(`    ✓ Created section: ${section.displayName}`);
        
        for (const lineItemData of lineItems) {
          await prisma.workflowLineItem.create({
            data: {
              ...lineItemData,
              sectionId: section.id,
              workflowType: 'GUTTERS'
            }
          });
        }
        console.log(`      ✓ Created ${lineItems.length} line items`);
      }
    }

    // Create Interior Paint workflow phases, sections, and line items
    for (const phaseData of paintPhases) {
      const { sections, ...phaseInfo } = phaseData;
      
      const phase = await prisma.workflowPhase.create({
        data: phaseInfo
      });
      
      console.log(`  ✓ Created phase: ${phase.phaseName}`);
      
      for (const sectionData of sections) {
        const { lineItems, ...sectionInfo } = sectionData;
        
        const section = await prisma.workflowSection.create({
          data: {
            ...sectionInfo,
            phaseId: phase.id,
            workflowType: 'INTERIOR_PAINT'
          }
        });
        
        console.log(`    ✓ Created section: ${section.displayName}`);
        
        for (const lineItemData of lineItems) {
          await prisma.workflowLineItem.create({
            data: {
              ...lineItemData,
              sectionId: section.id,
              workflowType: 'INTERIOR_PAINT'
            }
          });
        }
        console.log(`      ✓ Created ${lineItems.length} line items`);
      }
    }

    console.log('✅ Successfully seeded Gutter and Interior Paint workflows!');
    
  } catch (error) {
    console.error('❌ Error seeding additional workflows:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the seed function
seedAdditionalWorkflows()
  .catch((error) => {
    console.error('Failed to seed additional workflows:', error);
    process.exit(1);
  });