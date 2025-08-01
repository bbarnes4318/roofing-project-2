const express = require('express');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// Test alerts endpoint
app.get('/test-alerts', async (req, res) => {
  try {
    console.log('Testing alerts...');
    
    const alerts = await prisma.workflowAlert.findMany({
      take: 5,
      where: { status: 'ACTIVE' },
      include: {
        project: { include: { customer: true }},
        assignedTo: true
      }
    });
    
    const transformed = alerts.map(alert => ({
      _id: alert.id,
      id: alert.id,
      type: alert.type,
      title: alert.title,
      message: alert.message,
      stepName: alert.stepName,
      priority: alert.priority.toLowerCase(),
      isRead: alert.isRead,
      createdAt: alert.createdAt,
      relatedProject: {
        _id: alert.project.id,
        projectName: alert.project.projectName,
        name: alert.project.customer?.primaryName
      },
      metadata: {
        stepName: alert.stepName,
        projectName: alert.project.projectName,
        customerName: alert.project.customer?.primaryName
      }
    }));
    
    res.json({
      success: true,
      data: transformed,
      total: transformed.length
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`Test URL: http://localhost:${PORT}/test-alerts`);
});

// Auto-shutdown after 30 seconds
setTimeout(() => {
  console.log('Shutting down test server...');
  process.exit(0);
}, 30000);