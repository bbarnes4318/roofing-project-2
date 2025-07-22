const mongoose = require('mongoose');
const User = require('./models/User');
const Project = require('./models/Project');
const ProjectWorkflow = require('./models/ProjectWorkflow');

async function fixDataIssues() {
  try {
    console.log('🔍 Connecting to database...');
    
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://prospect_finder:Toobs3560@cluster0.s4mm3b5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected! Fixing data issues...');
    
    // Step 1: Fix user roles
    console.log('\n🔧 Fixing user roles...');
    
    await User.findOneAndUpdate(
      { firstName: 'Sarah' },
      { role: 'admin' }
    );
    console.log('✅ Updated Sarah to admin');
    
    await User.findOneAndUpdate(
      { firstName: 'John' },
      { role: 'manager' }
    );
    console.log('✅ Updated John to manager');
    
    await User.findOneAndUpdate(
      { firstName: 'Mike' },
      { role: 'foreman' }
    );
    console.log('✅ Updated Mike to foreman');
    
    // Step 2: Fix project names (get from the projects collection)
    console.log('\n🔧 Fixing project names...');
    const projects = await mongoose.connection.db.collection('projects').find({}).toArray();
    
    for (const project of projects) {
      if (project.name && !project.projectName) {
        await Project.findByIdAndUpdate(project._id, {
          projectName: project.name
        });
        console.log(`✅ Updated project ${project._id} with name: ${project.name}`);
      }
    }
    
    // Step 3: Update workflow team assignments
    console.log('\n🔧 Updating workflow team assignments...');
    const users = await User.find({});
    const adminUsers = users.filter(u => u.role === 'admin');
    const managerUsers = users.filter(u => u.role === 'manager');
    const foremanUsers = users.filter(u => u.role === 'foreman');
    
    const workflows = await ProjectWorkflow.find({});
    
    for (const workflow of workflows) {
      const teamAssignments = {
        office: [...adminUsers.map(u => u._id), ...managerUsers.map(u => u._id)],
        administration: adminUsers.map(u => u._id),
        project_manager: managerUsers.map(u => u._id),
        field_director: foremanUsers.map(u => u._id),
        roof_supervisor: managerUsers.map(u => u._id)
      };
      
      await ProjectWorkflow.findByIdAndUpdate(workflow._id, {
        teamAssignments: teamAssignments
      });
      
      console.log(`✅ Updated team assignments for workflow ${workflow._id}`);
    }
    
    console.log('\n🎉 Data fixes complete!');
    
    // Verify the fixes
    const updatedUsers = await User.find({});
    console.log('\n👥 Updated users:');
    updatedUsers.forEach(user => {
      console.log(`   - ${user.firstName} ${user.lastName} (${user.role})`);
    });
    
    const updatedProjects = await Project.find({});
    console.log('\n🏗️ Updated projects:');
    updatedProjects.forEach(project => {
      console.log(`   - ${project.projectName || project.name || 'Unnamed'} (ID: ${project._id})`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing data issues:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the fix
fixDataIssues(); 