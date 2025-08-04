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

            // CRITICAL FIX: Generate alerts for the next active line items
            await this.generateNextStepAlerts(projectId);

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
     * CRITICAL: Generate alerts for the next active line items after completing a step
     */
    static async generateNextStepAlerts(projectId) {
        try {
            console.log(`🔄 Generating alerts for next active steps in project ${projectId}`);
            
            // Get the project with workflow steps
            const project = await prisma.project.findUnique({
                where: { id: projectId },
                include: {
                    customer: true,
                    projectManager: true,
                    workflow: {
                        include: {
                            steps: {
                                where: { isCompleted: false },
                                orderBy: { stepOrder: 'asc' },
                                take: 5 // Get up to 5 next steps to create alerts for
                            }
                        }
                    }
                }
            });

            if (!project || !project.workflow || !project.workflow.steps.length) {
                console.log(`⚠️ No active workflow steps found for project ${projectId}`);
                return;
            }

            // Create alerts for all active (incomplete) steps
            for (const step of project.workflow.steps) {
                // Check if alert already exists for this step
                const existingAlert = await prisma.workflowAlert.findFirst({
                    where: {
                        projectId: projectId,
                        stepId: step.id,
                        status: 'ACTIVE'
                    }
                });

                if (!existingAlert) {
                    // Create alert for this step
                    await prisma.workflowAlert.create({
                        data: {
                            type: 'Work Flow Line Item',
                            priority: step.alertPriority || 'MEDIUM',
                            status: 'ACTIVE',
                            title: `${step.stepName} - ${project.customer?.primaryName || project.projectName}`,
                            message: `${step.stepName} is ready to begin for project ${project.projectName}`,
                            stepName: step.stepName,
                            responsibleRole: step.defaultResponsible || 'OFFICE',
                            isRead: false,
                            dueDate: step.scheduledEndDate || new Date(Date.now() + 24 * 60 * 60 * 1000),
                            projectId: project.id,
                            workflowId: project.workflow.id,
                            stepId: step.id,
                            assignedToId: step.assignedToId,
                            createdById: null, // System generated
                            metadata: {
                                phase: step.phase,
                                section: this.getStepSection(step.stepName),
                                lineItem: step.stepName,
                                projectName: project.projectName,
                                customerName: project.customer?.primaryName,
                                cleanTaskName: this.getCleanTaskName(step.stepName),
                                autoGenerated: true,
                                generatedAt: new Date().toISOString()
                            }
                        }
                    });

                    console.log(`📨 Created alert for step: ${step.stepName} in project ${project.projectName}`);
                }
            }
            
        } catch (error) {
            console.error('❌ Error generating next step alerts:', error);
        }
    }

    /**
     * Helper method to determine section from step name
     */
    static getStepSection(stepName) {
        const sectionMappings = {
            'Input Customer Information': 'Input Customer Information',
            'Complete Questions': 'Complete Questions to Ask Checklist',
            'Input Lead Property': 'Input Lead Property Information',
            'Assign A Project Manager': 'Assign A Project Manager',
            'Schedule Initial Inspection': 'Schedule Initial Inspection',
            'Site Inspection': 'Site Inspection',
            'Write Estimate': 'Write Estimate',
            'Present Estimate': 'Present Estimate',
            'Follow Up': 'Follow Up',
            'Contract & Permitting': 'Contract & Permitting',
            'Production Order': 'Production Order',
            'Schedule Job': 'Schedule Job',
            'Job Preparation': 'Job Preparation',
            'Installation': 'Installation',
            'Quality Control': 'Quality Control',
            'Final Inspection': 'Final Inspection',
            'Supplement Assessment': 'Supplement Assessment',
            'Additional Work': 'Additional Work',
            'Project Closeout': 'Project Closeout',
            'Customer Satisfaction': 'Customer Satisfaction'
        };
        
        // Try direct mapping first
        for (const [key, section] of Object.entries(sectionMappings)) {
            if (stepName.includes(key)) {
                return section;
            }
        }
        
        // Default fallback
        return stepName.split(' - ')[0] || stepName;
    }

    /**
     * Helper method to get clean task name
     */
    static getCleanTaskName(stepName) {
        const taskMap = {
            'Input Customer Information': 'Customer info',
            'Complete Questions to Ask Checklist': 'Initial questionnaire', 
            'Input Lead Property Information': 'Property details',
            'Assign A Project Manager': 'PM assignment',
            'Schedule Initial Inspection': 'Schedule inspection',
            'Site Inspection': 'Site inspection',
            'Write Estimate': 'Create estimate',
            'Insurance Process': 'Insurance process',
            'Agreement Preparation': 'Prepare agreement',
            'Agreement Signing': 'Contract signing',
            'Administrative Setup': 'Admin setup',
            'Pre-Job Actions': 'Permit approval',
            'Prepare for Production': 'Production prep',
            'Verify Labor Orders': 'Labor scheduling',
            'Verify Material Orders': 'Material delivery',
            'Installation Process': 'Installation',
            'Quality Check': 'Quality inspect',
            'Daily Progress Documentation': 'Progress update',
            'Customer Updates': 'Customer update',
            'Subcontractor Coordination': 'Crew scheduling',
            'Create Supplement in Xactimate': 'Insurance supplement',
            'Insurance Follow-up': 'Insurance follow-up',
            'Final Inspection': 'Final inspection',
            'Financial Processing': 'Invoice payment',
            'AR Follow-Up': 'Payment follow-up',
            'Project Closeout': 'Project closeout',
            'Warranty Registration': 'Warranty setup'
        };
        
        return taskMap[stepName] || stepName.replace(/^(Input|Complete|Schedule|Create|Process|Prepare|Verify|Conduct)\s+/, '').toLowerCase();
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