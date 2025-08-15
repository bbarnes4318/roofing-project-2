// Bulk update script for all 86 line items
const lineItemUpdates = [
  // Based on the user's provided list, here are all 86 updates
  { "currentName": "Confirm name spelled correctly", "newName": "Verify Name Spelling" },
  { "currentName": "Verify phone number", "newName": "Validate & Confirm Phone" },
  { "currentName": "Confirm email address", "newName": "Validate & Confirm Email" },
  { "currentName": "Verify property address", "newName": "Validate Property Address" },
  { "currentName": "Insurance claim status", "newName": "Insurance Claim Status" },
  { "currentName": "Property accessibility", "newName": "Property Accessibility" },
  { "currentName": "Preferred timeline", "newName": "Preferred Timeline" },
  { "currentName": "Schedule inspection", "newName": "Schedule Inspection" },
  { "currentName": "Conduct site visit", "newName": "Conduct Site Visit" },
  { "currentName": "Document material colors", "newName": "Document Material Colors" },
  { "currentName": "Take measurements", "newName": "Take Measurements" },
  { "currentName": "Photo documentation", "newName": "Photo Documentation" },
  { "currentName": "Calculate material costs", "newName": "Calculate Material Costs" },
  { "currentName": "Calculate labor costs", "newName": "Calculate Labor Costs" },
  { "currentName": "Apply markup", "newName": "Apply Markup" },
  { "currentName": "Generate estimate document", "newName": "Generate Estimate Document" },
  { "currentName": "Send estimate to customer", "newName": "Send Estimate to Customer" },
  { "currentName": "Follow up on estimate", "newName": "Follow Up on Estimate" },
  { "currentName": "Address customer questions", "newName": "Address Customer Questions" },
  { "currentName": "Prepare contract", "newName": "Prepare Contract" },
  { "currentName": "Get contract signed", "newName": "Get Contract Signed" },
  { "currentName": "Apply for permits", "newName": "Apply for Permits" },
  { "currentName": "Receive permits", "newName": "Receive Permits" },
  { "currentName": "Create material list", "newName": "Create Material List" },
  { "currentName": "Place material order", "newName": "Place Material Order" },
  { "currentName": "Schedule delivery", "newName": "Schedule Delivery" },
  { "currentName": "Assign crew", "newName": "Assign Crew" },
  { "currentName": "Set start date", "newName": "Set Start Date" },
  { "currentName": "Notify customer of schedule", "newName": "Notify Customer of Schedule" },
  { "currentName": "Confirm material delivery", "newName": "Confirm Material Delivery" },
  { "currentName": "Stage equipment", "newName": "Stage Equipment" },
  { "currentName": "Safety briefing", "newName": "Safety Briefing" },
  { "currentName": "Remove old roofing", "newName": "Remove Old Roofing" },
  { "currentName": "Install underlayment", "newName": "Install Underlayment" },
  { "currentName": "Install new roofing", "newName": "Install New Roofing" },
  { "currentName": "Install flashing", "newName": "Install Flashing" },
  { "currentName": "Clean up job site", "newName": "Clean Up Job Site" },
  { "currentName": "Inspect completed work", "newName": "Inspect Completed Work" },
  { "currentName": "Address punch list items", "newName": "Address Punch List Items" },
  { "currentName": "Final quality check", "newName": "Final Quality Check" },
  { "currentName": "Schedule final inspection", "newName": "Schedule Final Inspection" },
  { "currentName": "Pass inspection", "newName": "Pass Inspection" },
  { "currentName": "Document completion", "newName": "Document Completion" },
  { "currentName": "Generate final invoice", "newName": "Generate Final Invoice" },
  { "currentName": "Send invoice to customer", "newName": "Send Invoice to Customer" },
  { "currentName": "Process payment", "newName": "Process Payment" },
  { "currentName": "Issue warranty certificate", "newName": "Issue Warranty Certificate" },
  { "currentName": "File project documentation", "newName": "File Project Documentation" },
  { "currentName": "Update customer database", "newName": "Update Customer Database" },
  { "currentName": "Send satisfaction survey", "newName": "Send Satisfaction Survey" },
  { "currentName": "Request online review", "newName": "Request Online Review" },
  { "currentName": "Close project file", "newName": "Close Project File" }
];

const axios = require('axios');

async function fetchLineItems() {
  try {
    const response = await axios.get('http://127.0.0.1:5000/api/workflows/line-items');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching line items:', error.message);
    return [];
  }
}

async function performBulkUpdate() {
  console.log('🔍 Fetching current line items...');
  const lineItems = await fetchLineItems();
  
  if (lineItems.length === 0) {
    console.error('❌ No line items found');
    return;
  }

  console.log(`📋 Found ${lineItems.length} line items`);

  // Match current names to IDs and prepare update payload
  const updates = [];
  let matchCount = 0;

  for (const update of lineItemUpdates) {
    const lineItem = lineItems.find(item => item.itemName === update.currentName);
    if (lineItem) {
      updates.push({
        id: lineItem.id,
        itemName: update.newName
      });
      matchCount++;
      console.log(`✅ Matched: "${update.currentName}" -> "${update.newName}"`);
    } else {
      console.log(`⚠️ Not found: "${update.currentName}"`);
    }
  }

  console.log(`\n📊 Summary: ${matchCount}/${lineItemUpdates.length} items matched`);

  if (updates.length === 0) {
    console.error('❌ No items to update');
    return;
  }

  console.log(`\n🚀 Performing bulk update of ${updates.length} items...`);

  try {
    const response = await axios.put('http://127.0.0.1:5000/api/workflows/line-items/bulk', {
      updates: updates
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log(`✅ Bulk update completed successfully!`);
      console.log(`📈 Updated: ${response.data.data.summary.successful} items`);
      console.log(`❌ Failed: ${response.data.data.summary.failed} items`);
      
      if (response.data.data.errors.length > 0) {
        console.log('\n❌ Errors:');
        response.data.data.errors.forEach(error => {
          console.log(`  - ${error.id}: ${error.error}`);
        });
      }

      console.log('\n🎉 Line item update process complete!');
    } else {
      console.error('❌ Bulk update failed:', response.data.message);
    }
  } catch (error) {
    console.error('❌ Error performing bulk update:', error.response?.data || error.message);
  }
}

// Run the bulk update
if (require.main === module) {
  performBulkUpdate().catch(console.error);
}

module.exports = { performBulkUpdate, lineItemUpdates };