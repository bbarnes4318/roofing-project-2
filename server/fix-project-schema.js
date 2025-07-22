const mongoose = require('mongoose');
const Project = require('./models/Project');

async function fixProjectSchema() {
  try {
    console.log('🔧 Connecting to database...');
    
    await mongoose.connect('mongodb+srv://prospect_finder:Toobs3560@cluster0.s4mm3b5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
    
    console.log('✅ Connected! Fixing project schema...');
    
    // First, let's see what we have
    const projects = await mongoose.connection.db.collection('projects').find({}).toArray();
    console.log(`📋 Found ${projects.length} projects in database`);
    
    if (projects.length > 0) {
      console.log('🔍 Sample project fields:', Object.keys(projects[0]));
    }
    
    // Update projects to fix schema issues
    console.log('🔧 Updating project schemas...');
    
    // Add archived field to all projects that don't have it
    const addArchivedResult = await mongoose.connection.db.collection('projects').updateMany(
      { archived: { $exists: false } },
      { $set: { archived: false } }
    );
    console.log(`✅ Added 'archived' field to ${addArchivedResult.modifiedCount} projects`);
    
    // Rename old field names to new ones
    const renameResult = await mongoose.connection.db.collection('projects').updateMany(
      {},
      { 
        $rename: { 
          name: 'projectName',
          type: 'projectType'
        } 
      }
    );
    console.log(`✅ Renamed fields in ${renameResult.modifiedCount} projects`);
    
    // Verify the updates
    const updatedProjects = await Project.find({});
    console.log(`📋 Total projects after update: ${updatedProjects.length}`);
    
    if (updatedProjects.length > 0) {
      console.log('✅ Sample updated project:');
      console.log(`   - Project Name: ${updatedProjects[0].projectName}`);
      console.log(`   - Project Type: ${updatedProjects[0].projectType}`);
      console.log(`   - Archived: ${updatedProjects[0].archived}`);
    }
    
    console.log('🎉 Schema fix complete!');
    
  } catch (error) {
    console.error('❌ Error fixing project schema:', error);
  } finally {
    mongoose.connection.close();
  }
}

fixProjectSchema(); 