const { prisma } = require('./config/prisma');

async function checkSchema() {
  try {
    console.log('🔍 CHECKING DATABASE SCHEMA...');
    
    // Get projects table columns
    const projectsColumns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'projects' 
      ORDER BY ordinal_position
    `;
    
    console.log(`\n📊 Projects table columns (${projectsColumns.length}):`);
    projectsColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Get workflow_line_items table columns
    const workflowLineItemsColumns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'workflow_line_items' 
      ORDER BY ordinal_position
    `;
    
    console.log(`\n📊 Workflow Line Items table columns (${workflowLineItemsColumns.length}):`);
    workflowLineItemsColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Get workflow_alerts table columns
    const workflowAlertsColumns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'workflow_alerts' 
      ORDER BY ordinal_position
    `;
    
    console.log(`\n🚨 Workflow Alerts table columns (${workflowAlertsColumns.length}):`);
    workflowAlertsColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Get workflow_steps table columns
    const workflowStepsColumns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'workflow_steps' 
      ORDER BY ordinal_position
    `;
    
    console.log(`\n📃 Workflow Steps table columns (${workflowStepsColumns.length}):`);
    workflowStepsColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking schema:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchema();