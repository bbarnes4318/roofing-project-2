const cron = require('node-cron');
const { prisma } = require('../config/prisma');
const hasDatabaseUrl = !!process.env.DATABASE_URL;

class AlertSchedulerService {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
  }

  // Start the alert scheduler
  start() {
    if (this.isRunning) {
      console.log('⚠️ Alert scheduler is already running');
      return;
    }

    if (!hasDatabaseUrl) {
      console.warn('⚠️ Alert scheduler disabled: DATABASE_URL not set');
      return;
    }

    // Run every 5 minutes to check for workflow alerts
    this.cronJob = cron.schedule('*/5 * * * *', async () => {
      try {
        await this.checkWorkflowAlerts();
      } catch (error) {
        console.error('❌ Error in alert scheduler:', error);
      }
    }, {
      scheduled: false
    });

    this.cronJob.start();
    this.isRunning = true;
    console.log('🚀 Alert scheduler started - checking workflow deadlines every 5 minutes');
    
    // Run initial check
    this.checkWorkflowAlerts();
  }

  // Stop the alert scheduler
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.isRunning = false;
      console.log('⏹️ Alert scheduler stopped');
    }
  }

  // Main method to check all workflow alerts
  async checkWorkflowAlerts() {
    try {
      if (!hasDatabaseUrl) {
        return;
      }
      console.log('🔍 Checking workflow alerts...');
      
      // MODERNIZED: Use the new workflow tracker system instead of legacy ProjectWorkflow
      console.log('📊 Using modernized alert generation via AlertGenerationService');
      
      // Get all projects with active workflow trackers with timeout handling
      const activeProjects = await Promise.race([
        prisma.projectWorkflowTracker.findMany({
          where: {
            currentLineItemId: { not: null } // Has active line items
          },
          select: {
            projectId: true
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout')), 15000)
        )
      ]);

      if (activeProjects.length === 0) {
        console.log('📭 No active projects with workflow trackers found');
        return;
      }

      // Use the modernized AlertGenerationService to generate alerts
      const AlertGenerationService = require('./AlertGenerationService');
      const projectIds = activeProjects.map(p => p.projectId);
      
      console.log(`🚀 Generating alerts for ${projectIds.length} active projects`);
      
      try {
        const generatedAlerts = await AlertGenerationService.generateBatchAlerts(projectIds);
        console.log(`✅ Generated ${generatedAlerts.length} new alerts`);
      } catch (alertError) {
        console.error('❌ Error generating batch alerts:', alertError);
      }
    } catch (error) {
      console.error('❌ Error checking workflow alerts:', error);
      
      // Handle specific database connection errors
      if (error.code === 'P2024') {
        console.error('🔌 Database connection pool exhausted. Consider increasing connection limits.');
        console.error('💡 Try restarting the server or reducing concurrent database operations.');
      } else if (error.message === 'Database query timeout') {
        console.error('⏰ Database query timed out. The database may be overloaded.');
      }
    }
  }

  // LEGACY METHODS REMOVED - Using modernized AlertGenerationService instead
}

module.exports = new AlertSchedulerService(); 