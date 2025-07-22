const mongoose = require('mongoose');
const Project = require('./models/Project');
const Customer = require('./models/Customer');

async function fixProjectCustomers() {
  try {
    console.log('🔧 Connecting to database...');
    
    await mongoose.connect('mongodb+srv://prospect_finder:Toobs3560@cluster0.s4mm3b5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
    
    console.log('✅ Connected! Fixing project customers...');
    
    // Get all projects
    const projects = await Project.find({}).lean();
    console.log(`📋 Found ${projects.length} projects`);
    
    let fixedCount = 0;
    
    for (const project of projects) {
      console.log(`\n🔍 Checking project: ${project.projectName || project.name}`);
      
      // Check if project has a customer reference
      if (!project.customer) {
        console.log('   ❌ No customer reference - creating default customer');
        
        // Create a default customer
        const defaultCustomer = await Customer.create({
          name: `Customer for ${project.projectName || project.name}`,
          email: `customer${project._id}@example.com`,
          phone: '5555550123',
          address: project.address || '123 Default Address'
        });
        
        // Update project with customer reference
        await Project.findByIdAndUpdate(project._id, {
          customer: defaultCustomer._id
        });
        
        console.log(`   ✅ Created customer: ${defaultCustomer.name}`);
        fixedCount++;
      } else {
        // Check if customer still exists
        const customer = await Customer.findById(project.customer);
        if (!customer) {
          console.log('   ❌ Customer reference broken - creating new customer');
          
          const newCustomer = await Customer.create({
            name: `Customer for ${project.projectName || project.name}`,
            email: `customer${project._id}@example.com`,
            phone: '5555550123',
            address: project.address || '123 Default Address'
          });
          
          await Project.findByIdAndUpdate(project._id, {
            customer: newCustomer._id
          });
          
          console.log(`   ✅ Created replacement customer: ${newCustomer.name}`);
          fixedCount++;
        } else {
          console.log(`   ✅ Customer exists: ${customer.name}`);
        }
      }
      
      // Ensure project has all required fields
      const updateFields = {};
      
      if (!project.address) {
        updateFields.address = '123 Default Address, City, State';
      }
      if (!project.budget) {
        updateFields.budget = 50000;
      }
      if (!project.startDate) {
        updateFields.startDate = new Date();
      }
      if (!project.endDate) {
        updateFields.endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }
      if (!project.priority) {
        updateFields.priority = 'Medium';
      }
      if (!project.description) {
        updateFields.description = `${project.projectType || 'General'} project for ${project.projectName || project.name}`;
      }
      
      if (Object.keys(updateFields).length > 0) {
        await Project.findByIdAndUpdate(project._id, updateFields);
        console.log(`   ✅ Added missing fields: ${Object.keys(updateFields).join(', ')}`);
      }
    }
    
    console.log(`\n🎉 Project customer fix complete!`);
    console.log(`   📊 Projects checked: ${projects.length}`);
    console.log(`   ✅ Customers fixed: ${fixedCount}`);
    
  } catch (error) {
    console.error('❌ Error fixing project customers:', error);
  } finally {
    mongoose.connection.close();
  }
}

fixProjectCustomers(); 