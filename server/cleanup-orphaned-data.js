const mongoose = require('mongoose');
const Project = require('./models/Project');
const ProjectWorkflow = require('./models/ProjectWorkflow');
const Notification = require('./models/Notification');
const Activity = require('./models/Activity');
const Customer = require('./models/Customer');
require('dotenv').config();

async function cleanupOrphanedData() {
  try {
    console.log('🔍 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected! Starting cleanup...');

    // Get all valid project IDs
    const validProjects = await Project.find({}).select('_id projectName');
    const validProjectIds = validProjects.map(p => p._id.toString());
    
    console.log(`📋 Found ${validProjects.length} valid projects`);
    validProjects.forEach(p => console.log(`   - ${p.projectName} (${p._id})`));

    // 1. Clean up orphaned workflows
    console.log('\n🧹 Cleaning up orphaned workflows...');
    const orphanedWorkflows = await ProjectWorkflow.find({
      project: { $nin: validProjectIds }
    });
    
    console.log(`Found ${orphanedWorkflows.length} orphaned workflows`);
    if (orphanedWorkflows.length > 0) {
      const deleteResult = await ProjectWorkflow.deleteMany({
        project: { $nin: validProjectIds }
      });
      console.log(`✅ Deleted ${deleteResult.deletedCount} orphaned workflows`);
    }

    // 2. Clean up orphaned notifications
    console.log('\n🧹 Cleaning up orphaned notifications...');
    const orphanedNotifications = await Notification.find({
      relatedProject: { $nin: validProjectIds }
    });
    
    console.log(`Found ${orphanedNotifications.length} orphaned notifications`);
    if (orphanedNotifications.length > 0) {
      const deleteResult = await Notification.deleteMany({
        relatedProject: { $nin: validProjectIds }
      });
      console.log(`✅ Deleted ${deleteResult.deletedCount} orphaned notifications`);
    }

    // 3. Clean up orphaned activities
    console.log('\n🧹 Cleaning up orphaned activities...');
    const orphanedActivities = await Activity.find({
      projectId: { $nin: validProjectIds }
    });
    
    console.log(`Found ${orphanedActivities.length} orphaned activities`);
    if (orphanedActivities.length > 0) {
      const deleteResult = await Activity.deleteMany({
        projectId: { $nin: validProjectIds }
      });
      console.log(`✅ Deleted ${deleteResult.deletedCount} orphaned activities`);
    }

    // 4. Clean up any remaining task-related collections
    console.log('\n🧹 Checking for other collections with orphaned data...');
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    for (const collection of collections) {
      const collectionName = collection.name;
      
      // Check for task-related collections
      if (collectionName.toLowerCase().includes('task') || 
          collectionName.toLowerCase().includes('alert')) {
        
        console.log(`🔍 Checking collection: ${collectionName}`);
        const docCount = await db.collection(collectionName).countDocuments();
        
        if (docCount > 0) {
          console.log(`   Found ${docCount} documents in ${collectionName}`);
          
          // Check if documents have projectId field
          const sampleDoc = await db.collection(collectionName).findOne({});
          if (sampleDoc && (sampleDoc.projectId || sampleDoc.project)) {
            
            const projectField = sampleDoc.projectId ? 'projectId' : 'project';
            const orphanedCount = await db.collection(collectionName).countDocuments({
              [projectField]: { $nin: validProjectIds }
            });
            
            if (orphanedCount > 0) {
              console.log(`   🗑️ Deleting ${orphanedCount} orphaned documents from ${collectionName}`);
              const result = await db.collection(collectionName).deleteMany({
                [projectField]: { $nin: validProjectIds }
              });
              console.log(`   ✅ Deleted ${result.deletedCount} documents`);
            }
          }
        }
      }
    }

    // 5. Clean up customers without projects (optional)
    console.log('\n🧹 Checking for customers without projects...');
    const customersWithoutProjects = await Customer.find({
      associatedProjects: { $size: 0 }
    });
    
    console.log(`Found ${customersWithoutProjects.length} customers without projects`);
    if (customersWithoutProjects.length > 0) {
      customersWithoutProjects.forEach(c => console.log(`   - ${c.name} (${c.email})`));
      
      // Note: We don't auto-delete these as they might be legitimate prospects
      console.log('ℹ️ Not auto-deleting customers without projects - they might be legitimate prospects');
    }

    // 6. Verify data integrity
    console.log('\n🔍 Verifying data integrity...');
    const finalWorkflowCount = await ProjectWorkflow.countDocuments();
    const finalNotificationCount = await Notification.countDocuments();
    const finalActivityCount = await Activity.countDocuments();
    const finalProjectCount = await Project.countDocuments();
    const finalCustomerCount = await Customer.countDocuments();

    console.log('\n📊 Final data counts:');
    console.log(`   Projects: ${finalProjectCount}`);
    console.log(`   Workflows: ${finalWorkflowCount}`);
    console.log(`   Customers: ${finalCustomerCount}`);
    console.log(`   Activities: ${finalActivityCount}`);
    console.log(`   Notifications: ${finalNotificationCount}`);

    // 7. Show remaining collections
    console.log('\n📄 Remaining collections:');
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      if (count > 0) {
        console.log(`   ${collection.name}: ${count} documents`);
      }
    }

    console.log('\n✅ Cleanup completed successfully!');
    console.log('🔄 Please restart the backend server to apply the new alert generation logic.');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

cleanupOrphanedData(); 