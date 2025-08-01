// Hot-fix for alerts route - override the existing route
const { prisma } = require('../config/prisma');

// Simple override function that returns real alerts
async function getAlertsData(req, res, next) {
  try {
    console.log('🚨 HOTFIX: Overriding alerts route...');
    
    const alerts = await prisma.workflowAlert.findMany({
      take: 20,
      where: { status: 'ACTIVE' },
      include: {
        project: { include: { customer: true }},
        step: true,
        assignedTo: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`🚨 HOTFIX: Found ${alerts.length} alerts`);
    
    const transformed = alerts.map(alert => ({
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
        name: alert.project.customer?.primaryName || 'Unknown Customer'
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
      data: transformed,
      pagination: {
        currentPage: 1,
        totalPages: Math.ceil(alerts.length / 20),
        totalItems: alerts.length,
        itemsPerPage: alerts.length,
        hasNextPage: false,
        hasPrevPage: false,
        nextPage: null,
        prevPage: null
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('🚨 HOTFIX: Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts',
      data: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: 20,
        hasNextPage: false,
        hasPrevPage: false,
        nextPage: null,
        prevPage: null
      }
    });
  }
}

module.exports = { getAlertsData };