const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const Notification = require('../models/Notification');
const User = require('../models/User');

const router = express.Router();

// @desc    Test notification creation directly
// @route   POST /api/test-notifications/create-test
// @access  Public (for testing)
router.post('/create-test', asyncHandler(async (req, res) => {
      try {
    console.log('🧪 Starting notification creation test...');
    
    // Get a test user (first admin user)
    const testUser = await User.findOne({ role: 'admin' });
    if (!testUser) {
      throw new Error('No admin user found for testing');
    }
    console.log(`👤 Test user: ${testUser.firstName} ${testUser.lastName} (${testUser._id})`);
    
    // Create a simple test notification
    console.log('📝 Creating test notification...');
    const notification = await Notification.create({
      user: testUser._id,
      message: 'TEST: Direct notification creation within server context'
    });
    
    console.log(`✅ Notification created successfully!`);
    console.log(`   ID: ${notification._id}`);
    console.log(`   Message: ${notification.message}`);
    console.log(`   User: ${notification.user}`);
    console.log(`   Type: ${notification.type}`);
    console.log(`   Priority: ${notification.priority}`);
    
    // Query it back
    const found = await Notification.findById(notification._id);
    console.log(`🔍 Found notification: ${found ? 'YES' : 'NO'}`);
    
    // Check total notifications for user
    const userNotifications = await Notification.find({ user: testUser._id });
    console.log(`📊 Total notifications for user: ${userNotifications.length}`);
    
    res.json({
      success: true,
      message: 'Test notification created successfully',
      data: {
        notificationId: notification._id,
        notificationMessage: notification.message,
        notificationType: notification.type,
        notificationPriority: notification.priority,
        foundById: !!found,
        totalUserNotifications: userNotifications.length
      }
    });
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    if (error.errors) {
      console.error('   Validation errors:');
      Object.keys(error.errors).forEach(key => {
        console.error(`     ${key}: ${error.errors[key].message}`);
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Test notification creation failed',
      error: error.message,
      validationErrors: error.errors
    });
  }
}));

// @desc    Test workflow alert generation
// @route   POST /api/test-notifications/trigger-workflow-alerts
// @access  Public (for testing)
router.post('/trigger-workflow-alerts', asyncHandler(async (req, res) => {
  try {
    console.log('🧪 Testing workflow alert generation...');
    
    // Import the AlertSchedulerService
    const AlertSchedulerService = require('../services/AlertSchedulerService');
    
    // Trigger manual workflow check
    console.log('⚡ Triggering manual workflow alert check...');
    await AlertSchedulerService.triggerManualCheck();
    
    // Check total notifications after trigger
    const totalNotifications = await Notification.countDocuments();
    console.log(`📊 Total notifications after workflow check: ${totalNotifications}`);
    
    // Get recent workflow notifications
    const recentWorkflowNotifications = await Notification.find({
      type: { $in: ['workflow_step_warning', 'workflow_step_urgent', 'workflow_step_overdue'] },
      createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) } // Last 2 minutes
    }).sort({ createdAt: -1 }).limit(10);
    
    console.log(`🔍 Recent workflow notifications: ${recentWorkflowNotifications.length}`);
    
    res.json({
      success: true,
      message: 'Workflow alert check triggered successfully',
      data: {
        totalNotifications,
        recentWorkflowNotifications: recentWorkflowNotifications.length,
        recentNotifications: recentWorkflowNotifications.map(n => ({
          id: n._id,
          type: n.type,
          message: n.message,
          user: n.user,
          createdAt: n.createdAt
        }))
      }
    });
    
  } catch (error) {
    console.error('❌ Workflow alert test error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Workflow alert test failed',
      error: error.message
    });
  }
}));

// @desc    Test workflow alert detection logic
// @route   POST /api/test-notifications/debug-workflow-alerts
// @access  Public (for testing)
router.post('/debug-workflow-alerts', asyncHandler(async (req, res) => {
  try {
    console.log('🧪 Debugging workflow alert detection...');
    
    // Import models
    const ProjectWorkflow = require('../models/ProjectWorkflow');
    const User = require('../models/User');
    
    // Get all workflows
    const workflows = await ProjectWorkflow.find({}).populate('project', 'projectName');
    console.log(`📊 Total workflows found: ${workflows.length}`);
    
    // Check each workflow for alert requirements
    const workflowDetails = [];
    
    for (const workflow of workflows) {
      console.log(`\n🔍 Checking workflow: ${workflow.project?.projectName || 'Unknown Project'}`);
      
      // Get steps requiring alerts
      const alertSteps = workflow.getStepsRequiringAlerts();
      console.log(`   Steps requiring alerts: ${alertSteps.length}`);
      
      if (alertSteps.length > 0) {
        for (const step of alertSteps) {
          console.log(`   - Step: ${step.name}`);
          console.log(`     Status: ${step.status}`);
          console.log(`     Due Date: ${step.dueDate}`);
          console.log(`     Alert Days: ${step.alertDays || 'none'}`);
          console.log(`     Overdue Intervals: ${step.overdueIntervals || 'none'}`);
          
          // Check if step needs alerts
          const now = new Date();
          const isOverdue = step.dueDate && new Date(step.dueDate) < now;
          const daysUntilDue = step.dueDate ? Math.ceil((new Date(step.dueDate) - now) / (1000 * 60 * 60 * 24)) : null;
          
          console.log(`     Days until due: ${daysUntilDue}`);
          console.log(`     Is overdue: ${isOverdue}`);
          console.log(`     Should alert: ${step.alertDays && daysUntilDue <= step.alertDays}`);
        }
      }
      
      workflowDetails.push({
        projectName: workflow.project?.projectName || 'Unknown Project',
        workflowId: workflow._id,
        alertSteps: alertSteps.length,
        steps: alertSteps.map(s => ({
          name: s.name,
          status: s.status,
          dueDate: s.dueDate,
          alertDays: s.alertDays,
          overdueIntervals: s.overdueIntervals,
          daysUntilDue: s.dueDate ? Math.ceil((new Date(s.dueDate) - new Date()) / (1000 * 60 * 60 * 24)) : null,
          isOverdue: s.dueDate && new Date(s.dueDate) < new Date()
        }))
      });
    }
    
    // Check users by role
    const users = await User.find({}).select('firstName lastName email role');
    const usersByRole = {};
    users.forEach(user => {
      if (!usersByRole[user.role]) usersByRole[user.role] = [];
      usersByRole[user.role].push({
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email
      });
    });
    
    console.log('\n👥 Users by role:');
    Object.keys(usersByRole).forEach(role => {
      console.log(`   ${role}: ${usersByRole[role].length} users`);
    });
    
    res.json({
      success: true,
      message: 'Workflow alert debug completed',
      data: {
        totalWorkflows: workflows.length,
        workflowDetails,
        usersByRole,
        summary: {
          workflowsWithAlerts: workflowDetails.filter(w => w.alertSteps > 0).length,
          totalAlertSteps: workflowDetails.reduce((sum, w) => sum + w.alertSteps, 0),
          overdueSteps: workflowDetails.reduce((sum, w) => sum + w.steps.filter(s => s.isOverdue).length, 0)
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Workflow debug error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Workflow debug failed',
      error: error.message
    });
  }
}));

module.exports = router; 