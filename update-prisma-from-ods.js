const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Read the ODS file
console.log('Reading database.ods...');
const workbook = XLSX.readFile('database.ods');

// Map sheet names to Prisma model names (matching existing schema)
const sheetToModelMap = {
  'users': 'User',
  'customers': 'Customer', 
  'workflow_alerts': 'WorkflowAlert',
  'role_assignments': 'RoleAssignment',
  'workflow_phases': 'WorkflowPhase',
  'workflow_sections': 'WorkflowSection',
  'workflow_line_items': 'WorkflowLineItem',
  'projects': 'Project',
  'project_workflow_trackers': 'ProjectWorkflowTracker',
  'completed_workflow_items': 'CompletedWorkflowItem'
};

// Type mapping from Excel data patterns to Prisma types
function inferPrismaType(fieldName, sampleValue) {
  // Check field name patterns first
  if (fieldName.toLowerCase().includes('id')) {
    if (fieldName === 'id') return 'String @id @default(cuid())';
    return 'String'; // Foreign keys
  }
  if (fieldName.toLowerCase().includes('createdat')) return 'DateTime @default(now())';
  if (fieldName.toLowerCase().includes('updatedat')) return 'DateTime @updatedAt';
  if (fieldName.toLowerCase().includes('date') || fieldName.toLowerCase().includes('at')) return 'DateTime?';
  if (fieldName.toLowerCase().includes('email')) return 'String @unique';
  if (fieldName.toLowerCase().includes('phone')) return 'String?';
  if (fieldName.toLowerCase().includes('is') || fieldName.toLowerCase().includes('has')) return 'Boolean @default(false)';
  if (fieldName.toLowerCase().includes('count') || fieldName.toLowerCase().includes('attempts')) return 'Int @default(0)';
  if (fieldName.toLowerCase().includes('price') || fieldName.toLowerCase().includes('cost') || fieldName.toLowerCase().includes('budget')) return 'Decimal?';
  
  // Check sample value type
  if (sampleValue === null || sampleValue === undefined || sampleValue === '') return 'String?';
  if (typeof sampleValue === 'boolean') return 'Boolean @default(false)';
  if (typeof sampleValue === 'number') {
    if (Number.isInteger(sampleValue)) return 'Int';
    return 'Float';
  }
  
  // Check for specific patterns in string values
  const strValue = String(sampleValue);
  if (strValue.match(/^\d{4}-\d{2}-\d{2}/)) return 'DateTime';
  if (strValue.match(/^[0-9a-f]{24,}$/i)) return 'String'; // IDs
  if (strValue.length > 255) return 'String @db.Text';
  
  return 'String?'; // Default to optional string
}

// Process each sheet and extract schema information
const schemas = {};

workbook.SheetNames.forEach(sheetName => {
  const modelName = sheetToModelMap[sheetName];
  if (!modelName) {
    console.log(`Skipping unmapped sheet: ${sheetName}`);
    return;
  }
  
  console.log(`Processing ${sheetName} -> ${modelName}`);
  
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  if (data.length < 2) {
    console.log(`  Insufficient data in ${sheetName}`);
    return;
  }
  
  const headers = data[0] || [];
  const sampleRow = data[1] || [];
  
  const fields = [];
  
  headers.forEach((fieldName, index) => {
    if (!fieldName) return;
    
    const sampleValue = sampleRow[index];
    const prismaType = inferPrismaType(fieldName, sampleValue);
    
    fields.push({
      name: fieldName,
      type: prismaType,
      sampleValue: sampleValue
    });
  });
  
  schemas[modelName] = {
    sheetName,
    fields,
    rowCount: data.length - 1 // Exclude header row
  };
});

// Read existing Prisma schema
const existingSchemaPath = path.join('server', 'prisma', 'schema.prisma');
console.log(`\nReading existing schema from ${existingSchemaPath}...`);
const existingSchema = fs.readFileSync(existingSchemaPath, 'utf8');

// Parse existing models to preserve relations and custom attributes
const existingModels = {};
const modelRegex = /model\s+(\w+)\s*{([^}]+)}/g;
let match;

while ((match = modelRegex.exec(existingSchema)) !== null) {
  const modelName = match[1];
  const modelContent = match[2];
  existingModels[modelName] = modelContent;
}

// Generate updated schema
let updatedSchema = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

`;

// Define enums (preserve from existing schema)
const enumSection = existingSchema.match(/enum[\s\S]*?}\n/g);
if (enumSection) {
  updatedSchema += enumSection.join('\n') + '\n';
}

// Generate models based on ODS data
Object.keys(schemas).forEach(modelName => {
  const schemaInfo = schemas[modelName];
  
  console.log(`\nGenerating model: ${modelName}`);
  updatedSchema += `model ${modelName} {\n`;
  
  // Add fields from ODS
  schemaInfo.fields.forEach(field => {
    const fieldName = field.name;
    const fieldType = field.type;
    
    // Format field name for Prisma (camelCase)
    const prismaFieldName = fieldName.charAt(0).toLowerCase() + fieldName.slice(1);
    
    updatedSchema += `  ${prismaFieldName.padEnd(30)} ${fieldType}\n`;
  });
  
  // Preserve relations from existing schema if they exist
  if (existingModels[modelName]) {
    const relationLines = existingModels[modelName]
      .split('\n')
      .filter(line => line.includes('@relation') || line.includes('[]'));
    
    if (relationLines.length > 0) {
      updatedSchema += '\n  // Relations from existing schema\n';
      relationLines.forEach(line => {
        if (!schemaInfo.fields.some(f => line.includes(f.name))) {
          updatedSchema += line + '\n';
        }
      });
    }
  }
  
  // Add indexes if needed
  if (modelName === 'WorkflowAlert') {
    updatedSchema += '\n  @@index([projectId, status])\n';
    updatedSchema += '  @@index([assignedToId, isRead])\n';
  }
  
  updatedSchema += '}\n\n';
});

// Save the updated schema
const outputPath = 'updated-schema.prisma';
fs.writeFileSync(outputPath, updatedSchema);
console.log(`\nUpdated schema saved to ${outputPath}`);

// Generate migration SQL
console.log('\nGenerating migration commands...');
const migrationCommands = `
# Commands to apply the database changes:

1. First, backup your existing schema:
   cp server/prisma/schema.prisma server/prisma/schema.backup.prisma

2. Copy the updated schema:
   cp updated-schema.prisma server/prisma/schema.prisma

3. Generate Prisma client with new schema:
   cd server
   npx prisma generate

4. Create and apply migration:
   npx prisma migrate dev --name update_from_ods

5. If you need to push without migration (development only):
   npx prisma db push

6. Regenerate alerts for all projects:
   node ../regenerate-alerts.js
`;

fs.writeFileSync('migration-commands.txt', migrationCommands);
console.log('Migration commands saved to migration-commands.txt');

// Create alert regeneration script
const alertScript = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function regenerateAlerts() {
  console.log('Starting alert regeneration...');
  
  try {
    // Get all active projects with their workflow trackers
    const projects = await prisma.project.findMany({
      where: {
        archived: false,
        status: { not: 'COMPLETED' }
      },
      include: {
        projectWorkflowTracker: {
          include: {
            currentLineItem: true,
            currentSection: true,
            currentPhase: true
          }
        }
      }
    });
    
    console.log(\`Found \${projects.length} active projects\`);
    
    for (const project of projects) {
      if (!project.projectWorkflowTracker) {
        console.log(\`Project \${project.projectNumber} has no workflow tracker\`);
        continue;
      }
      
      const tracker = project.projectWorkflowTracker;
      
      // Create alert for current line item
      if (tracker.currentLineItem) {
        const alert = await prisma.workflowAlert.create({
          data: {
            type: 'WORKFLOW_TASK',
            priority: 'MEDIUM',
            status: 'PENDING',
            title: \`Complete: \${tracker.currentLineItem.itemName}\`,
            message: \`Line item "\${tracker.currentLineItem.itemName}" is ready to be completed for project \${project.projectNumber}\`,
            stepName: tracker.currentLineItem.itemName,
            projectId: project.id,
            lineItemId: tracker.currentLineItemId,
            sectionId: tracker.currentSectionId,
            phaseId: tracker.currentPhaseId,
            responsibleRole: tracker.currentLineItem.responsibleRole || 'OFFICE',
            dueDate: new Date(Date.now() + (tracker.currentLineItem.alertDays || 1) * 24 * 60 * 60 * 1000)
          }
        });
        
        console.log(\`Created alert for project \${project.projectNumber}: \${tracker.currentLineItem.itemName}\`);
      }
    }
    
    console.log('Alert regeneration complete!');
    
  } catch (error) {
    console.error('Error regenerating alerts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

regenerateAlerts();
`;

fs.writeFileSync('regenerate-alerts.js', alertScript);
console.log('Alert regeneration script saved to regenerate-alerts.js');

console.log('\n=== Summary ===');
console.log('Models processed:', Object.keys(schemas).length);
Object.keys(schemas).forEach(model => {
  console.log(`  - ${model}: ${schemas[model].fields.length} fields`);
});
console.log('\nNext steps:');
console.log('1. Review the updated-schema.prisma file');
console.log('2. Follow the commands in migration-commands.txt');
console.log('3. Run regenerate-alerts.js to create new alerts');