const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Read the ODS file
const workbook = XLSX.readFile('database.ods');

// Function to convert Excel/ODS type to Prisma type
function convertToPrismaType(excelType, fieldName) {
  if (!excelType) return 'String?';
  
  // Convert to string if it's not already
  const typeStr = String(excelType);
  
  const typeMap = {
    'varchar': 'String',
    'text': 'String',
    'int': 'Int',
    'integer': 'Int',
    'bigint': 'BigInt',
    'decimal': 'Decimal',
    'float': 'Float',
    'double': 'Float',
    'boolean': 'Boolean',
    'bool': 'Boolean',
    'date': 'DateTime',
    'datetime': 'DateTime',
    'timestamp': 'DateTime',
    'json': 'Json',
    'jsonb': 'Json',
    'uuid': 'String',
    'cuid': 'String'
  };
  
  const lowerType = typeStr.toLowerCase();
  
  // Check for array types
  if (lowerType.includes('[]') || lowerType.includes('array')) {
    const baseType = lowerType.replace('[]', '').replace('array', '').trim();
    return (typeMap[baseType] || 'String') + '[]';
  }
  
  // Check for nullable
  const isNullable = lowerType.includes('?') || lowerType.includes('null') || fieldName.includes('?');
  const cleanType = lowerType.replace('?', '').replace('null', '').trim();
  
  let prismaType = typeMap[cleanType] || 'String';
  
  // Add size constraints for strings
  if (prismaType === 'String' && lowerType.includes('(')) {
    const match = lowerType.match(/\((\d+)\)/);
    if (match) {
      prismaType = `String @db.VarChar(${match[1]})`;
    }
  }
  
  return isNullable && !prismaType.includes('@') ? prismaType + '?' : prismaType;
}

// Function to process a sheet and generate Prisma model
function sheetToPrismaModel(sheetName, sheet) {
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  if (data.length < 2) {
    console.log(`Skipping ${sheetName}: insufficient data`);
    return null;
  }
  
  // Get headers (field names) and types
  const headers = data[0] || [];
  const types = data[1] || [];
  
  // Convert sheet name to PascalCase for model name
  const modelName = sheetName
    .split(/[_\s-]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
  
  let model = `model ${modelName} {\n`;
  
  // Check if there's an id field, if not add one
  const hasId = headers.some(h => h && h.toLowerCase() === 'id');
  if (!hasId) {
    model += `  id        String   @id @default(cuid())\n`;
  }
  
  // Process each field
  headers.forEach((fieldName, index) => {
    if (!fieldName) return;
    
    const fieldType = types[index] || 'String';
    const prismaType = convertToPrismaType(fieldType, fieldName);
    
    // Handle special fields
    if (fieldName.toLowerCase() === 'id') {
      model += `  id        String   @id @default(cuid())\n`;
    } else if (fieldName.toLowerCase() === 'createdat' || fieldName.toLowerCase() === 'created_at') {
      model += `  createdAt DateTime @default(now())\n`;
    } else if (fieldName.toLowerCase() === 'updatedat' || fieldName.toLowerCase() === 'updated_at') {
      model += `  updatedAt DateTime @updatedAt\n`;
    } else if (fieldName.toLowerCase().includes('email')) {
      model += `  ${fieldName} ${prismaType} @unique\n`;
    } else {
      // Convert field name to camelCase
      const camelField = fieldName.charAt(0).toLowerCase() + fieldName.slice(1);
      model += `  ${camelField.padEnd(20)} ${prismaType}\n`;
    }
  });
  
  // Add timestamps if not present
  const hasCreatedAt = headers.some(h => h && (h.toLowerCase() === 'createdat' || h.toLowerCase() === 'created_at'));
  const hasUpdatedAt = headers.some(h => h && (h.toLowerCase() === 'updatedat' || h.toLowerCase() === 'updated_at'));
  
  if (!hasCreatedAt) {
    model += `  createdAt DateTime @default(now())\n`;
  }
  if (!hasUpdatedAt) {
    model += `  updatedAt DateTime @updatedAt\n`;
  }
  
  model += `}\n`;
  
  return { modelName, model };
}

// Main function
function convertODSToPrisma() {
  console.log('Reading ODS file...');
  console.log('Available sheets:', workbook.SheetNames);
  
  const models = [];
  
  // Process each sheet
  workbook.SheetNames.forEach(sheetName => {
    console.log(`\nProcessing sheet: ${sheetName}`);
    const sheet = workbook.Sheets[sheetName];
    const result = sheetToPrismaModel(sheetName, sheet);
    
    if (result) {
      models.push(result);
      console.log(`Generated model: ${result.modelName}`);
    }
  });
  
  // Generate complete schema
  let schema = `// Generated from database.ods\n`;
  schema += `// Generated at: ${new Date().toISOString()}\n\n`;
  schema += `generator client {\n`;
  schema += `  provider = "prisma-client-js"\n`;
  schema += `}\n\n`;
  schema += `datasource db {\n`;
  schema += `  provider = "postgresql"\n`;
  schema += `  url      = env("DATABASE_URL")\n`;
  schema += `}\n\n`;
  
  // Add all models
  models.forEach(({ model }) => {
    schema += model + '\n';
  });
  
  // Save to file
  const outputPath = 'generated-schema.prisma';
  fs.writeFileSync(outputPath, schema);
  console.log(`\nSchema saved to ${outputPath}`);
  
  // Also save a JSON representation for review
  const jsonOutput = {
    generatedAt: new Date().toISOString(),
    sheets: workbook.SheetNames,
    models: models.map(m => m.modelName),
    fullSchema: schema
  };
  
  fs.writeFileSync('schema-analysis.json', JSON.stringify(jsonOutput, null, 2));
  console.log('Analysis saved to schema-analysis.json');
  
  return { models, schema };
}

// Run the conversion
try {
  const result = convertODSToPrisma();
  console.log(`\nSuccessfully processed ${result.models.length} models`);
  
  // Display summary
  console.log('\nGenerated models:');
  result.models.forEach(m => console.log(`  - ${m.modelName}`));
  
} catch (error) {
  console.error('Error converting ODS to Prisma:', error);
  process.exit(1);
}