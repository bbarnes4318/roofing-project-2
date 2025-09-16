const express = require('express');
const { runDatabaseMigration } = require('../scripts/run-db-migration');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// @desc    Run database migration
// @route   POST /api/migration/run
// @access  Private (Admin only)
router.post('/run', authenticateToken, asyncHandler(async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }

  try {
    console.log('🔄 Starting database migration via API...');
    await runDatabaseMigration();
    
    res.json({
      success: true,
      message: 'Database migration completed successfully!'
    });
  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({
      success: false,
      message: 'Migration failed: ' + error.message
    });
  }
}));

module.exports = router;
