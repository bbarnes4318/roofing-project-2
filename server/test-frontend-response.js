const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFrontendResponse() {
  try {
    console.log('=== TESTING FRONTEND RESPONSE FORMAT ===');
    
    // Simulate the exact API response format
    const where = { status: 'ACTIVE' };
    
    const [alerts, total] = await Promise.all([
      prisma.workflowAlert.findMany({
        where,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          project: {
            select: {
              id: true,
              projectNumber: true,
              projectName: true,
              status: true,
              customer: {
                select: {
                  id: true,
                  primaryName: true,
                  primaryEmail: true,
                  primaryPhone: true
                }
              }
            }
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      }),
      prisma.workflowAlert.count({ where })
    ]);
    
    // Transform exactly like the API does
    const transformed = alerts.map(alert => {
      const metadata = alert.metadata || {};
      
      return {
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
        section: metadata.section || 'General Workflow',
        lineItem: metadata.lineItem || alert.stepName,
        relatedProject: {
          _id: alert.project.id,
          projectName: alert.project.projectName,
          projectNumber: alert.project.projectNumber,
          name: alert.project.customer?.primaryName || 'Unknown Customer'
        },
        metadata: {
          stepName: alert.stepName,
          cleanTaskName: metadata.lineItem || alert.stepName,
          projectId: alert.projectId,
          projectName: alert.project.projectName,
          projectNumber: alert.project.projectNumber,
          customerName: alert.project.customer?.primaryName,
          phase: metadata.phase || 'UNKNOWN',
          section: metadata.section || 'General Workflow',
          lineItem: metadata.lineItem || alert.stepName,
          workflowId: alert.workflowId,
          stepId: alert.stepId,
          responsibleRole: metadata.responsibleRole,
          trackerId: metadata.trackerId
        }
      };
    });
    
    // Create the exact response format
    const response = {
      success: true,
      message: 'Alerts retrieved successfully',
      data: transformed,
      pagination: {
        currentPage: 1,
        totalPages: Math.ceil(total / 5),
        totalItems: total,
        itemsPerPage: 5,
        hasNextPage: total > 5,
        hasPrevPage: false,
        nextPage: total > 5 ? 2 : null,
        prevPage: null
      },
      timestamp: new Date().toISOString()
    };
    
    console.log('API Response Structure:');
    console.log(JSON.stringify(response, null, 2));
    
    console.log('\nFrontend Hook Processing:');
    console.log('response.data:', response.data);
    console.log('response.data?.data:', response.data?.data);
    console.log('Final result (data?.data || data || []):', response.data?.data || response.data || []);
    
    console.log(`\nExpected: ${transformed.length} alerts`);
    console.log('Actual result length:', (response.data?.data || response.data || []).length);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFrontendResponse();
