/*
  Backfill progress from current tracker positions
  - For each project's main tracker, mark all line items in phases BEFORE the current phase as completed
  - Also mark all sections BEFORE the current section (within current phase) and line items BEFORE the current line item as completed
  - Uses existing WorkflowProgressionService helper for previous phases
*/

const { PrismaClient } = require('@prisma/client');
const WorkflowProgressionService = require('../services/WorkflowProgressionService');

const prisma = new PrismaClient();

async function backfill() {
  const trackers = await prisma.projectWorkflowTracker.findMany({
    where: {},
    include: {
      project: { select: { projectNumber: true, projectName: true } },
      currentPhase: { select: { id: true, phaseType: true } },
      currentSection: { select: { id: true, displayOrder: true, phaseId: true } },
      currentLineItem: { select: { id: true, displayOrder: true, sectionId: true } },
    }
  });

  let totalUpdated = 0;
  for (const t of trackers) {
    const currentPhaseType = t.currentPhase?.phaseType || 'LEAD';
    if (currentPhaseType === 'LEAD') continue;

    await prisma.$transaction(async (tx) => {
      // 1) Mark all items in previous phases completed
      await WorkflowProgressionService.markPreviousPhasesAsCompleted(tx, t.id, t.workflowType, currentPhaseType);

      // Build a set of already completed line item IDs to avoid duplicates
      const existing = await tx.completedWorkflowItem.findMany({
        where: { trackerId: t.id },
        select: { lineItemId: true }
      });
      const done = new Set(existing.map(e => e.lineItemId));

      // 2) Mark all items in previous sections within current phase
      if (t.currentSectionId) {
        const prevSections = await tx.workflowSection.findMany({
          where: {
            phaseId: t.currentSection.phaseId,
            isActive: true,
            displayOrder: { lt: t.currentSection.displayOrder }
          },
          include: { lineItems: { where: { isActive: true }, select: { id: true } } }
        });

        for (const s of prevSections) {
          const toCreate = s.lineItems
            .filter(li => !done.has(li.id))
            .map(li => ({ trackerId: t.id, phaseId: t.currentPhase.id, sectionId: s.id, lineItemId: li.id }));
          if (toCreate.length) {
            await tx.completedWorkflowItem.createMany({ data: toCreate, skipDuplicates: true });
            totalUpdated += toCreate.length;
            toCreate.forEach(c => done.add(c.lineItemId));
          }
        }
      }

      // 3) Mark items BEFORE current line item in current section
      if (t.currentLineItemId && t.currentSectionId) {
        const prevItems = await tx.workflowLineItem.findMany({
          where: { sectionId: t.currentSectionId, isActive: true, displayOrder: { lt: t.currentLineItem.displayOrder } },
          select: { id: true }
        });
        const toCreate = prevItems
          .filter(li => !done.has(li.id))
          .map(li => ({ trackerId: t.id, phaseId: t.currentPhase.id, sectionId: t.currentSectionId, lineItemId: li.id }));
        if (toCreate.length) {
          await tx.completedWorkflowItem.createMany({ data: toCreate, skipDuplicates: true });
          totalUpdated += toCreate.length;
        }
      }
    });
  }

  console.log(`✅ Backfill complete. Added completed items: ${totalUpdated}`);
}

backfill()
  .catch((e) => { console.error('❌ Backfill error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });


