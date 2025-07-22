const mongoose = require('mongoose');
const express = require('express');
const Project = require('./models/Project');
const Customer = require('./models/Customer');
const User = require('./models/User');
const ProjectWorkflow = require('./models/ProjectWorkflow');

async function testProjectAPI() {
  try {
    console.log('🔧 Connecting to database...');
    
    await mongoose.connect('mongodb+srv://prospect_finder:Toobs3560@cluster0.s4mm3b5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
    
    console.log('✅ Connected! Testing project API...');
    
    // Test 1: Get all projects without population first
    console.log('\n📋 TEST 1: Getting all projects...');
    const projects = await Project.find({ archived: { $ne: true } }).lean();
    
    console.log(`   ✅ Found ${projects.length} non-archived projects`);
    
    if (projects.length > 0) {
      const sampleProject = projects[0];
      console.log('   📊 Sample project structure:');
      console.log(`      - ID: ${sampleProject._id}`);
      console.log(`      - Name: ${sampleProject.projectName || sampleProject.name}`);
      console.log(`      - Type: ${sampleProject.projectType || sampleProject.type}`);
      console.log(`      - Status: ${sampleProject.status}`);
      console.log(`      - Customer ID: ${sampleProject.customer || 'MISSING'}`);
      console.log(`      - Address: ${sampleProject.address || 'MISSING'}`);
      console.log(`      - Budget: ${sampleProject.budget || 'MISSING'}`);
      console.log(`      - Start Date: ${sampleProject.startDate || 'MISSING'}`);
      console.log(`      - End Date: ${sampleProject.endDate || 'MISSING'}`);
      
      // Test 2: Check if customer exists
      if (sampleProject.customer) {
        console.log('\n📋 TEST 2: Checking customer reference...');
        const customer = await Customer.findById(sampleProject.customer).lean();
        if (customer) {
          console.log('   ✅ Customer found');
          console.log(`      - Customer name: ${customer.name}`);
        } else {
          console.log('   ❌ Customer not found - creating one');
          const newCustomer = await Customer.create({
            name: 'Generated Customer',
            email: 'generated@example.com',
            phone: '555-0123',
            address: '123 Generated Street'
          });
          
          await Project.findByIdAndUpdate(sampleProject._id, {
            customer: newCustomer._id
          });
          console.log('   ✅ New customer created and linked');
        }
      } else {
        console.log('\n📋 TEST 2: Creating customer for project...');
        const newCustomer = await Customer.create({
          name: 'Generated Customer',
          email: 'generated@example.com',
          phone: '555-0123',
          address: '123 Generated Street'
        });
        
        await Project.findByIdAndUpdate(sampleProject._id, {
          customer: newCustomer._id
        });
        console.log('   ✅ New customer created and linked');
      }
      
      // Test 3: Get project workflow
      console.log('\n📋 TEST 3: Getting project workflow...');
      const workflow = await ProjectWorkflow.findOne({ project: sampleProject._id }).lean();
      
      if (workflow) {
        console.log('   ✅ Workflow found');
        console.log(`      - Steps: ${workflow.steps ? workflow.steps.length : 0}`);
        console.log(`      - Alerts: ${workflow.alerts ? workflow.alerts.length : 0}`);
        console.log(`      - Status: ${workflow.status || 'MISSING'}`);
      } else {
        console.log('   ❌ No workflow found for project');
      }
      
      // Test 4: Add missing fields
      console.log('\n📋 TEST 4: Adding missing fields...');
      const updateFields = {};
      
      if (!sampleProject.address) {
        updateFields.address = '123 Default Address, City, State';
      }
      if (!sampleProject.budget) {
        updateFields.budget = 50000;
      }
      if (!sampleProject.startDate) {
        updateFields.startDate = new Date();
      }
      if (!sampleProject.endDate) {
        updateFields.endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      }
      
      if (Object.keys(updateFields).length > 0) {
        await Project.findByIdAndUpdate(sampleProject._id, updateFields);
        console.log(`   ✅ Updated project with missing fields: ${Object.keys(updateFields).join(', ')}`);
      } else {
        console.log('   ✅ All fields are present');
      }
    }
    
    console.log('\n🎉 Project API test complete!');
    
  } catch (error) {
    console.error('❌ Error testing project API:', error);
  } finally {
    mongoose.connection.close();
  }
}

testProjectAPI(); 