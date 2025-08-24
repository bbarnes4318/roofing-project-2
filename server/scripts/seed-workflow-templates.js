#!/usr/bin/env node

const { prisma } = require('../config/prisma');

(async () => {
  try {
    const phaseCount = await prisma.workflowPhase.count();
    if (phaseCount > 0) {
      console.log('Workflow templates already exist. Skipping.');
      process.exit(0);
    }

    // Minimal seed for ROOFING: Lead -> Prospect
    const lead = await prisma.workflowPhase.create({
      data: {
        phaseName: 'Lead',
        phaseType: 'LEAD',
        displayOrder: 1,
        isActive: true,
        isCurrent: true,
        workflowType: 'ROOFING'
      }
    });
    const prospect = await prisma.workflowPhase.create({
      data: {
        phaseName: 'Prospect',
        phaseType: 'PROSPECT',
        displayOrder: 2,
        isActive: true,
        isCurrent: true,
        workflowType: 'ROOFING'
      }
    });

    const leadSection = await prisma.workflowSection.create({
      data: {
        sectionNumber: '1',
        sectionName: 'Input Customer Information',
        displayName: 'Input Customer Information',
        displayOrder: 1,
        isActive: true,
        isCurrent: true,
        workflowType: 'ROOFING',
        phaseId: lead.id
      }
    });

    await prisma.workflowLineItem.createMany({
      data: [
        { itemLetter: 'a', itemName: 'Make sure the name is spelled correctly', displayOrder: 1, sectionId: leadSection.id, responsibleRole: 'OFFICE', isActive: true, isCurrent: true, workflowType: 'ROOFING' },
        { itemLetter: 'b', itemName: 'Make sure the email is correct', displayOrder: 2, sectionId: leadSection.id, responsibleRole: 'OFFICE', isActive: true, isCurrent: true, workflowType: 'ROOFING' }
      ]
    });

    const prospectSection = await prisma.workflowSection.create({
      data: {
        sectionNumber: '1',
        sectionName: 'Site Inspection',
        displayName: 'Site Inspection',
        displayOrder: 1,
        isActive: true,
        isCurrent: true,
        workflowType: 'ROOFING',
        phaseId: prospect.id
      }
    });

    await prisma.workflowLineItem.createMany({
      data: [
        { itemLetter: 'a', itemName: 'Take site photos', displayOrder: 1, sectionId: prospectSection.id, responsibleRole: 'PROJECT_MANAGER', isActive: true, isCurrent: true, workflowType: 'ROOFING' },
        { itemLetter: 'b', itemName: 'Complete inspection form', displayOrder: 2, sectionId: prospectSection.id, responsibleRole: 'PROJECT_MANAGER', isActive: true, isCurrent: true, workflowType: 'ROOFING' }
      ]
    });

    console.log('Seeded minimal workflow templates.');
    process.exit(0);
  } catch (e) {
    console.error('Workflow seed error:', e);
    process.exit(1);
  }
})();