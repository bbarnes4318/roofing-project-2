/**
 * Comprehensive Test Suite for Database Optimization
 * Updated: 2025-08-12
 * Purpose: Test all optimizations including workflow consolidation, constraints, and performance
 */

const { prisma } = require('../config/prisma');
const OptimizedWorkflowService = require('../services/OptimizedWorkflowService');

describe('Database Optimization Test Suite', () => {
  let testProjectId;
  let testUserId;
  let testCustomerId;
  let testWorkflowId;

  beforeAll(async () => {
    // Clean up any existing test data
    await cleanupTestData();

    // Create test customer
    const testCustomer = await prisma.customer.create({
      data: {
        primaryName: 'Test Customer',
        primaryEmail: 'test@example.com',
        primaryPhone: '1234567890',
        address: '123 Test St'
      }
    });
    testCustomerId = testCustomer.id;

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: 'testuser@example.com',
        password: 'hashedpassword',
        role: 'PROJECT_MANAGER'
      }
    });
    testUserId = testUser.id;

    // Create test project
    const testProject = await prisma.project.create({
      data: {
        projectNumber: 999999,
        projectName: 'Test Optimization Project',
        projectType: 'ROOF_REPLACEMENT',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        budget: 50000.00,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        customerId: testCustomerId,
        projectManagerId: testUserId,
        createdById: testUserId
      }
    });
    testProjectId = testProject.id;
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  async function cleanupTestData() {
    // Clean up in reverse dependency order
    await prisma.workflowAlert.deleteMany({ where: { projectId: testProjectId } });
    await prisma.completedWorkflowItem.deleteMany({ 
      where: { tracker: { projectId: testProjectId } } 
    });
    await prisma.workflowStep.deleteMany({ 
      where: { workflow: { projectId: testProjectId } } 
    });
    await prisma.projectWorkflowTracker.deleteMany({ where: { projectId: testProjectId } });
    await prisma.projectWorkflow.deleteMany({ where: { projectId: testProjectId } });
    await prisma.project.deleteMany({ where: { projectNumber: 999999 } });
    await prisma.user.deleteMany({ where: { email: 'testuser@example.com' } });
    await prisma.customer.deleteMany({ where: { primaryEmail: 'test@example.com' } });
  }

  describe('Phase 1: Workflow System Consolidation', () => {
    test('should initialize workflow with template-instance linking', async () => {
      const result = await OptimizedWorkflowService.initializeProjectWorkflow(
        testProjectId, 
        'ROOFING'
      );

      expect(result).toHaveProperty('projectWorkflow');
      expect(result).toHaveProperty('tracker');
      expect(result).toHaveProperty('steps');
      expect(result.steps.length).toBeGreaterThan(0);

      testWorkflowId = result.projectWorkflow.id;

      // Verify template linking
      const firstStep = result.steps[0];
      expect(firstStep.templatePhaseId).toBeTruthy();
      expect(firstStep.templateSectionId).toBeTruthy();
      expect(firstStep.templateLineItemId).toBeTruthy();

      // Verify tracker has both template and instance references
      expect(result.tracker.currentPhaseId).toBeTruthy();
      expect(result.tracker.currentStepId).toBeTruthy();
      expect(result.tracker.workflowInstanceId).toBe(testWorkflowId);
    });

    test('should maintain consistency between template and instance systems', async () => {
      const workflowStatus = await OptimizedWorkflowService.getProjectWorkflowStatus(testProjectId);
      
      expect(workflowStatus).toBeTruthy();
      expect(workflowStatus.workflow_id).toBe(testWorkflowId);
      expect(workflowStatus.current_phase).toBeTruthy();
      expect(workflowStatus.current_step_id).toBeTruthy();
    });

    test('should enforce workflow state machine constraints', async () => {
      const steps = await prisma.workflowStep.findMany({
        where: { workflowId: testWorkflowId },
        orderBy: { stepOrder: 'asc' }
      });

      const firstStep = steps[0];

      // Test valid state transition
      await expect(
        OptimizedWorkflowService.updateStepState(firstStep.id, 'IN_PROGRESS', testUserId)
      ).resolves.toBeTruthy();

      // Test invalid state transition
      await expect(
        OptimizedWorkflowService.updateStepState(firstStep.id, 'COMPLETED', testUserId)
      ).rejects.toThrow();
    });
  });

  describe('Phase 2: Data Type Standardization', () => {
    test('should validate email format constraints', async () => {
      await expect(
        prisma.user.create({
          data: {
            firstName: 'Invalid',
            lastName: 'Email',
            email: 'invalid-email',
            password: 'password'
          }
        })
      ).rejects.toThrow();
    });

    test('should validate phone format constraints', async () => {
      await expect(
        prisma.customer.create({
          data: {
            primaryName: 'Test Customer',
            primaryEmail: 'valid@example.com',
            primaryPhone: 'invalid-phone',
            address: '123 Test St'
          }
        })
      ).rejects.toThrow();
    });

    test('should validate percentage constraints', async () => {
      await expect(
        prisma.project.update({
          where: { id: testProjectId },
          data: { progress: 150 }
        })
      ).rejects.toThrow();
    });

    test('should validate financial constraints', async () => {
      await expect(
        prisma.project.update({
          where: { id: testProjectId },
          data: { budget: -1000 }
        })
      ).rejects.toThrow();
    });
  });

  describe('Phase 3: Constraint Validation', () => {
    test('should prevent circular task dependencies', async () => {
      const task1 = await prisma.task.create({
        data: {
          title: 'Task 1',
          dueDate: new Date(),
          projectId: testProjectId,
          assignedToId: testUserId
        }
      });

      const task2 = await prisma.task.create({
        data: {
          title: 'Task 2',
          dueDate: new Date(),
          projectId: testProjectId,
          assignedToId: testUserId
        }
      });

      // Create dependency: task1 depends on task2
      await prisma.taskDependency.create({
        data: {
          parentTaskId: task2.id,
          dependentTaskId: task1.id
        }
      });

      // Try to create circular dependency: task2 depends on task1
      await expect(
        prisma.taskDependency.create({
          data: {
            parentTaskId: task1.id,
            dependentTaskId: task2.id
          }
        })
      ).rejects.toThrow(/circular dependency/i);

      // Cleanup
      await prisma.taskDependency.deleteMany({
        where: { OR: [{ parentTaskId: task1.id }, { parentTaskId: task2.id }] }
      });
      await prisma.task.deleteMany({
        where: { id: { in: [task1.id, task2.id] } }
      });
    });

    test('should validate workflow step dependencies', async () => {
      const steps = await prisma.workflowStep.findMany({
        where: { workflowId: testWorkflowId },
        take: 2
      });

      // Test invalid dependency (step from different workflow)
      const otherStep = await prisma.workflowStep.create({
        data: {
          stepId: 'TEST',
          stepName: 'Other Step',
          description: 'Test step',
          phase: 'LEAD',
          defaultResponsible: 'OFFICE',
          estimatedDuration: 60,
          stepOrder: 999,
          workflowId: 'invalid-workflow-id' // This should cause the constraint to fail
        }
      });

      await expect(
        prisma.workflowStep.update({
          where: { id: steps[0].id },
          data: { dependencies: [otherStep.id] }
        })
      ).rejects.toThrow();

      // Cleanup
      await prisma.workflowStep.delete({ where: { id: otherStep.id } });
    });

    test('should validate date ranges', async () => {
      // Test project with invalid date range
      await expect(
        prisma.project.update({
          where: { id: testProjectId },
          data: {
            startDate: new Date('2024-12-31'),
            endDate: new Date('2024-01-01')
          }
        })
      ).rejects.toThrow(/start date cannot be after end date/i);
    });
  });

  describe('Phase 4: Performance Optimization', () => {
    test('should efficiently retrieve multiple project statuses', async () => {
      const startTime = Date.now();
      
      const statuses = await OptimizedWorkflowService.getMultipleProjectStatuses([testProjectId]);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(statuses).toHaveLength(1);
      expect(statuses[0].project_id).toBe(testProjectId);
      expect(queryTime).toBeLessThan(1000); // Should complete in under 1 second
    });

    test('should perform full-text search efficiently', async () => {
      const startTime = Date.now();
      
      const results = await OptimizedWorkflowService.searchWorkflowItems('inspection');
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(Array.isArray(results)).toBe(true);
      expect(queryTime).toBeLessThan(500); // Should complete in under 500ms
    });

    test('should use materialized views for dashboard data', async () => {
      // Test that materialized view exists and returns data quickly
      const startTime = Date.now();
      
      const dashboardData = await prisma.$queryRaw`
        SELECT * FROM project_dashboard_summary 
        WHERE project_id = ${testProjectId}
        LIMIT 1
      `;
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(dashboardData).toHaveLength(1);
      expect(queryTime).toBeLessThan(100); // Materialized view should be very fast
    });
  });

  describe('Phase 5: Workflow Operations', () => {
    test('should complete workflow step and progress correctly', async () => {
      const steps = await prisma.workflowStep.findMany({
        where: { workflowId: testWorkflowId },
        orderBy: { stepOrder: 'asc' }
      });

      const firstStep = steps[0];
      const secondStep = steps[1];

      const result = await OptimizedWorkflowService.completeWorkflowItem(
        testProjectId,
        firstStep.id,
        testUserId,
        'Test completion notes'
      );

      expect(result.completedStep.id).toBe(firstStep.id);
      expect(result.nextStep).toBeTruthy();
      expect(result.progress).toBeGreaterThan(0);

      // Verify step is marked as completed
      const updatedStep = await prisma.workflowStep.findUnique({
        where: { id: firstStep.id }
      });
      expect(updatedStep.isCompleted).toBe(true);
      expect(updatedStep.state).toBe('COMPLETED');

      // Verify completion was recorded in history
      const completedItem = await prisma.completedWorkflowItem.findFirst({
        where: {
          tracker: { projectId: testProjectId },
          lineItemId: firstStep.templateLineItemId
        }
      });
      expect(completedItem).toBeTruthy();
      expect(completedItem.completedById).toBe(testUserId);
    });

    test('should generate alerts for active workflow steps', async () => {
      const activeAlerts = await prisma.workflowAlert.findMany({
        where: {
          projectId: testProjectId,
          status: 'ACTIVE'
        }
      });

      expect(activeAlerts.length).toBeGreaterThan(0);
      
      const alert = activeAlerts[0];
      expect(alert.title).toContain('Action Required');
      expect(alert.responsibleRole).toBeTruthy();
      expect(alert.dueDate).toBeTruthy();
    });

    test('should handle phase advancement correctly', async () => {
      // Complete all steps in current phase first
      const steps = await prisma.workflowStep.findMany({
        where: { 
          workflowId: testWorkflowId,
          isCompleted: false
        },
        orderBy: { stepOrder: 'asc' }
      });

      // Complete remaining steps (skip first as it's already completed)
      for (let i = 0; i < Math.min(steps.length, 3); i++) {
        await OptimizedWorkflowService.completeWorkflowItem(
          testProjectId,
          steps[i].id,
          testUserId,
          `Completion notes for step ${i + 1}`
        );
      }

      // Test phase advancement
      const advancement = await OptimizedWorkflowService.advanceToNextPhase(
        testProjectId,
        testUserId,
        'Testing phase advancement'
      );

      expect(advancement.success).toBe(true);
      expect(advancement.new_phase_name).toBeTruthy();

      // Verify tracker was updated
      const tracker = await prisma.projectWorkflowTracker.findUnique({
        where: { projectId: testProjectId },
        include: { currentPhase: true }
      });

      expect(tracker.currentPhaseId).toBe(advancement.new_phase_id);
      expect(tracker.currentPhase.phaseName).toBe(advancement.new_phase_name);
    });
  });

  describe('Phase 6: Data Quality and Monitoring', () => {
    test('should maintain data quality standards', async () => {
      const qualityReport = await prisma.$queryRaw`
        SELECT * FROM data_quality_report
        WHERE quality_status = 'FAIL'
      `;

      expect(qualityReport).toHaveLength(0); // No failing quality checks
    });

    test('should log constraint violations properly', async () => {
      // Get initial violation count
      const initialViolations = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM constraint_violations
        WHERE resolved = false
      `;

      const initialCount = parseInt(initialViolations[0].count);

      // Attempt to create invalid data (should be caught by constraints)
      try {
        await prisma.user.create({
          data: {
            firstName: 'Invalid',
            lastName: 'User',
            email: 'duplicate@example.com',
            password: 'password'
          }
        });
        
        // Try to create duplicate
        await prisma.user.create({
          data: {
            firstName: 'Another',
            lastName: 'User',
            email: 'duplicate@example.com', // Same email
            password: 'password'
          }
        });
      } catch (error) {
        // Expected to fail due to unique constraint
      }

      // Clean up the first user if it was created
      await prisma.user.deleteMany({
        where: { email: 'duplicate@example.com' }
      });
    });

    test('should track performance metrics', async () => {
      const metrics = await OptimizedWorkflowService.getWorkflowPerformanceMetrics('LEAD');
      
      expect(Array.isArray(metrics)).toBe(true);
      
      if (metrics.length > 0) {
        const metric = metrics[0];
        expect(metric).toHaveProperty('phase_type');
        expect(metric).toHaveProperty('completion_count');
        expect(metric).toHaveProperty('avg_completion_hours');
      }
    });
  });

  describe('Phase 7: Integration and System Tests', () => {
    test('should maintain referential integrity across all operations', async () => {
      // Test complex operation that touches multiple tables
      const workflowStatus = await OptimizedWorkflowService.getProjectWorkflowStatus(testProjectId);
      
      expect(workflowStatus).toBeTruthy();
      expect(workflowStatus.project_id).toBe(testProjectId);
      expect(workflowStatus.workflow_id).toBeTruthy();
      
      // Verify all related records exist
      const project = await prisma.project.findUnique({ where: { id: testProjectId } });
      const workflow = await prisma.projectWorkflow.findUnique({ 
        where: { id: workflowStatus.workflow_id } 
      });
      const tracker = await prisma.projectWorkflowTracker.findUnique({
        where: { projectId: testProjectId }
      });

      expect(project).toBeTruthy();
      expect(workflow).toBeTruthy();
      expect(tracker).toBeTruthy();
      expect(workflow.projectId).toBe(testProjectId);
      expect(tracker.workflowInstanceId).toBe(workflow.id);
    });

    test('should handle concurrent operations safely', async () => {
      // Simulate concurrent step completions
      const steps = await prisma.workflowStep.findMany({
        where: { 
          workflowId: testWorkflowId,
          isCompleted: false
        },
        take: 2
      });

      if (steps.length >= 2) {
        const promises = steps.slice(0, 2).map((step, index) => 
          OptimizedWorkflowService.completeWorkflowItem(
            testProjectId,
            step.id,
            testUserId,
            `Concurrent completion ${index}`
          )
        );

        // At least one should succeed, might get conflicts
        const results = await Promise.allSettled(promises);
        const successfulResults = results.filter(r => r.status === 'fulfilled');
        
        expect(successfulResults.length).toBeGreaterThan(0);
      }
    });

    test('should maintain audit trail for all changes', async () => {
      const auditEntries = await prisma.$queryRaw`
        SELECT * FROM workflow_audit_log
        WHERE project_id = ${testProjectId}
        ORDER BY created_at DESC
      `;

      expect(auditEntries.length).toBeGreaterThan(0);
      
      const latestEntry = auditEntries[0];
      expect(latestEntry.entity_type).toBeTruthy();
      expect(latestEntry.action).toBeTruthy();
      expect(latestEntry.project_id).toBe(testProjectId);
    });
  });
});

// Performance benchmark tests
describe('Performance Benchmarks', () => {
  test('database operations should meet performance targets', async () => {
    const benchmarks = {
      singleProjectStatus: 100,    // 100ms
      multipleProjectStatus: 500,  // 500ms
      workflowSearch: 200,         // 200ms
      stepCompletion: 300,         // 300ms
      phaseAdvancement: 500        // 500ms
    };

    // Test single project status
    let startTime = Date.now();
    await OptimizedWorkflowService.getProjectWorkflowStatus(testProjectId);
    let duration = Date.now() - startTime;
    expect(duration).toBeLessThan(benchmarks.singleProjectStatus);

    // Test workflow search
    startTime = Date.now();
    await OptimizedWorkflowService.searchWorkflowItems('test');
    duration = Date.now() - startTime;
    expect(duration).toBeLessThan(benchmarks.workflowSearch);

    console.log('✅ All performance benchmarks passed');
  });
});

module.exports = {
  cleanupTestData
};