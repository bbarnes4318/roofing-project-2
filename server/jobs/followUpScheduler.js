const cron = require('node-cron');
const FollowUpService = require('../services/followUpService');

class FollowUpScheduler {
  constructor() {
    this.isRunning = false;
    this.job = null;
  }

  /**
   * Start the follow-up scheduler
   * Runs every hour to check for pending follow-ups
   */
  start() {
    if (this.isRunning) {
      console.log('Follow-up scheduler is already running');
      return;
    }

    // Run every hour at minute 0
    this.job = cron.schedule('0 * * * *', async () => {
      console.log('Running follow-up scheduler...');
      await this.processFollowUps();
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.job.start();
    this.isRunning = true;
    console.log('Follow-up scheduler started - running every hour');
  }

  /**
   * Stop the follow-up scheduler
   */
  stop() {
    if (this.job) {
      this.job.stop();
      this.job = null;
    }
    this.isRunning = false;
    console.log('Follow-up scheduler stopped');
  }

  /**
   * Process pending follow-ups
   */
  async processFollowUps() {
    try {
      const processedFollowUps = await FollowUpService.processPendingFollowUps();
      console.log(`Processed ${processedFollowUps.length} follow-ups`);
    } catch (error) {
      console.error('Error processing follow-ups:', error);
    }
  }

  /**
   * Manually trigger follow-up processing (for testing)
   */
  async triggerProcessing() {
    console.log('Manually triggering follow-up processing...');
    await this.processFollowUps();
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      nextRun: this.job ? this.job.nextDate() : null
    };
  }
}

// Create singleton instance
const followUpScheduler = new FollowUpScheduler();

module.exports = followUpScheduler;
