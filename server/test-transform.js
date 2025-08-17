const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Copy the helper functions from projects.js
const getTotalLineItemsCount = async (workflowType = 'ROOFING') => {
  try {
    const count = await prisma.workflowLineItem.count({
      where: {
        isActive: true,
        section: {
          isActive: true,
          phase: {
            isActive: true
          }
        }
      }
    });
    return count || 0;
  } catch (error) {
    console.error('Error getting line items count:', error);
    return 25; // Default estimate
  }
};

const transformProjectForFrontend = async (project) => {
  if (!project) return null;
  
  console.log('Transforming project:', project.projectName);
  
  try {
    // Get total line items count for progress calculation
    const totalLineItems = await getTotalLineItemsCount();
    console.log('  Total line items:', totalLineItems);
    
    return {
      // Keep both ID formats for compatibility
      id: project.id,
      _id: project.id,
      
      // Project details
      projectId: project.projectNumber?.toString() || project.id,
      projectNumber: project.projectNumber,
      projectName: project.projectName,
      projectType: project.projectType,
      status: project.status,
      priority: project.priority,
      description: project.description,
      progress: project.progress || 0,
      
      // Dates
      startDate: project.startDate,
      endDate: project.endDate,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      
      // Customer info - handle both MongoDB and Prisma formats
      customer: project.customer ? {
        id: project.customer.id,
        _id: project.customer.id,
        name: project.customer.primaryName,
        primaryName: project.customer.primaryName,
        email: project.customer.primaryEmail,
        phone: project.customer.primaryPhone,
        address: project.customer.address,
        secondaryName: project.customer.secondaryName,
        secondaryEmail: project.customer.secondaryEmail,
        secondaryPhone: project.customer.secondaryPhone
      } : null,
      
      // Keep original customer ID
      customerId: project.customerId,
      
      // Project Manager
      projectManager: project.projectManager ? {
        id: project.projectManager.id,
        _id: project.projectManager.id,
        name: `${project.projectManager.firstName} ${project.projectManager.lastName}`,
        firstName: project.projectManager.firstName,
        lastName: project.projectManager.lastName,
        email: project.projectManager.email,
        phone: project.projectManager.phone,
        role: project.projectManager.role
      } : null,
      projectManagerId: project.projectManagerId,
      
      // Team members
      teamMembers: project.teamMembers?.map(member => ({
        id: member.id,
        _id: member.id,
        role: member.role,
        userId: member.userId,
        user: member.user ? {
          id: member.user.id,
          _id: member.user.id,
          name: `${member.user.firstName} ${member.user.lastName}`,
          firstName: member.user.firstName,
          lastName: member.user.lastName,
          email: member.user.email,
          role: member.user.role
        } : null
      })) || [],
      
      // Workflow data
      workflow: project.workflow || null,
      workflowId: project.workflowId,
      
      // Get phase from workflow tracker
      phase: 'LEAD', // We'll fix this next
      
      // Workflow tracker data for progress calculation
      workflowTracker: project.workflowTracker || null,
      
      // Progress tracking
      currentWorkflowItem: project.workflowTracker ? {
        phase: project.workflowTracker.currentPhase?.phaseName || null,
        section: project.workflowTracker.currentSection?.displayName || null,
        lineItem: project.workflowTracker.currentLineItem?.itemName || null,
        completedCount: project.workflowTracker.completedItems?.length || 0,
        totalCount: totalLineItems
      } : null,
      
      // Financial
      estimateValue: project.estimateValue,
      contractValue: project.contractValue,
      invoicedAmount: project.invoicedAmount,
      paidAmount: project.paidAmount,
      
      // Additional fields
      notes: project.notes,
      tags: project.tags || [],
      archived: project.archived || false,
      
      // Phase overrides if they exist
      phaseOverrides: project.phaseOverrides || []
    };
  } catch (error) {
    console.error('  Transform error:', error.message);
    throw error;
  }
};

async function testTransform() {
  try {
    // Get a project with all relations
    const project = await prisma.project.findFirst({
      include: {
        customer: true,
        projectManager: true,
        teamMembers: {
          include: {
            user: true
          }
        },
        workflowTracker: {
          include: {
            currentPhase: true,
            currentSection: true,
            currentLineItem: true,
            completedItems: true
          }
        },
        workflow: true,
        phaseOverrides: true
      }
    });
    
    console.log('\nOriginal project:', project.projectName);
    console.log('Has customer:', !!project.customer);
    console.log('Has workflow tracker:', !!project.workflowTracker);
    
    // Try to transform it
    console.log('\nTransforming project...');
    const transformed = await transformProjectForFrontend(project);
    
    console.log('\n✅ Transform successful!');
    console.log('Transformed project keys:', Object.keys(transformed));
    console.log('Customer name:', transformed.customer?.name);
    console.log('Current workflow item:', transformed.currentWorkflowItem);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTransform();