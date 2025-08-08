const { prisma } = require('./config/prisma');

async function fixTrackers() {
  try {
    console.log('🔧 FIXING PROJECT WORKFLOW TRACKERS...');
    
    // Find the correct line item that should be the first one ("Input Customer Information")
    const firstLineItem = await prisma.workflowLineItem.findFirst({
      where: {
        itemName: 'Input Customer Information',
        isActive: true
      },
      select: {
        id: true,
        itemName: true
      }
    });
    
    if (!firstLineItem) {
      console.error('❌ Could not find "Input Customer Information" line item');
      return;
    }
    
    console.log(`✅ Found correct first line item: "${firstLineItem.itemName}" (ID: ${firstLineItem.id})`);
    
    // Get all project trackers that are pointing to the wrong line item
    const brokenTrackers = await prisma.$queryRaw`
      SELECT 
        pwt.id,
        pwt.project_id,
        wli."itemName" as current_item_name,
        p."projectName" as project_name
      FROM project_workflow_trackers pwt
      INNER JOIN workflow_line_items wli ON wli.id = pwt.current_line_item_id
      INNER JOIN projects p ON p.id = pwt.project_id
      WHERE wli."itemName" = 'Make sure the name is spelled correctly'
        AND p.status IN ('PENDING','IN_PROGRESS')
    `;
    
    console.log(`📊 Found ${brokenTrackers.length} trackers pointing to wrong line item:`);
    brokenTrackers.forEach(tracker => {
      console.log(`  - Project: ${tracker.project_name} - Current: "${tracker.current_item_name}"`);
    });
    
    if (brokenTrackers.length === 0) {
      console.log('✅ No broken trackers found!');
      return;
    }
    
    // Update all broken trackers to point to the correct first line item
    const updateResult = await prisma.projectWorkflowTracker.updateMany({
      where: {
        id: {
          in: brokenTrackers.map(t => t.id)
        }
      },
      data: {
        currentLineItemId: firstLineItem.id
      }
    });
    
    console.log(`✅ Updated ${updateResult.count} project workflow trackers`);
    
    // Verify the fix
    const fixedTrackers = await prisma.$queryRaw`
      SELECT 
        pwt.project_id,
        wli."itemName" as current_line_item_name,
        p."projectName" as project_name
      FROM project_workflow_trackers pwt
      INNER JOIN workflow_line_items wli ON wli.id = pwt.current_line_item_id
      INNER JOIN projects p ON p.id = pwt.project_id
      WHERE p.status IN ('PENDING','IN_PROGRESS')
    `;
    
    console.log(`\n✅ After fix - Current line items for active projects (${fixedTrackers.length}):`);
    fixedTrackers.forEach(tracker => {
      console.log(`  - Project: ${tracker.project_name} - Current Item: "${tracker.current_line_item_name}"`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing trackers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTrackers();