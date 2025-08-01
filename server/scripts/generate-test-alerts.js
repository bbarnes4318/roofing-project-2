const { prisma } = require('../config/prisma');
const AlertGenerationService = require('../services/AlertGenerationService');

async function generateTestAlerts() {
  try {
    console.log('🚀 Generating test alerts for all projects...');
    
    // Get all projects with their workflows
    const projects = await prisma.project.findMany({
      include: {
        customer: true,
        workflow: {
          include: {
            steps: {
              where: {
                isCompleted: false
              }
            }
          }
        }
      }
    });
    
    console.log(`Found ${projects.length} projects`);
    
    let totalAlerts = 0;
    
    for (const project of projects) {
      if (!project.workflow || project.workflow.steps.length === 0) {
        console.log(`Skipping project ${project.projectNumber} - no incomplete steps`);
        continue;
      }
      
      console.log(`\nProcessing project ${project.projectNumber} - ${project.customer.primaryName}`);
      console.log(`Found ${project.workflow.steps.length} incomplete steps`);
      
      // Group steps by phase
      const stepsByPhase = {};
      project.workflow.steps.forEach(step => {
        if (!stepsByPhase[step.phase]) {
          stepsByPhase[step.phase] = [];
        }
        stepsByPhase[step.phase].push(step);
      });
      
      // Generate alerts for each phase
      for (const [phase, steps] of Object.entries(stepsByPhase)) {
        console.log(`  Generating alerts for ${steps.length} steps in ${phase} phase`);
        
        for (const step of steps) {
          try {
            const alert = await prisma.workflowAlert.create({
              data: {
                type: 'Work Flow Line Item',
                priority: step.alertPriority || 'MEDIUM',
                status: 'ACTIVE',
                
                // Content
                title: `${step.stepName} - ${project.customer.primaryName}`,
                message: `${step.stepName} is ready to be completed for project at ${project.projectName}`,
                stepName: step.stepName,
                
                // Due date (7 days from now by default)
                dueDate: step.scheduledEndDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                
                // Relationships
                projectId: project.id,
                workflowId: project.workflow.id,
                stepId: step.id,
                
                // Assignment - assign to project manager or first user
                assignedToId: step.assignedToId || project.projectManagerId || (await prisma.user.findFirst()).id,
                
                // Metadata
                metadata: {
                  phase: phase,
                  projectNumber: project.projectNumber,
                  projectName: project.projectName,
                  customerName: project.customer.primaryName,
                  customerPhone: project.customer.primaryPhone,
                  customerEmail: project.customer.primaryEmail,
                  customerAddress: project.customer.address,
                  stepDescription: step.description
                }
              }
            });
            
            console.log(`    ✅ Created alert for: ${step.stepName}`);
            totalAlerts++;
          } catch (error) {
            console.error(`    ❌ Failed to create alert for ${step.stepName}:`, error.message);
          }
        }
      }
    }
    
    console.log(`\n✅ Successfully generated ${totalAlerts} test alerts`);
    
    // Verify alerts were created
    const alertCount = await prisma.workflowAlert.count();
    console.log(`\n📊 Total alerts in database: ${alertCount}`);
    
  } catch (error) {
    console.error('❌ Error generating test alerts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateTestAlerts();