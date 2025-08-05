const { Client } = require('pg');

async function checkAvailableDatabases() {
  // Try connecting to defaultdb first
  const configs = [
    process.env.DATABASE_URL,
    process.env.DATABASE_URL.replace('/defaultdb', '/kenstruction')
  ];
  
  for (const [index, connectionString] of configs.entries()) {
    const client = new Client({ connectionString });
    
    try {
      console.log(`\n🔍 Testing connection ${index + 1}:`);
      console.log(`   ${connectionString.replace(/AVNS_[^@]+/, 'AVNS_***')}`);
      
      await client.connect();
      console.log('✅ Connection successful!');
      
      const dbResult = await client.query('SELECT current_database();');
      console.log(`📍 Connected to database: ${dbResult.rows[0].current_database}`);
      
      // Try to list a few tables to see if schema exists
      const tableResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        LIMIT 5;
      `);
      
      if (tableResult.rows.length > 0) {
        console.log('📋 Found tables:');
        tableResult.rows.forEach(row => {
          console.log(`  - ${row.table_name}`);
        });
      } else {
        console.log('📋 No tables found (empty database)');
      }
      
      await client.end();
      return connectionString; // Return successful connection
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      await client.end();
    }
  }
  
  console.log('\n❌ No successful connections found');
}

checkAvailableDatabases();