const { prisma } = require('./config/prisma');

async function checkFirstSteps() {
  try {
    console.log('🔍 CHECKING FIRST WORKFLOW STEPS...');
    
    // Get the first few workflow steps for each project
    const firstSteps = await prisma.$queryRaw`
      SELECT 
        ws."stepName",
        ws."stepOrder",
        pw.project_id,
        p."projectName" as project_name,
        ws."isCompleted"
      FROM workflow_steps ws
      INNER JOIN project_workflows pw ON pw.id = ws.workflow_id
      INNER JOIN projects p ON p.id = pw.project_id
      WHERE p.status IN ('PENDING','IN_PROGRESS')
        AND ws."stepOrder" <= 5  -- First 5 steps
      ORDER BY pw.project_id, ws."stepOrder"
    `;
    
    console.log(`📊 First workflow steps for active projects:`);
    let currentProject = '';
    
    firstSteps.forEach(step => {
      if (step.project_id !== currentProject) {
        console.log(`\n📋 Project: ${step.project_name} (${step.project_id}):`);
        currentProject = step.project_id;
      }
      const status = step.isCompleted ? '✅' : '🔄';
      console.log(`  ${step.stepOrder}. ${status} "${step.stepName}"`);
    });
    
    // Now let's see what the current line items are supposed to be
    console.log(`\n🎯 Current line items vs first workflow steps:`);
    
    const comparison = await prisma.$queryRaw`
      SELECT 
        pwt.project_id,
        p."projectName" as project_name,
        wli."itemName" as current_line_item,
        ws."stepName" as first_workflow_step
      FROM project_workflow_trackers pwt
      INNER JOIN workflow_line_items wli ON wli.id = pwt.current_line_item_id
      INNER JOIN projects p ON p.id = pwt.project_id
      LEFT JOIN project_workflows pw ON pw.project_id = p.id
      LEFT JOIN workflow_steps ws ON ws.workflow_id = pw.id AND ws."stepOrder" = 1
      WHERE p.status IN ('PENDING','IN_PROGRESS')
    `;
    
    comparison.forEach(comp => {
      const match = comp.current_line_item === comp.first_workflow_step ? '✅' : '❌';
      console.log(`${match} ${comp.project_name}:`);
      console.log(`    Line Item: "${comp.current_line_item}"`);
      console.log(`    Step Name: "${comp.first_workflow_step}"`);
    });
    
  } catch (error) {
    console.error('❌ Error checking first steps:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFirstSteps();