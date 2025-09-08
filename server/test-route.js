const express = require('express');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

app.get('/test-projects', async (req, res) => {
  try {
    console.log('=== TEST ROUTE DEBUG ===');
    
    // Simple query first
    const simpleProjects = await prisma.project.findMany({
      where: { archived: false },
      select: { id: true, projectName: true, archived: true }
    });
    
    console.log(`Simple query found ${simpleProjects.length} projects`);
    
    // Full query like the API
    const fullProjects = await prisma.project.findMany({
      where: { archived: false },
      include: {
        customer: {
          select: {
            id: true,
            primaryName: true,
            primaryEmail: true,
            primaryPhone: true,
            secondaryName: true,
            secondaryEmail: true,
            secondaryPhone: true,
            address: true
          }
        },
        projectManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true
          }
        }
      }
    });
    
    console.log(`Full query found ${fullProjects.length} projects`);
    
    res.json({
      success: true,
      simpleCount: simpleProjects.length,
      fullCount: fullProjects.length,
      projects: fullProjects.slice(0, 2) // Return first 2 for debugging
    });
    
  } catch (error) {
    console.error('Test route error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(5001, () => {
  console.log('Test server running on port 5001');
});
