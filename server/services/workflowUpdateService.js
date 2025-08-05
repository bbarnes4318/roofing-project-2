/**
 * Workflow Update Service
 * CRITICAL: This service handles updating project.phase when workflow items are completed
 */

const { prisma } = require('../config/prisma');
const WorkflowInitializationService = require('./workflowInitializationService');

class WorkflowUpdateService {
    /**
     * Update workflow step completion and calculate new phase
     */
    static async updateWorkflowStep(projectId, stepId, isCompleted) {
        try {
            console.log(`🔄 Updating workflow step ${stepId} for project ${projectId} - completed: ${isCompleted}`);
            
            // Get the project
            const project = await prisma.project.findUnique({
                where: { id: projectId }
            });

            if (!project) {
                throw new Error('Project not found');
            }
            
            // Ensure workflow exists
            const workflow = await WorkflowInitializationService.ensureWorkflowExists(projectId);
            
            if (!workflow) {
                throw new Error('Failed to initialize workflow');
            }

            // Check if stepId is in frontend format (e.g., "LEAD-input-customer-info-0")
            let workflowStep = null;
            if (stepId.includes('-')) {
                // Parse the frontend stepId format
                const parts = stepId.split('-');
                const phase = parts[0];
                const itemId = parts.slice(1, -1).join('-');
                const subIndex = parseInt(parts[parts.length - 1]);
                
                console.log(`🔍 Parsing frontend stepId: phase=${phase}, itemId=${itemId}, subIndex=${subIndex}`);
                
                // Try to find or create the workflow step
                workflowStep = await prisma.workflowStep.findFirst({
                    where: {
                        workflowId: project.workflow.id,
                        stepId: stepId
                    }
                });
                
                if (!workflowStep) {
                    // Create the workflow step if it doesn't exist
                    console.log(`📝 Creating new workflow step for ${stepId}`);
                    
                    // Map the step to proper workflow structure
                    const stepMapping = this.getStepMappingFromFrontendId(stepId);
                    
                    workflowStep = await prisma.workflowStep.create({
                        data: {
                            stepId: stepId,
                            stepName: stepMapping.stepName,
                            description: stepMapping.description,
                            phase: this.mapPhaseToEnum(phase),
                            defaultResponsible: stepMapping.responsible || 'OFFICE',
                            estimatedDuration: 60,
                            isCompleted: isCompleted,
                            completedAt: isCompleted ? new Date() : null,
                            workflowId: project.workflow.id,
                            alertPriority: 'MEDIUM',
                            alertDays: 1,
                            overdueIntervals: [1, 3, 7, 14]
                        }
                    });
                }
            } else {
                // Standard database ID format
                workflowStep = await prisma.workflowStep.findUnique({
                    where: { id: stepId }
                });
            }
            
            if (!workflowStep) {
                throw new Error(`Workflow step ${stepId} not found`);
            }

            // Update the specific step
            await prisma.workflowStep.update({
                where: { id: workflowStep.id },
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
     * Map frontend phase ID to database enum
     */
    static mapPhaseToEnum(phaseId) {
        const phaseEnumMap = {
            'LEAD': 'LEAD',
            'PROSPECT': 'PROSPECT',
            'PROSPECT_NON_INSURANCE': 'PROSPECT',
            'APPROVED': 'APPROVED',
            'EXECUTION': 'EXECUTION',
            'SUPPLEMENT': 'SECOND_SUPP',
            'COMPLETION': 'COMPLETION'
        };
        return phaseEnumMap[phaseId.toUpperCase()] || 'LEAD';
    }

    /**
     * Get step mapping from frontend ID format
     */
    static getStepMappingFromFrontendId(stepId) {
        // Default mapping for common patterns
        const stepMappings = {
            'input-customer-info': {
                stepName: 'Input Customer Information',
                description: 'Input customer contact and property information',
                responsible: 'OFFICE'
            },
            'complete-questions': {
                stepName: 'Complete Questions to Ask Checklist',
                description: 'Complete initial customer questionnaire',
                responsible: 'OFFICE'
            },
            'input-lead-property': {
                stepName: 'Input Lead Property Information',
                description: 'Add property photos and details',
                responsible: 'OFFICE'
            },
            'assign-pm': {
                stepName: 'Assign A Project Manager',
                description: 'Assign and brief the project manager',
                responsible: 'OFFICE'
            },
            'schedule-inspection': {
                stepName: 'Schedule Initial Inspection',
                description: 'Schedule site inspection with customer',
                responsible: 'OFFICE'
            },
            'site-inspection': {
                stepName: 'Site Inspection',
                description: 'Conduct on-site inspection and documentation',
                responsible: 'PROJECT_MANAGER'
            },
            'write-estimate': {
                stepName: 'Write Estimate',
                description: 'Create project estimate',
                responsible: 'PROJECT_MANAGER'
            },
            'insurance-process': {
                stepName: 'Insurance Process',
                description: 'Process insurance claim and documentation',
                responsible: 'ADMINISTRATION'
            },
            'agreement-prep': {
                stepName: 'Agreement Preparation',
                description: 'Prepare contract and agreement documents',
                responsible: 'ADMINISTRATION'
            },
            'agreement-signing': {
                stepName: 'Agreement Signing',
                description: 'Get customer signatures on agreements',
                responsible: 'ADMINISTRATION'
            },
            'admin-setup': {
                stepName: 'Administrative Setup',
                description: 'Set up project administration',
                responsible: 'ADMINISTRATION'
            },
            'pre-job': {
                stepName: 'Pre-Job Actions',
                description: 'Complete pre-job requirements',
                responsible: 'OFFICE'
            },
            'prepare-production': {
                stepName: 'Prepare for Production',
                description: 'Prepare materials and crew for production',
                responsible: 'ADMINISTRATION'
            },
            'installation': {
                stepName: 'Installation',
                description: 'Execute roofing installation',
                responsible: 'FIELD_DIRECTOR'
            },
            'quality-check': {
                stepName: 'Quality Check',
                description: 'Perform quality inspection',
                responsible: 'ROOF_SUPERVISOR'
            },
            'multiple-trades': {
                stepName: 'Multiple Trades',
                description: 'Coordinate multiple trade work',
                responsible: 'ADMINISTRATION'
            },
            'subcontractor-work': {
                stepName: 'Subcontractor Work',
                description: 'Manage subcontractor activities',
                responsible: 'ADMINISTRATION'
            },
            'update-customer': {
                stepName: 'Update Customer',
                description: 'Provide customer updates',
                responsible: 'ADMINISTRATION'
            },
            'create-supp': {
                stepName: 'Create Supp in Xactimate',
                description: 'Create supplement in Xactimate',
                responsible: 'ADMINISTRATION'
            },
            'followup-calls': {
                stepName: 'Follow-Up Calls',
                description: 'Make insurance follow-up calls',
                responsible: 'ADMINISTRATION'
            },
            'review-approved': {
                stepName: 'Review Approved Supp',
                description: 'Review approved supplement',
                responsible: 'ADMINISTRATION'
            },
            'customer-update': {
                stepName: 'Customer Update',
                description: 'Update customer on supplement status',
                responsible: 'ADMINISTRATION'
            },
            'financial-processing': {
                stepName: 'Financial Processing',
                description: 'Process project financials',
                responsible: 'ADMINISTRATION'
            },
            'project-closeout': {
                stepName: 'Project Closeout',
                description: 'Complete project closeout procedures',
                responsible: 'OFFICE'
            }
        };
        
        // Extract item ID from stepId
        const parts = stepId.split('-');
        const itemId = parts.slice(1, -1).join('-');
        
        return stepMappings[itemId] || {
            stepName: itemId.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' '),
            description: `Complete ${itemId.replace(/-/g, ' ')}`,
            responsible: 'OFFICE'
        };
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
                    // Parse step ID to get phase and section info
                    let phase = step.phase;
                    let section = step.stepName;
                    let lineItem = step.stepName;
                    
                    // If stepId is in frontend format (e.g., "LEAD-input-customer-info-0")
                    if (step.stepId && step.stepId.includes('-')) {
                        const parts = step.stepId.split('-');
                        const phaseId = parts[0];
                        const itemId = parts.slice(1, -1).join('-');
                        const subIndex = parts[parts.length - 1];
                        
                        // Map to proper section names
                        section = this.getStepSection(step.stepName);
                        lineItem = `Subtask ${parseInt(subIndex) + 1} of ${step.stepName}`;
                    }
                    
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
                                phase: phase,
                                section: section,
                                lineItem: lineItem,
                                projectName: project.projectName,
                                projectNumber: project.projectNumber,
                                customerName: project.customer?.primaryName,
                                cleanTaskName: this.getCleanTaskName(step.stepName),
                                stepId: step.id,
                                workflowId: project.workflow.id,
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