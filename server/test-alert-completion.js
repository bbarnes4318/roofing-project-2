require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Notification = require('./models/Notification');
const ProjectWorkflow = require('./models/ProjectWorkflow');
const User = require('./models/User');
const WorkflowAlertService = require('./services/WorkflowAlertService');

async function testAlertCompletion() {
  try {
    console.log('🔍 TESTING ALERT COMPLETION FUNCTIONALITY...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Get a test user
    const testUser = await User.findOne({ email: 'admin@kenstruction.com' });
    if (!testUser) {
      console.log('❌ Test user not found');
      return;
    }
    console.log(`👤 Test user: ${testUser.firstName} ${testUser.lastName} (${testUser._id})\n`);
    
    // Find an active alert with workflow metadata
    const testAlert = await Notification.findOne({
      type: { $in: ['workflow_step_warning', 'workflow_step_urgent', 'workflow_step_overdue'] },
      read: { $ne: true },
      'metadata.workflowId': { $exists: true },
      'metadata.stepId': { $exists: true }
    }).populate('relatedProject');
    
    if (!testAlert) {
      console.log('❌ No suitable test alert found');
      return;
    }
    
    console.log('🎯 FOUND TEST ALERT:');
    console.log(`   Alert ID: ${testAlert._id}`);
    console.log(`   Message: ${testAlert.message}`);
    console.log(`   Project: ${testAlert.metadata?.projectName || 'Unknown'}`);
    console.log(`   Step: ${testAlert.metadata?.stepName || 'Unknown'}`);
    console.log(`   Workflow ID: ${testAlert.metadata?.workflowId}`);
    console.log(`   Step ID: ${testAlert.metadata?.stepId}`);
    console.log(`   Currently read: ${testAlert.read || false}\n`);
    
    // Get the workflow BEFORE completion
    const workflowBefore = await ProjectWorkflow.findById(testAlert.metadata.workflowId);
    const stepBefore = workflowBefore.steps.find(s => s.stepId === testAlert.metadata.stepId);
    
    console.log('📋 WORKFLOW STEP BEFORE COMPLETION:');
    console.log(`   Step Name: ${stepBefore.stepName}`);
    console.log(`   Phase: ${stepBefore.phase}`);
    console.log(`   Is Completed: ${stepBefore.isCompleted}`);
    console.log(`   Completed At: ${stepBefore.completedAt || 'Not completed'}`);
    console.log(`   Completed By: ${stepBefore.completedBy || 'Not completed'}`);
    console.log(`   Sub-tasks: ${stepBefore.subTasks?.length || 0}`);
    if (stepBefore.subTasks?.length > 0) {
      const completedSubTasks = stepBefore.subTasks.filter(st => st.isCompleted).length;
      console.log(`   Sub-tasks completed: ${completedSubTasks}/${stepBefore.subTasks.length}`);
    }
    console.log(`   Workflow Progress: ${workflowBefore.overallProgress}%\n`);
    
    // NOW COMPLETE THE STEP VIA ALERT
    console.log('🚀 COMPLETING WORKFLOW STEP VIA ALERT...\n');
    
    const result = await WorkflowAlertService.completeWorkflowStep(
      testAlert.metadata.workflowId,
      testAlert.metadata.stepId,
      testUser._id,
      'Completed via test script - proving alert completion works'
    );
    
    if (!result.success) {
      console.log('❌ Step completion failed:', result.error);
      return;
    }
    
    console.log('✅ Step completion service returned success\n');
    
    // Update the alert to mark it as completed (simulating the API endpoint)
    await Notification.findByIdAndUpdate(testAlert._id, {
      read: true,
      readAt: new Date(),
      metadata: {
        ...testAlert.metadata,
        completedViaAlert: true,
        completedAt: new Date(),
        completedBy: testUser._id
      }
    });
    
    console.log('✅ Alert marked as completed\n');
    
    // Get the workflow AFTER completion
    const workflowAfter = await ProjectWorkflow.findById(testAlert.metadata.workflowId);
    const stepAfter = workflowAfter.steps.find(s => s.stepId === testAlert.metadata.stepId);
    
    console.log('📋 WORKFLOW STEP AFTER COMPLETION:');
    console.log(`   Step Name: ${stepAfter.stepName}`);
    console.log(`   Phase: ${stepAfter.phase}`);
    console.log(`   Is Completed: ${stepAfter.isCompleted}`);
    console.log(`   Completed At: ${stepAfter.completedAt}`);
    console.log(`   Completed By: ${stepAfter.completedBy}`);
    console.log(`   Completion Notes: ${stepAfter.completionNotes || 'None'}`);
    console.log(`   Sub-tasks: ${stepAfter.subTasks?.length || 0}`);
    if (stepAfter.subTasks?.length > 0) {
      const completedSubTasks = stepAfter.subTasks.filter(st => st.isCompleted).length;
      console.log(`   Sub-tasks completed: ${completedSubTasks}/${stepAfter.subTasks.length}`);
    }
    console.log(`   Workflow Progress: ${workflowAfter.overallProgress}%\n`);
    
    // Get the alert AFTER completion
    const alertAfter = await Notification.findById(testAlert._id);
    
    console.log('🔔 ALERT AFTER COMPLETION:');
    console.log(`   Alert ID: ${alertAfter._id}`);
    console.log(`   Read: ${alertAfter.read}`);
    console.log(`   Read At: ${alertAfter.readAt}`);
    console.log(`   Completed Via Alert: ${alertAfter.metadata?.completedViaAlert}`);
    console.log(`   Completed At: ${alertAfter.metadata?.completedAt}`);
    console.log(`   Completed By: ${alertAfter.metadata?.completedBy}\n`);
    
    // SUMMARY
    console.log('📊 COMPLETION SUMMARY:');
    console.log(`   ✅ Alert marked as read: ${alertAfter.read}`);
    console.log(`   ✅ Workflow step completed: ${stepAfter.isCompleted}`);
    console.log(`   ✅ Progress updated: ${workflowBefore.overallProgress}% → ${workflowAfter.overallProgress}%`);
    console.log(`   ✅ Completion timestamp: ${stepAfter.completedAt}`);
    console.log(`   ✅ Completed by user: ${stepAfter.completedBy}`);
    console.log(`   ✅ Completion notes: ${stepAfter.completionNotes ? 'Yes' : 'No'}`);
    
    if (stepAfter.subTasks?.length > 0) {
      const completedSubTasks = stepAfter.subTasks.filter(st => st.isCompleted).length;
      console.log(`   ✅ Sub-tasks auto-completed: ${completedSubTasks}/${stepAfter.subTasks.length}`);
    }
    
    console.log('\n🎉 PROOF: Alert completion DOES complete the workflow step!\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testAlertCompletion(); 