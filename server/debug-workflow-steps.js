const { prisma } = require('./config/prisma');

async function debugWorkflowSteps() {
  try {
    console.log('🔍 DEBUGGING WORKFLOW STEPS...');
    
    // Get project trackers and their current line items
    const trackers = await prisma.$queryRaw`
      SELECT 
        pwt.project_id,
        wli."itemName" as current_line_item_name,
        p."projectName" as project_name,
        p.status as project_status
      FROM project_workflow_trackers pwt
      INNER JOIN workflow_line_items wli ON wli.id = pwt.current_line_item_id
      INNER JOIN projects p ON p.id = pwt.project_id
      WHERE p.status IN ('PENDING','IN_PROGRESS')
    `;
    
    console.log(`📊 Current line items for active projects (${trackers.length}):`);
    trackers.forEach(tracker => {
      console.log(`  - Project: ${tracker.project_name} (${tracker.project_status}) - Current Item: "${tracker.current_line_item_name}"`);
    });
    
    // Check if workflow steps exist for these projects
    const steps = await prisma.$queryRaw`
      SELECT 
        ws."stepName",
        pw.project_id,
        p."projectName" as project_name,
        ws."isCompleted"
      FROM workflow_steps ws
      INNER JOIN project_workflows pw ON pw.id = ws.workflow_id
      INNER JOIN projects p ON p.id = pw.project_id
      WHERE p.status IN ('PENDING','IN_PROGRESS')
      ORDER BY pw.project_id, ws."stepOrder"
    `;
    
    console.log(`\n📋 Workflow steps for active projects (${steps.length}):`);
    const projectSteps = new Map();
    steps.forEach(step => {
      if (!projectSteps.has(step.project_id)) {
        projectSteps.set(step.project_id, []);
      }
      projectSteps.get(step.project_id).push({
        name: step.stepName,
        completed: step.isCompleted
      });
    });
    
    projectSteps.forEach((steps, projectId) => {
      const projectName = steps.length > 0 ? steps[0].project_name || 'Unknown' : 'Unknown';
      console.log(`  - Project ${projectId} (${projectName}): ${steps.length} steps`);
      steps.slice(0, 3).forEach(step => {
        console.log(`    - "${step.name}" (${step.completed ? 'completed' : 'active'})`);
      });
      if (steps.length > 3) {
        console.log(`    ... and ${steps.length - 3} more steps`);
      }
    });
    
    // Check if there are any matches between current line items and workflow steps
    console.log(`\n🎯 Checking for matches between current line items and workflow steps...`);
    for (const tracker of trackers) {
      const matchingSteps = await prisma.$queryRaw`
        SELECT ws.id, ws."stepName"
        FROM workflow_steps ws
        INNER JOIN project_workflows pw ON pw.id = ws.workflow_id
        WHERE pw.project_id = ${tracker.project_id}
          AND ws."stepName" = ${tracker.current_line_item_name}
      `;
      
      console.log(`  - Project ${tracker.project_name}: Looking for step "${tracker.current_line_item_name}" - Found ${matchingSteps.length} matches`);
      if (matchingSteps.length > 0) {
        matchingSteps.forEach(step => {
          console.log(`    ✅ Match found: Step ID ${step.id} - "${step.stepName}"`);
        });
      } else {
        console.log(`    ❌ No matching steps found`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error debugging workflow steps:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugWorkflowSteps();