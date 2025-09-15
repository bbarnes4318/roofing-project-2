#!/usr/bin/env node

const { prisma } = require('../config/prisma');

(async () => {
  try {
    const phaseCount = await prisma.workflowPhase.count();
    if (phaseCount > 0) {
      console.log(`Found ${phaseCount} existing workflow phases. Clearing and recreating...`);
      // Clear existing workflow data
      await prisma.workflowLineItem.deleteMany();
      await prisma.workflowSection.deleteMany();
      await prisma.workflowPhase.deleteMany();
      console.log('✅ Cleared existing workflow data');
    }

    // Complete workflow seed for ROOFING: All phases with sections and line items
    const phases = [
      { phaseName: 'Lead', phaseType: 'LEAD', displayOrder: 1 },
      { phaseName: 'Prospect', phaseType: 'PROSPECT', displayOrder: 2 },
      { phaseName: 'Approved', phaseType: 'APPROVED', displayOrder: 3 },
      { phaseName: 'Execution', phaseType: 'EXECUTION', displayOrder: 4 },
      { phaseName: 'Second Supplement', phaseType: 'SECOND_SUPPLEMENT', displayOrder: 5 },
      { phaseName: 'Completion', phaseType: 'COMPLETION', displayOrder: 6 }
    ];

    const createdPhases = [];
    for (const phaseData of phases) {
      const phase = await prisma.workflowPhase.create({
      data: {
          ...phaseData,
        is_active: true,
        isCurrent: true,
          workflowType: 'ROOFING',
          description: `${phaseData.phaseName} phase for roofing projects`
        }
      });
      createdPhases.push(phase);
      console.log(`✅ Created phase: ${phase.phaseName}`);
    }

    // Create sections for each phase using the actual workflow structure
    const sections = [
      { phase: 'LEAD', sectionNumber: '1', sectionName: 'Initial Contact', displayOrder: 1, lineItems: [
        { itemLetter: 'a', itemName: 'Answer phone call', displayOrder: 1, responsibleRole: 'OFFICE' },
        { itemLetter: 'b', itemName: 'Create Calendar Appointment in AL', displayOrder: 2, responsibleRole: 'OFFICE' }
      ]},
      { phase: 'PROSPECT', sectionNumber: '1', sectionName: 'Site Inspection – Project Manager 👷🏼', displayOrder: 1, lineItems: [
        { itemLetter: 'a', itemName: 'Take site photos', displayOrder: 1, responsibleRole: 'PROJECT_MANAGER' },
        { itemLetter: 'b', itemName: 'Complete inspection form', displayOrder: 2, responsibleRole: 'PROJECT_MANAGER' },
        { itemLetter: 'c', itemName: 'Document material colors', displayOrder: 3, responsibleRole: 'PROJECT_MANAGER' },
        { itemLetter: 'd', itemName: 'Capture Hover photos', displayOrder: 4, responsibleRole: 'PROJECT_MANAGER' },
        { itemLetter: 'e', itemName: 'Present upgrade options', displayOrder: 5, responsibleRole: 'PROJECT_MANAGER' }
      ]},
      { phase: 'PROSPECT', sectionNumber: '2', sectionName: 'Write Estimate – Project Manager 👷🏼', displayOrder: 2, lineItems: [
        { itemLetter: 'a', itemName: 'Fill out Estimate Form', displayOrder: 1, responsibleRole: 'PROJECT_MANAGER' },
        { itemLetter: 'b', itemName: 'Write initial estimate – AccuLynx', displayOrder: 2, responsibleRole: 'PROJECT_MANAGER' },
        { itemLetter: 'c', itemName: 'Write Customer Pay Estimates', displayOrder: 3, responsibleRole: 'PROJECT_MANAGER' },
        { itemLetter: 'd', itemName: 'Send for Approval', displayOrder: 4, responsibleRole: 'PROJECT_MANAGER' }
      ]},
      { phase: 'PROSPECT', sectionNumber: '3', sectionName: 'Insurance Process – Administration 📝', displayOrder: 3, lineItems: [
        { itemLetter: 'a', itemName: 'Compare field vs insurance estimates', displayOrder: 1, responsibleRole: 'ADMINISTRATION' },
        { itemLetter: 'b', itemName: 'Identify supplemental items', displayOrder: 2, responsibleRole: 'ADMINISTRATION' },
        { itemLetter: 'c', itemName: 'Draft estimate in Xactimate', displayOrder: 3, responsibleRole: 'ADMINISTRATION' }
      ]},
      { phase: 'PROSPECT', sectionNumber: '4', sectionName: 'Agreement Preparation – Administration 📝', displayOrder: 4, lineItems: [
        { itemLetter: 'a', itemName: 'Trade cost analysis', displayOrder: 1, responsibleRole: 'ADMINISTRATION' },
        { itemLetter: 'b', itemName: 'Prepare Estimate Forms', displayOrder: 2, responsibleRole: 'ADMINISTRATION' },
        { itemLetter: 'c', itemName: 'Match AL estimates', displayOrder: 3, responsibleRole: 'ADMINISTRATION' },
        { itemLetter: 'd', itemName: 'Calculate customer pay items', displayOrder: 4, responsibleRole: 'ADMINISTRATION' },
        { itemLetter: 'e', itemName: 'Send shingle/class4 email – PDF', displayOrder: 5, responsibleRole: 'ADMINISTRATION' }
      ]},
      { phase: 'PROSPECT', sectionNumber: '5', sectionName: 'Agreement Signing – Administration 📝', displayOrder: 5, lineItems: [
        { itemLetter: 'a', itemName: 'Review and send signature request', displayOrder: 1, responsibleRole: 'ADMINISTRATION' },
        { itemLetter: 'b', itemName: 'Record in QuickBooks', displayOrder: 2, responsibleRole: 'ADMINISTRATION' },
        { itemLetter: 'c', itemName: 'Process deposit', displayOrder: 3, responsibleRole: 'ADMINISTRATION' },
        { itemLetter: 'd', itemName: 'Collect signed disclaimers', displayOrder: 4, responsibleRole: 'ADMINISTRATION' }
      ]},
      { phase: 'APPROVED', sectionNumber: '1', sectionName: 'Administrative Setup – Administration 📝', displayOrder: 1, lineItems: [
        { itemLetter: 'a', itemName: 'Confirm shingle choice', displayOrder: 1, responsibleRole: 'ADMINISTRATION' },
        { itemLetter: 'b', itemName: 'Order materials', displayOrder: 2, responsibleRole: 'ADMINISTRATION' },
        { itemLetter: 'c', itemName: 'Create labor orders', displayOrder: 3, responsibleRole: 'ADMINISTRATION' },
        { itemLetter: 'd', itemName: 'Send labor order to roofing crew', displayOrder: 4, responsibleRole: 'ADMINISTRATION' }
      ]},
      { phase: 'APPROVED', sectionNumber: '2', sectionName: 'Pre-Job Actions – Office 👩🏼‍💻', displayOrder: 2, lineItems: [
        { itemLetter: 'a', itemName: 'Pull permits', displayOrder: 1, responsibleRole: 'OFFICE' }
      ]},
      { phase: 'APPROVED', sectionNumber: '3', sectionName: 'Prepare for Production – Administration 📝', displayOrder: 3, lineItems: [
        { itemLetter: 'a', itemName: 'All pictures in Job (Gutter, Ventilation, Elevation)', displayOrder: 1, responsibleRole: 'ADMINISTRATION' },
        { itemLetter: 'b', itemName: 'Verify Labor Order in Scheduler', displayOrder: 2, responsibleRole: 'ADMINISTRATION' },
        { itemLetter: 'c', itemName: 'Verify Material Orders', displayOrder: 3, responsibleRole: 'ADMINISTRATION' },
        { itemLetter: 'd', itemName: 'Subcontractor Work', displayOrder: 4, responsibleRole: 'ADMINISTRATION' }
      ]},
      { phase: 'EXECUTION', sectionNumber: '1', sectionName: 'Installation – Field Director 🛠️', displayOrder: 1, lineItems: [
        { itemLetter: 'a', itemName: 'Document work start', displayOrder: 1, responsibleRole: 'FIELD_DIRECTOR' },
        { itemLetter: 'b', itemName: 'Capture progress photos', displayOrder: 2, responsibleRole: 'FIELD_DIRECTOR' },
        { itemLetter: 'c', itemName: 'Daily Job Progress Note', displayOrder: 3, responsibleRole: 'FIELD_DIRECTOR' },
        { itemLetter: 'd', itemName: 'Upload Pictures', displayOrder: 4, responsibleRole: 'FIELD_DIRECTOR' }
      ]},
      { phase: 'EXECUTION', sectionNumber: '2', sectionName: 'Quality Check – Field + Admin', displayOrder: 2, lineItems: [
        { itemLetter: 'a', itemName: 'Completion photos – Roof Supervisor 🛠️', displayOrder: 1, responsibleRole: 'FIELD_DIRECTOR' },
        { itemLetter: 'b', itemName: 'Complete inspection – Roof Supervisor 🛠️', displayOrder: 2, responsibleRole: 'FIELD_DIRECTOR' },
        { itemLetter: 'c', itemName: 'Upload Roof Packet', displayOrder: 3, responsibleRole: 'FIELD_DIRECTOR' },
        { itemLetter: 'd', itemName: 'Verify Packet is complete – Admin 📝', displayOrder: 4, responsibleRole: 'ADMINISTRATION' }
      ]},
      { phase: 'EXECUTION', sectionNumber: '3', sectionName: 'Multiple Trades – Administration 📝', displayOrder: 3, lineItems: [
        { itemLetter: 'a', itemName: 'Confirm start date', displayOrder: 1, responsibleRole: 'ADMINISTRATION' },
        { itemLetter: 'b', itemName: 'Confirm material/labor for all trades', displayOrder: 2, responsibleRole: 'ADMINISTRATION' }
      ]},
      { phase: 'EXECUTION', sectionNumber: '4', sectionName: 'Subcontractor Work – Administration 📝', displayOrder: 4, lineItems: [
        { itemLetter: 'a', itemName: 'Coordinate with subcontractors', displayOrder: 1, responsibleRole: 'ADMINISTRATION' },
        { itemLetter: 'b', itemName: 'Verify subcontractor permits', displayOrder: 2, responsibleRole: 'ADMINISTRATION' }
      ]},
      { phase: 'SECOND_SUPPLEMENT', sectionNumber: '1', sectionName: 'Supplement Assessment – Administration 📝', displayOrder: 1, lineItems: [
        { itemLetter: 'a', itemName: 'Assess additional damage', displayOrder: 1, responsibleRole: 'ADMINISTRATION' },
        { itemLetter: 'b', itemName: 'Document supplement needs', displayOrder: 2, responsibleRole: 'ADMINISTRATION' },
        { itemLetter: 'c', itemName: 'Prepare supplement estimate', displayOrder: 3, responsibleRole: 'ADMINISTRATION' }
      ]},
      { phase: 'SECOND_SUPPLEMENT', sectionNumber: '2', sectionName: 'Additional Work – Field Director 🛠️', displayOrder: 2, lineItems: [
        { itemLetter: 'a', itemName: 'Execute additional scope', displayOrder: 1, responsibleRole: 'FIELD_DIRECTOR' },
        { itemLetter: 'b', itemName: 'Document additional work', displayOrder: 2, responsibleRole: 'FIELD_DIRECTOR' },
        { itemLetter: 'c', itemName: 'Update completion status', displayOrder: 3, responsibleRole: 'FIELD_DIRECTOR' }
      ]},
      { phase: 'COMPLETION', sectionNumber: '1', sectionName: 'Project Closeout – Administration 📝', displayOrder: 1, lineItems: [
        { itemLetter: 'a', itemName: 'Final inspection completed', displayOrder: 1, responsibleRole: 'ADMINISTRATION' },
        { itemLetter: 'b', itemName: 'Customer walkthrough', displayOrder: 2, responsibleRole: 'ADMINISTRATION' },
        { itemLetter: 'c', itemName: 'Submit warranty information', displayOrder: 3, responsibleRole: 'ADMINISTRATION' },
        { itemLetter: 'd', itemName: 'Process final payment', displayOrder: 4, responsibleRole: 'ADMINISTRATION' }
      ]},
      { phase: 'COMPLETION', sectionNumber: '2', sectionName: 'Customer Satisfaction – Administration 📝', displayOrder: 2, lineItems: [
        { itemLetter: 'a', itemName: 'Send satisfaction survey', displayOrder: 1, responsibleRole: 'ADMINISTRATION' },
        { itemLetter: 'b', itemName: 'Collect customer feedback', displayOrder: 2, responsibleRole: 'ADMINISTRATION' },
        { itemLetter: 'c', itemName: 'Update customer records', displayOrder: 3, responsibleRole: 'ADMINISTRATION' }
      ]}
    ];

    for (const sectionData of sections) {
      const phase = createdPhases.find(p => p.phaseType === sectionData.phase);
      if (!phase) continue;

      const section = await prisma.workflowSection.create({
      data: {
          sectionNumber: sectionData.sectionNumber,
          sectionName: sectionData.sectionName,
          displayName: sectionData.sectionName,
          displayOrder: sectionData.displayOrder,
        is_active: true,
        isCurrent: true,
        workflowType: 'ROOFING',
          phase: {
            connect: { id: phase.id }
          },
          description: `${sectionData.sectionName} section for ${sectionData.phase} phase`
        }
      });

      // Create line items for this section
      for (const lineItemData of sectionData.lineItems) {
        await prisma.workflowLineItem.create({
      data: {
            itemLetter: lineItemData.itemLetter,
            itemName: lineItemData.itemName,
            displayOrder: lineItemData.displayOrder,
            section: {
              connect: { id: section.id }
            },
            responsibleRole: lineItemData.responsibleRole,
        is_active: true,
        isCurrent: true,
        workflowType: 'ROOFING',
            estimatedMinutes: 60,
            alertDays: 1,
            daysToComplete: 1
          }
        });
      }

      console.log(`✅ Created section: ${section.sectionName} with ${sectionData.lineItems.length} line items`);
    }

    console.log('Seeded minimal workflow templates.');
    process.exit(0);
  } catch (e) {
    console.error('Workflow seed error:', e);
    process.exit(1);
  }
})();