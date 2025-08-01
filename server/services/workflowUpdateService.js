/**
 * Workflow Update Service
 * CRITICAL: This service handles updating project.phase when workflow items are completed
 */

const { prisma } = require('../config/prisma');

class WorkflowUpdateService {
    /**
     * Update workflow step completion and calculate new phase
     */
    static async updateWorkflowStep(projectId, stepId, isCompleted) {
        try {
            console.log(`🔄 Updating workflow step ${stepId} for project ${projectId} - completed: ${isCompleted}`);
            
            // Get the project with all workflow data
            const project = await prisma.project.findUnique({
                where: { id: projectId },
                include: {
                    workflow: {
                        include: {
                            steps: true
                        }
                    }
                }
            });

            if (!project || !project.workflow) {
                throw new Error('Project or workflow not found');
            }

            // Update the specific step
            await prisma.workflowStep.update({
                where: { id: stepId },
                data: {
                    isCompleted: isCompleted,
                    completedAt: isCompleted ? new Date() : null
                }
            });

            // Calculate the new phase based on workflow progress
            const newPhase = await this.calculateCurrentPhase(projectId);
            const newProgress = await this.calculateProjectProgress(projectId);

            // Update the project with new phase and progress
            const updatedProject = await prisma.project.update({
                where: { id: projectId },
                data: {
                    phase: newPhase,
                    progress: newProgress,
                    updatedAt: new Date()
                }
            });

            console.log(`✅ Updated project ${projectId} - Phase: ${newPhase}, Progress: ${newProgress}%`);

            // Generate alerts for the new phase if needed
            await this.generatePhaseAlerts(projectId, newPhase);

            return updatedProject;
        } catch (error) {
            console.error('❌ Error updating workflow step:', error);
            throw error;
        }
    }

    /**
     * Calculate current phase based on workflow completion
     */
    static async calculateCurrentPhase(projectId) {
        const workflow = await prisma.workflow.findFirst({
            where: { projectId },
            include: {
                steps: {
                    orderBy: { order: 'asc' }
                }
            }
        });

        if (!workflow || !workflow.steps.length) {
            return 'Lead';
        }

        // Define phase progression based on workflow sections
        const phaseProgression = {
            'LEAD': ['Input Customer Information'],
            'PROSPECT': ['Initial Inspection', 'Site Inspection', 'Write Estimate'],
            'APPROVED': ['Contract & Permitting', 'Agreement Signing'],
            'EXECUTION': ['Material Ordering', 'Installation', 'Quality Check'],
            'SECOND_SUPP': ['Create Supp in Xactimate', 'Follow-Up Calls', 'Review Approved Supp'],
            'COMPLETION': ['Financial Processing', 'Project Closeout', 'Customer Follow-Up']
        };

        // Find the highest completed phase
        let currentPhase = 'Lead';
        
        for (const [phase, sections] of Object.entries(phaseProgression)) {
            // Check if all sections in this phase are completed
            const phaseSections = workflow.steps.filter(step => 
                sections.some(section => step.section?.includes(section))
            );
            
            if (phaseSections.length === 0) continue;
            
            const allCompleted = phaseSections.every(step => step.isCompleted);
            
            if (allCompleted) {
                currentPhase = this.normalizePhaseForDatabase(phase);
            } else {
                // If we find an incomplete phase, this is our current phase
                return this.normalizePhaseForDatabase(phase);
            }
        }

        return currentPhase;
    }

    /**
     * Calculate overall project progress
     */
    static async calculateProjectProgress(projectId) {
        const workflow = await prisma.workflow.findFirst({
            where: { projectId },
            include: {
                steps: true
            }
        });

        if (!workflow || !workflow.steps.length) {
            return 0;
        }

        const totalSteps = workflow.steps.length;
        const completedSteps = workflow.steps.filter(step => step.isCompleted).length;

        return Math.round((completedSteps / totalSteps) * 100);
    }

    /**
     * Normalize phase name for database storage
     */
    static normalizePhaseForDatabase(phase) {
        const phaseMap = {
            'LEAD': 'Lead',
            'PROSPECT': 'Prospect',
            'APPROVED': 'Approved',
            'EXECUTION': 'Execution',
            'EXECUTE': 'Execution',
            'SECOND_SUPP': '2nd Supp',
            '2ND_SUPP': '2nd Supp',
            'COMPLETION': 'Completion'
        };

        return phaseMap[phase.toUpperCase()] || 'Lead';
    }

    /**
     * Generate alerts when entering a new phase
     */
    static async generatePhaseAlerts(projectId, newPhase) {
        try {
            // Check if we need to generate alerts for this phase
            const alertConfig = {
                'Prospect': {
                    title: 'Site Inspection Required',
                    message: 'Project has entered Prospect phase. Schedule site inspection.',
                    assignedTo: 'FIELD_DIRECTOR'
                },
                'Approved': {
                    title: 'Contract & Permitting',
                    message: 'Project approved! Initiate contract and permitting process.',
                    assignedTo: 'ADMINISTRATION'
                },
                'Execution': {
                    title: 'Installation Ready',
                    message: 'Project ready for execution. Schedule installation crew.',
                    assignedTo: 'ROOF_SUPERVISOR'
                },
                '2nd Supp': {
                    title: 'Supplement Processing',
                    message: 'Second supplement phase initiated. Create Xactimate documentation.',
                    assignedTo: 'PROJECT_MANAGER'
                },
                'Completion': {
                    title: 'Project Completion',
                    message: 'Project entering completion phase. Process final payments.',
                    assignedTo: 'OFFICE'
                }
            };

            const config = alertConfig[newPhase];
            if (config) {
                // Check if alert already exists
                const existingAlert = await prisma.workflowAlert.findFirst({
                    where: {
                        projectId,
                        title: config.title,
                        createdAt: {
                            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Within last 24 hours
                        }
                    }
                });

                if (!existingAlert) {
                    await prisma.workflowAlert.create({
                        data: {
                            projectId,
                            type: 'PHASE_CHANGE',
                            title: config.title,
                            message: config.message,
                            priority: 'HIGH',
                            status: 'ACTIVE',
                            assignedTo: config.assignedTo,
                            metadata: {
                                phase: newPhase,
                                generatedAt: new Date().toISOString()
                            }
                        }
                    });
                    console.log(`🔔 Generated phase alert for ${newPhase}`);
                }
            }
        } catch (error) {
            console.error('❌ Error generating phase alerts:', error);
        }
    }
}

module.exports = WorkflowUpdateService;