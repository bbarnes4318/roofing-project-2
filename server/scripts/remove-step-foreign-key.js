/*
  Remove foreign key constraint on workflow_alerts.step_id
  This allows alerts to reference workflow_line_items IDs instead of WorkflowStep IDs
*/

const { prisma } = require('../config/prisma');

async function removeStepForeignKey() {
  try {
    console.log('🔧 Removing foreign key constraint on workflow_alerts.step_id...');

    // Remove the foreign key constraint
    await prisma.$executeRaw`
      ALTER TABLE workflow_alerts 
      DROP CONSTRAINT IF EXISTS workflow_alerts_step_id_fkey;
    `;

    console.log('✅ Successfully removed foreign key constraint');

    // Verify the constraint is gone
    const constraints = await prisma.$queryRaw`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'workflow_alerts' 
        AND kcu.column_name = 'step_id'
        AND tc.constraint_type = 'FOREIGN KEY';
    `;

    if (constraints.length === 0) {
      console.log('✅ Confirmed: No foreign key constraints on step_id');
    } else {
      console.log('⚠️ Warning: Foreign key constraints still exist:', constraints);
    }

    console.log('✅ Foreign key removal completed successfully!');

  } catch (error) {
    console.error('❌ Error removing foreign key constraint:', error);
    throw error;
  }
}

// Run the fix if called directly
if (require.main === module) {
  removeStepForeignKey()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { removeStepForeignKey };
