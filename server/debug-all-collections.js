const mongoose = require('mongoose');

async function debugAllCollections() {
  try {
    console.log('🔍 Connecting to database...');
    
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://prospect_finder:Toobs3560@cluster0.s4mm3b5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected! Debugging all collections...');
    
    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📋 Total collections: ${collections.length}`);
    
    for (const collection of collections) {
      console.log(`\n📄 Collection: ${collection.name}`);
      const count = await mongoose.connection.db.collection(collection.name).countDocuments();
      console.log(`   Documents: ${count}`);
      
      if (count > 0 && count < 20) {
        const sample = await mongoose.connection.db.collection(collection.name).findOne();
        console.log(`   Sample document keys: ${Object.keys(sample).join(', ')}`);
      }
    }
    
    // Check specific collections that might contain alerts
    const alertCollections = ['notifications', 'alerts', 'workflow_alerts'];
    
    for (const collName of alertCollections) {
      try {
        const coll = mongoose.connection.db.collection(collName);
        const count = await coll.countDocuments();
        console.log(`\n🔍 ${collName}: ${count} documents`);
        
        if (count > 0) {
          const docs = await coll.find({}).limit(3).toArray();
          docs.forEach((doc, i) => {
            console.log(`   Doc ${i+1}: ${JSON.stringify(doc, null, 2)}`);
          });
        }
      } catch (err) {
        console.log(`   Collection ${collName} does not exist`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error debugging collections:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the debug
debugAllCollections(); 