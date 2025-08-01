const express = require('express');
const { prisma } = require('../config/prisma');

const router = express.Router();

// Simple alerts route that just works
router.get('/', async (req, res) => {
  try {
    console.log('🚨 SIMPLE ALERTS: Fetching alerts...');
    
    const { limit = 20, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get total count
    const totalAlerts = await prisma.workflowAlert.count({
      where: {
        status: 'ACTIVE'
      }
    });
    
    console.log(`🚨 SIMPLE ALERTS: Found ${totalAlerts} total alerts`);
    
    // Get alerts
    const alerts = await prisma.workflowAlert.findMany({
      where: {
        status: 'ACTIVE'
      },
      include: {
        project: {
          include: {
            customer: true
          }
        },
        step: true,
        assignedTo: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: skip,
      take: parseInt(limit)
    });
    
    console.log(`🚨 SIMPLE ALERTS: Returning ${alerts.length} alerts`);
    
    // Transform for frontend
    const transformedAlerts = alerts.map(alert => ({
      _id: alert.id,
      id: alert.id,
      type: alert.type,
      title: alert.title,
      message: alert.message,
      stepName: alert.stepName,
      priority: alert.priority.charAt(0) + alert.priority.slice(1).toLowerCase(),
      isRead: alert.isRead,
      read: alert.isRead,
      createdAt: alert.createdAt,
      dueDate: alert.dueDate,
      workflowId: alert.workflowId,
      stepId: alert.stepId,
      relatedProject: {
        _id: alert.project.id,
        projectName: alert.project.projectName,
        projectNumber: alert.project.projectNumber,
        name: alert.project.customer?.primaryName || 'Unknown'
      },
      metadata: {
        stepName: alert.stepName,
        cleanTaskName: alert.stepName,
        projectId: alert.projectId,
        projectName: alert.project.projectName,
        projectNumber: alert.project.projectNumber,
        customerName: alert.project.customer?.primaryName,
        phase: alert.step?.phase || 'UNKNOWN'
      }
    }));
    
    res.json({
      success: true,
      message: 'Alerts retrieved successfully',
      data: transformedAlerts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalAlerts / parseInt(limit)),
        totalItems: totalAlerts,
        itemsPerPage: parseInt(limit),
        hasNextPage: skip + parseInt(limit) < totalAlerts,
        hasPrevPage: parseInt(page) > 1,
        nextPage: skip + parseInt(limit) < totalAlerts ? parseInt(page) + 1 : null,
        prevPage: parseInt(page) > 1 ? parseInt(page) - 1 : null
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ SIMPLE ALERTS: Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts',
      error: error.message
    });
  }
});

module.exports = router;