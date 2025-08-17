const XLSX = require('xlsx');
const fs = require('fs');

// Read the ODS file
console.log('Reading database.ods...');
const workbook = XLSX.readFile('database.ods');

console.log('\n=== ODS File Analysis ===');
console.log('Total sheets:', workbook.SheetNames.length);
console.log('Sheet names:', workbook.SheetNames);

// Analyze each sheet
workbook.SheetNames.forEach(sheetName => {
  console.log(`\n--- Sheet: ${sheetName} ---`);
  
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log(`Rows: ${data.length}`);
  
  if (data.length > 0) {
    console.log('First row (headers):');
    console.log(data[0]);
    
    if (data.length > 1) {
      console.log('\nSecond row (sample data or types):');
      console.log(data[1]);
    }
    
    if (data.length > 2) {
      console.log('\nThird row (sample data):');
      console.log(data[2]);
    }
  }
  
  // Save sheet data to JSON for inspection
  const sheetData = {
    name: sheetName,
    headers: data[0] || [],
    rowCount: data.length,
    sampleRows: data.slice(0, 5)
  };
  
  fs.writeFileSync(
    `sheet-${sheetName}.json`, 
    JSON.stringify(sheetData, null, 2)
  );
});

console.log('\n=== Analysis Complete ===');
console.log('Individual sheet data saved to sheet-*.json files');