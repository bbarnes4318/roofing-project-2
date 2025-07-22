require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Notification = require('./models/Notification');

async function fixExistingAlertMessages() {
  try {
    console.log('🔧 FIXING EXISTING ALERT MESSAGES...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Get action guidance function (copied from WorkflowAlertService)
    const getActionGuidance = (stepName) => {
      const stepGuidanceMap = {
        'Input Customer Information': 'Gather and enter customer contact details, project requirements, and preferences',
        'Complete Questions to Ask Checklist': 'Review and complete the initial customer questionnaire',
        'Input Lead Property Information': 'Document property details, measurements, and site conditions',
        'Assign A Project Manager': 'Select and assign the appropriate project manager for this job',
        'Schedule Initial Inspection': 'Contact customer to schedule the initial site inspection',
        'Site Inspection': 'Conduct thorough site inspection and document findings',
        'Write Estimate': 'Prepare detailed cost estimate based on inspection and requirements',
        'Insurance Process': 'Submit insurance claims and coordinate with adjuster if applicable',
        'Agreement Preparation': 'Prepare and review contract documents for customer approval',
        'Agreement Signing': 'Schedule contract signing appointment with customer',
        'Administrative Setup': 'Set up project files, permits, and administrative requirements',
        'Pre-Job Actions': 'Complete all pre-construction activities and permit approvals',
        'Prepare for Production': 'Order materials, schedule crew, and prepare for construction start',
        'Verify Labor Orders': 'Confirm crew scheduling and labor assignments',
        'Verify Material Orders': 'Ensure all materials are ordered and delivery is scheduled',
        'Installation Process': 'Begin construction work according to project specifications',
        'Quality Check': 'Perform quality inspection and address any issues',
        'Daily Progress Documentation': 'Update project progress and document daily activities',
        'Customer Updates': 'Communicate progress updates to the customer',
        'Subcontractor Coordination': 'Coordinate with subcontractors and schedule work',
        'Create Supplement in Xactimate': 'Prepare insurance supplement documentation',
        'Insurance Follow-up': 'Follow up with insurance company on claim status',
        'Final Inspection': 'Conduct final walkthrough and address any punch list items',
        'Financial Processing': 'Process final invoicing and payment collection',
        'AR Follow-Up': 'Follow up on outstanding payment balances',
        'Project Closeout': 'Complete all closeout procedures and documentation',
        'Warranty Registration': 'Register warranty information and provide to customer'
      };
      
      return stepGuidanceMap[stepName] || 'Complete this task to proceed with the project';
    };
    
    // Find all workflow alerts with the old format
    const alertsToFix = await Notification.find({
      type: { $in: ['workflow_step_warning', 'workflow_step_urgent', 'workflow_step_overdue'] },
      message: { $regex: /Responsible:/ }
    });
    
    console.log(`📋 Found ${alertsToFix.length} alerts with old message format\n`);
    
    let fixedCount = 0;
    
    for (const alert of alertsToFix) {
      try {
        const stepName = alert.metadata?.stepName;
        const projectName = alert.metadata?.projectName;
        
        if (!stepName || !projectName) {
          console.log(`⚠️  Skipping alert ${alert._id} - missing stepName or projectName`);
          continue;
        }
        
        // Extract timing info from old message
        let newMessage = '';
        const actionGuidance = getActionGuidance(stepName);
        
        if (alert.message.includes('is due in') && alert.message.includes('day')) {
          const daysMatch = alert.message.match(/due in (\d+) days?/);
          const days = daysMatch ? daysMatch[1] : '?';
          newMessage = `${stepName} for ${projectName} is due in ${days} day${days !== '1' ? 's' : ''}. ${actionGuidance}`;
        } else if (alert.message.includes('is due TODAY')) {
          newMessage = `${stepName} for ${projectName} is due TODAY! ${actionGuidance}`;
        } else if (alert.message.includes('overdue')) {
          const daysMatch = alert.message.match(/is (\d+) days? overdue/);
          const days = daysMatch ? daysMatch[1] : '?';
          newMessage = `${stepName} for ${projectName} is ${days} day${days !== '1' ? 's' : ''} overdue! ${actionGuidance}`;
        } else {
          newMessage = `${stepName} for ${projectName} requires attention. ${actionGuidance}`;
        }
        
        // Update the alert
        await Notification.findByIdAndUpdate(alert._id, {
          message: newMessage
        });
        
        console.log(`✅ Fixed alert: ${stepName} for ${projectName}`);
        fixedCount++;
        
      } catch (error) {
        console.error(`❌ Error fixing alert ${alert._id}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Successfully updated ${fixedCount} alerts!`);
    console.log('💡 All alerts now have helpful action guidance instead of "Responsible: Office"');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixExistingAlertMessages(); 