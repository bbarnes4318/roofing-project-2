const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Map phase names to enum values
const phaseMapping = {
  'Lead': 'LEAD',
  'Prospect': 'PROSPECT',
  'Prospect: Non-Insurance': 'PROSPECT_NON_INSURANCE',
  'Approved': 'APPROVED',
  'Execution': 'EXECUTION',
  '2nd Supp': 'SECOND_SUPP',
  'Completion': 'COMPLETION'
};

// Map role names to enum values
const roleMapping = {
  'Office': 'OFFICE',
  'Administration': 'ADMINISTRATION',
  'Project Manager': 'PROJECT_MANAGER',
  'Field Director': 'FIELD_DIRECTOR',
  'Roof Supervisor': 'ROOF_SUPERVISOR'
};

// Role emojis for display
const roleEmojis = {
  'OFFICE': '👩🏼‍💻',
  'ADMINISTRATION': '📝',
  'PROJECT_MANAGER': '👷🏼',
  'FIELD_DIRECTOR': '🛠️',
  'ROOF_SUPERVISOR': '🛠️'
};

async function importWorkflow() {
  try {
    console.log('🚀 Starting workflow import...');
    
    // Read CSV file
    const csvPath = path.join(__dirname, '../../workflow.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Parse CSV
    const records = parse(csvContent, {
      columns: false,
      skip_empty_lines: true,
      relax_column_count: true
    });
    
    let currentPhase = null;
    let currentPhaseId = null;
    let currentSection = null;
    let currentSectionId = null;
    let phaseOrder = 0;
    let sectionOrder = 0;
    let itemOrder = 0;
    
    for (const row of records) {
      const firstCell = row[0]?.trim();
      const secondCell = row[1]?.trim();
      const thirdCell = row[2]?.trim();
      
      if (!firstCell) continue;
      
      // Check if this is a phase header (starts with **)
      if (firstCell.startsWith('**') && firstCell.endsWith('**')) {
        const phaseName = firstCell.replace(/\*\*/g, '').trim();
        const phaseEnum = phaseMapping[phaseName];
        
        if (!phaseEnum) {
          console.log(`⚠️ Unknown phase: ${phaseName}`);
          continue;
        }
        
        console.log(`\n📌 Processing Phase: ${phaseName} (${phaseEnum})`);
        
        // Create or update phase
        const phase = await prisma.workflowPhase.upsert({
          where: { phaseType: phaseEnum },
          update: { 
            phaseName,
            displayOrder: phaseOrder++,
            isActive: true
          },
          create: {
            phaseName,
            phaseType: phaseEnum,
            displayOrder: phaseOrder++,
            isActive: true
          }
        });
        
        currentPhase = phaseName;
        currentPhaseId = phase.id;
        sectionOrder = 0;
        continue;
      }
      
      // Skip comment rows or phase descriptions
      if (firstCell.startsWith('*') && !firstCell.startsWith('**')) {
        continue;
      }
      
      // Check if this is a section (numbered item like "1. Section Name")
      const sectionMatch = firstCell.match(/^(\d+)\.\s+(.+)$/);
      if (sectionMatch && currentPhaseId) {
        const sectionNumber = sectionMatch[1];
        const sectionName = sectionMatch[2];
        
        console.log(`  📂 Section ${sectionNumber}: ${sectionName}`);
        
        // Determine the responsible role for display name
        let displayRole = 'General';
        let displayEmoji = '📋';
        
        // We'll determine this based on the first line item's role
        currentSection = {
          number: sectionNumber,
          name: sectionName,
          phaseId: currentPhaseId
        };
        
        itemOrder = 0;
        continue;
      }
      
      // Check if this is a line item (lettered item like "a. Item Name")
      const itemMatch = firstCell.match(/^([a-z])\.\s+(.+)$/);
      if (itemMatch && currentSection && secondCell) {
        const itemLetter = itemMatch[1];
        const itemName = itemMatch[2];
        const roleEnum = roleMapping[secondCell] || 'OFFICE';
        
        // If this is the first line item, create the section
        if (itemLetter === 'a') {
          const displayEmoji = roleEmojis[roleEnum] || '📋';
          const displayName = `${currentSection.name} – ${secondCell} ${displayEmoji}`;
          
          const section = await prisma.workflowSection.upsert({
            where: {
              phaseId_sectionNumber: {
                phaseId: currentSection.phaseId,
                sectionNumber: currentSection.number
              }
            },
            update: {
              sectionName: currentSection.name,
              displayName,
              displayOrder: sectionOrder++,
              isActive: true
            },
            create: {
              sectionNumber: currentSection.number,
              sectionName: currentSection.name,
              displayName,
              displayOrder: sectionOrder++,
              phaseId: currentSection.phaseId,
              isActive: true
            }
          });
          
          currentSectionId = section.id;
        }
        
        if (currentSectionId) {
          console.log(`    📝 Line Item ${itemLetter}: ${itemName} (${secondCell})`);
          
          // Create line item
          await prisma.workflowLineItem.upsert({
            where: {
              sectionId_itemLetter: {
                sectionId: currentSectionId,
                itemLetter: itemLetter
              }
            },
            update: {
              itemName,
              responsibleRole: roleEnum,
              displayOrder: itemOrder++,
              isActive: true
            },
            create: {
              itemLetter,
              itemName,
              responsibleRole: roleEnum,
              displayOrder: itemOrder++,
              sectionId: currentSectionId,
              isActive: true
            }
          });
        }
      }
    }
    
    console.log('\n✅ Workflow import completed successfully!');
    
    // Verify the import
    const phaseCount = await prisma.workflowPhase.count();
    const sectionCount = await prisma.workflowSection.count();
    const itemCount = await prisma.workflowLineItem.count();
    
    console.log(`\n📊 Import Summary:`);
    console.log(`   - Phases: ${phaseCount}`);
    console.log(`   - Sections: ${sectionCount}`);
    console.log(`   - Line Items: ${itemCount}`);
    
  } catch (error) {
    console.error('❌ Error importing workflow:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importWorkflow().catch(console.error);