/**
 * Test script for verifying skipped phase progress calculation
 */

const { prisma } = require('../config/prisma');
const WorkflowProgressionService = require('../services/WorkflowProgressionService');

async function testSkippedPhaseProgress() {
  console.log('🧪 Testing Skipped Phase Progress Calculation\n');
  
  try {
    // Find a test project or use the first available project
    const project = await prisma.project.findFirst({
      include: {
        phaseOverrides: {
          where: { isActive: true }
        }
      }
    });
    
    if (!project) {
      console.log('❌ No projects found in database');
      return;
    }
    
    console.log(`📋 Testing with project: ${project.projectName} (ID: ${project.id})`);
    
    // Test 1: Get workflow status without skipped phases
    console.log('\n1️⃣ Testing without phase override:');
    const statusBefore = await WorkflowProgressionService.getWorkflowStatus(project.id);
    console.log(`   • Completed items: ${statusBefore.completedItems}`);
    console.log(`   • Total items: ${statusBefore.totalItems}`);
    console.log(`   • Progress: ${statusBefore.progress}%`);
    console.log(`   • Has phase override: ${statusBefore.hasPhaseOverride}`);
    
    // Test 2: Create a phase override to skip phases
    if (!project.phaseOverrides || project.phaseOverrides.length === 0) {
      console.log('\n2️⃣ Creating phase override to skip LEAD and PROSPECT phases:');
      
      // Get project workflow
      const workflow = await prisma.projectWorkflow.findFirst({
        where: { projectId: project.id }
      });
      
      if (workflow) {
        // Get first user for test
        const testUser = await prisma.user.findFirst();
        
        if (!testUser) {
          console.log('   ❌ No users found for test');
          return;
        }
        
        const override = await prisma.projectPhaseOverride.create({
          data: {
            projectId: project.id,
            workflowId: workflow.id,
            fromPhase: 'LEAD',
            toPhase: 'APPROVED',
            overriddenById: testUser.id,
            suppressAlertsFor: ['LEAD', 'PROSPECT'],
            reason: 'Test: Skipping initial phases',
            autoLogMessage: `Test override: Skipping from LEAD to APPROVED at ${new Date().toISOString()}`,
            isActive: true
          }
        });
        
        console.log(`   ✅ Created phase override (ID: ${override.id})`);
        
        // Test with the new override
        const statusAfter = await WorkflowProgressionService.getWorkflowStatus(project.id);
        console.log('\n3️⃣ Testing WITH phase override:');
        console.log(`   • Completed items: ${statusAfter.completedItems}`);
        console.log(`   • Skipped items: ${statusAfter.skippedItems}`);
        console.log(`   • Adjusted completed: ${statusAfter.adjustedCompletedItems}`);
        console.log(`   • Total items: ${statusAfter.totalItems}`);
        console.log(`   • Progress: ${statusAfter.progress}%`);
        console.log(`   • Has phase override: ${statusAfter.hasPhaseOverride}`);
        
        // Calculate the difference
        const progressDiff = statusAfter.progress - statusBefore.progress;
        console.log(`\n📊 Progress increased by ${progressDiff}% due to skipped phases`);
        
        // Clean up - remove the test override
        await prisma.projectPhaseOverride.update({
          where: { id: override.id },
          data: { isActive: false }
        });
        console.log('\n🧹 Cleaned up test override');
      } else {
        console.log('   ❌ No workflow found for project');
      }
    } else {
      // Project already has an override
      console.log('\n2️⃣ Project already has an active phase override:');
      const existingOverride = project.phaseOverrides[0];
      console.log(`   • From phase: ${existingOverride.fromPhase}`);
      console.log(`   • To phase: ${existingOverride.toPhase}`);
      console.log(`   • Skipped phases: ${existingOverride.suppressAlertsFor.join(', ')}`);
      
      const statusWithOverride = await WorkflowProgressionService.getWorkflowStatus(project.id);
      console.log('\n3️⃣ Current status WITH existing override:');
      console.log(`   • Completed items: ${statusWithOverride.completedItems}`);
      console.log(`   • Skipped items: ${statusWithOverride.skippedItems}`);
      console.log(`   • Adjusted completed: ${statusWithOverride.adjustedCompletedItems}`);
      console.log(`   • Total items: ${statusWithOverride.totalItems}`);
      console.log(`   • Progress: ${statusWithOverride.progress}%`);
    }
    
    // Test the optimized method as well
    console.log('\n4️⃣ Testing optimized workflow status method:');
    const optimizedStatus = await WorkflowProgressionService.getOptimizedWorkflowStatus(project.id);
    if (optimizedStatus) {
      console.log(`   • Overall progress: ${optimizedStatus.overall_progress}%`);
      console.log(`   • Has phase override: ${optimizedStatus.hasPhaseOverride}`);
      console.log(`   • Alert count: ${optimizedStatus.alertCount}`);
    } else {
      console.log('   ❌ Optimized method returned null');
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testSkippedPhaseProgress();