/**
 * Workflow Initialization Service
 * Creates default workflow steps for projects
 */

const { prisma } = require('../config/prisma');

class WorkflowInitializationService {
    /**
     * Initialize workflow for a project if it doesn't exist
     */
    static async initializeProjectWorkflow(projectId) {
        try {
            // Check if workflow already exists
            const existingWorkflow = await prisma.projectWorkflow.findUnique({
                where: { projectId }
            });

            if (existingWorkflow) {
                console.log(`📋 Workflow already exists for project ${projectId}`);
                return existingWorkflow;
            }

            // Create new workflow
            const workflow = await prisma.projectWorkflow.create({
                data: {
                    projectId,
                    status: 'NOT_STARTED',
                    overallProgress: 0,
                    currentStepIndex: 0,
                    enableAlerts: true,
                    alertMethods: ['IN_APP', 'EMAIL'],
                    escalationEnabled: true,
                    escalationDelayDays: 3
                }
            });

            console.log(`✅ Created workflow for project ${projectId}`);

            // Initialize default steps
            await this.initializeDefaultSteps(workflow.id);

            return workflow;
        } catch (error) {
            console.error('❌ Error initializing workflow:', error);
            throw error;
        }
    }

    /**
     * Initialize default workflow steps based on the checklist structure
     */
    static async initializeDefaultSteps(workflowId) {
        const defaultSteps = [
            // LEAD Phase
            {
                stepId: 'LEAD-input-customer-info',
                stepName: 'Input Customer Information',
                description: 'Input customer contact and property information',
                phase: 'LEAD',
                defaultResponsible: 'OFFICE',
                stepOrder: 1
            },
            {
                stepId: 'LEAD-complete-questions',
                stepName: 'Complete Questions to Ask Checklist',
                description: 'Complete initial customer questionnaire',
                phase: 'LEAD',
                defaultResponsible: 'OFFICE',
                stepOrder: 2
            },
            {
                stepId: 'LEAD-input-lead-property',
                stepName: 'Input Lead Property Information',
                description: 'Add property photos and details',
                phase: 'LEAD',
                defaultResponsible: 'OFFICE',
                stepOrder: 3
            },
            {
                stepId: 'LEAD-assign-pm',
                stepName: 'Assign A Project Manager',
                description: 'Assign and brief the project manager',
                phase: 'LEAD',
                defaultResponsible: 'OFFICE',
                stepOrder: 4
            },
            {
                stepId: 'LEAD-schedule-inspection',
                stepName: 'Schedule Initial Inspection',
                description: 'Schedule site inspection with customer',
                phase: 'LEAD',
                defaultResponsible: 'OFFICE',
                stepOrder: 5
            },
            // PROSPECT Phase
            {
                stepId: 'PROSPECT-site-inspection',
                stepName: 'Site Inspection',
                description: 'Conduct on-site inspection and documentation',
                phase: 'PROSPECT',
                defaultResponsible: 'PROJECT_MANAGER',
                stepOrder: 6
            },
            {
                stepId: 'PROSPECT-write-estimate',
                stepName: 'Write Estimate',
                description: 'Create project estimate',
                phase: 'PROSPECT',
                defaultResponsible: 'PROJECT_MANAGER',
                stepOrder: 7
            },
            {
                stepId: 'PROSPECT-insurance-process',
                stepName: 'Insurance Process',
                description: 'Process insurance claim and documentation',
                phase: 'PROSPECT',
                defaultResponsible: 'ADMINISTRATION',
                stepOrder: 8
            },
            {
                stepId: 'PROSPECT-agreement-prep',
                stepName: 'Agreement Preparation',
                description: 'Prepare contract and agreement documents',
                phase: 'PROSPECT',
                defaultResponsible: 'ADMINISTRATION',
                stepOrder: 9
            },
            {
                stepId: 'PROSPECT-agreement-signing',
                stepName: 'Agreement Signing',
                description: 'Get customer signatures on agreements',
                phase: 'PROSPECT',
                defaultResponsible: 'ADMINISTRATION',
                stepOrder: 10
            },
            // APPROVED Phase
            {
                stepId: 'APPROVED-admin-setup',
                stepName: 'Administrative Setup',
                description: 'Set up project administration',
                phase: 'APPROVED',
                defaultResponsible: 'ADMINISTRATION',
                stepOrder: 11
            },
            {
                stepId: 'APPROVED-pre-job',
                stepName: 'Pre-Job Actions',
                description: 'Complete pre-job requirements',
                phase: 'APPROVED',
                defaultResponsible: 'OFFICE',
                stepOrder: 12
            },
            {
                stepId: 'APPROVED-prepare-production',
                stepName: 'Prepare for Production',
                description: 'Prepare materials and crew for production',
                phase: 'APPROVED',
                defaultResponsible: 'ADMINISTRATION',
                stepOrder: 13
            },
            // EXECUTION Phase
            {
                stepId: 'EXECUTION-installation',
                stepName: 'Installation',
                description: 'Execute roofing installation',
                phase: 'EXECUTION',
                defaultResponsible: 'FIELD_DIRECTOR',
                stepOrder: 14
            },
            {
                stepId: 'EXECUTION-quality-check',
                stepName: 'Quality Check',
                description: 'Perform quality inspection',
                phase: 'EXECUTION',
                defaultResponsible: 'ROOF_SUPERVISOR',
                stepOrder: 15
            },
            {
                stepId: 'EXECUTION-multiple-trades',
                stepName: 'Multiple Trades',
                description: 'Coordinate multiple trade work',
                phase: 'EXECUTION',
                defaultResponsible: 'ADMINISTRATION',
                stepOrder: 16
            },
            {
                stepId: 'EXECUTION-subcontractor-work',
                stepName: 'Subcontractor Work',
                description: 'Manage subcontractor activities',
                phase: 'EXECUTION',
                defaultResponsible: 'ADMINISTRATION',
                stepOrder: 17
            },
            {
                stepId: 'EXECUTION-update-customer',
                stepName: 'Update Customer',
                description: 'Provide customer updates',
                phase: 'EXECUTION',
                defaultResponsible: 'ADMINISTRATION',
                stepOrder: 18
            },
            // SECOND_SUPP Phase
            {
                stepId: 'SUPPLEMENT-create-supp',
                stepName: 'Create Supp in Xactimate',
                description: 'Create supplement in Xactimate',
                phase: 'SECOND_SUPP',
                defaultResponsible: 'ADMINISTRATION',
                stepOrder: 19
            },
            {
                stepId: 'SUPPLEMENT-followup-calls',
                stepName: 'Follow-Up Calls',
                description: 'Make insurance follow-up calls',
                phase: 'SECOND_SUPP',
                defaultResponsible: 'ADMINISTRATION',
                stepOrder: 20
            },
            {
                stepId: 'SUPPLEMENT-review-approved',
                stepName: 'Review Approved Supp',
                description: 'Review approved supplement',
                phase: 'SECOND_SUPP',
                defaultResponsible: 'ADMINISTRATION',
                stepOrder: 21
            },
            {
                stepId: 'SUPPLEMENT-customer-update',
                stepName: 'Customer Update',
                description: 'Update customer on supplement status',
                phase: 'SECOND_SUPP',
                defaultResponsible: 'ADMINISTRATION',
                stepOrder: 22
            },
            // COMPLETION Phase
            {
                stepId: 'COMPLETION-financial-processing',
                stepName: 'Financial Processing',
                description: 'Process project financials',
                phase: 'COMPLETION',
                defaultResponsible: 'ADMINISTRATION',
                stepOrder: 23
            },
            {
                stepId: 'COMPLETION-project-closeout',
                stepName: 'Project Closeout',
                description: 'Complete project closeout procedures',
                phase: 'COMPLETION',
                defaultResponsible: 'OFFICE',
                stepOrder: 24
            }
        ];

        // Create all steps
        for (const step of defaultSteps) {
            await prisma.workflowStep.create({
                data: {
                    ...step,
                    workflowId,
                    estimatedDuration: 60,
                    isCompleted: false,
                    alertPriority: 'MEDIUM',
                    alertDays: 1,
                    overdueIntervals: [1, 3, 7, 14]
                }
            });
        }

        console.log(`✅ Created ${defaultSteps.length} default workflow steps`);
    }

    /**
     * Ensure workflow exists for project (called before updates)
     */
    static async ensureWorkflowExists(projectId) {
        const workflow = await prisma.projectWorkflow.findUnique({
            where: { projectId },
            include: { steps: true }
        });

        if (!workflow) {
            return await this.initializeProjectWorkflow(projectId);
        }

        // If workflow exists but has no steps, initialize them
        if (workflow.steps.length === 0) {
            await this.initializeDefaultSteps(workflow.id);
        }

        return workflow;
    }
}

module.exports = WorkflowInitializationService;