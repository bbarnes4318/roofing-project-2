const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const projects = await prisma.project.findMany({
      select: { id: true, projectNumber: true, projectName: true }
    });
    for (const p of projects) {
      const tracker = await prisma.projectWorkflowTracker.findFirst({ where: { projectId: p.id } });
      if (!tracker) {
        console.log(`#${p.projectNumber} ${p.projectName} -> NO TRACKER`);
        continue;
      }
      const completed = await prisma.completedWorkflowItem.count({ where: { trackerId: tracker.id } });
      const total = tracker.totalLineItems || 0;
      const pct = total ? Math.round((completed / total) * 100) : 0;
      console.log(`#${p.projectNumber} ${p.projectName} -> ${completed}/${total} = ${pct}% (phaseId=${tracker.currentPhaseId})`);
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
    console.log('✅ Done');
  }
})();


