/**
 * Frontend Workflow Progress Service
 * Mirrors the backend calculation for consistency
 */

// Phase definitions with weights (same as backend)
const PHASES = {
  LEAD: { name: "Lead", weight: 10, steps: [] },
  PROSPECT: { name: "Prospect", weight: 15, steps: [] },
  APPROVED: { name: "Approved", weight: 15, steps: [] },
  EXECUTION: { name: "Execution", weight: 40, steps: [] },
  SECOND_SUPPLEMENT: { name: "2nd Supplement", weight: 10, steps: [] },
  COMPLETION: { name: "Completion", weight: 10, steps: [] }
};

// Step definitions with individual weights - Updated to match actual database step IDs
const WORKFLOW_STEPS = {
  LEAD: [
    { id: "input_customer_info", name: "Input Customer Information", weight: 2 }
  ],
  PROSPECT: [
    { id: "site_inspection", name: "Site Inspection", weight: 4 },
    { id: "write_estimate", name: "Write Estimate", weight: 3 }
  ],
  APPROVED: [
    { id: "agreement_signing", name: "Agreement Signing", weight: 3 }
  ],
  EXECUTION: [
    { id: "installation", name: "Installation", weight: 10 },
    { id: "quality_check", name: "Quality Check", weight: 5 }
  ],
  SECOND_SUPPLEMENT: [
    { id: "supplement_1", name: "Create Supp in Xactimate", weight: 3 },
    { id: "supplement_2", name: "Follow-Up Calls", weight: 2 },
    { id: "supplement_3", name: "Review Approved Supp", weight: 3 },
    { id: "supplement_4", name: "Customer Update", weight: 2 }
  ],
  COMPLETION: [
    { id: "financial_processing", name: "Financial Processing", weight: 5 },
    { id: "project_closeout", name: "Project Closeout", weight: 5 }
  ]
};

class WorkflowProgressService {
    
    /**
     * Calculate project completion percentage based on workflow steps
     * @param {Object} project - Project object with workflow data
     * @returns {Object} Progress data with overall percentage and breakdown
     */
    static calculateProjectProgress(project) {
        if (!project || !project.workflow || !project.workflow.steps) {
            return {
                overall: 0,
                phaseBreakdown: {},
                stepBreakdown: {},
                totalWeight: 0,
                completedWeight: 0
            };
        }

        const workflow = project.workflow;
        const steps = workflow.steps || [];
        
        // Calculate progress for each phase
        const phaseBreakdown = {};
        let totalWeight = 0;
        let completedWeight = 0;

        // Process each phase
        Object.keys(PHASES).forEach(phaseKey => {
            const phase = PHASES[phaseKey];
            const phaseSteps = WORKFLOW_STEPS[phaseKey] || [];
            
            let phaseWeight = 0;
            let phaseCompletedWeight = 0;
            const stepBreakdown = {};

            // Process each step in the phase
            phaseSteps.forEach(stepDef => {
                const step = steps.find(s => s.stepId === stepDef.id);
                const stepWeight = stepDef.weight;
                
                // Check if step is conditional and should be included
                const shouldIncludeStep = !stepDef.conditional || this.shouldIncludeConditionalStep(stepDef, project);
                
                if (shouldIncludeStep) {
                    phaseWeight += stepWeight;
                    
                    if (step && step.isCompleted) {
                        phaseCompletedWeight += stepWeight;
                    }
                    
                    stepBreakdown[stepDef.id] = {
                        name: stepDef.name,
                        weight: stepWeight,
                        isCompleted: step ? step.isCompleted : false,
                        isConditional: stepDef.conditional || false,
                        isDynamic: stepDef.dynamic || false
                    };
                }
            });

            // Calculate phase percentage
            const phasePercentage = phaseWeight > 0 ? Math.round((phaseCompletedWeight / phaseWeight) * 100) : 0;
            
            phaseBreakdown[phaseKey] = {
                name: phase.name,
                weight: phaseWeight,
                completedWeight: phaseCompletedWeight,
                percentage: phasePercentage,
                steps: stepBreakdown
            };

            totalWeight += phaseWeight;
            completedWeight += phaseCompletedWeight;
        });

        // Calculate overall progress
        const overallProgress = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

        return {
            overall: overallProgress,
            phaseBreakdown,
            totalWeight,
            completedWeight,
            stepBreakdown: this.getStepBreakdown(steps)
        };
    }

    /**
     * Determine if a conditional step should be included based on project characteristics
     * @param {Object} stepDef - Step definition
     * @param {Object} project - Project object
     * @returns {boolean} True if step should be included
     */
    static shouldIncludeConditionalStep(stepDef, project) {
        const stepId = stepDef.id;
        
        // Logic for conditional steps based on step ID
        // Note: Most steps in the current database are not conditional
        switch (stepId) {
            case 'supplement_1': // Create Supp in Xactimate
                return project.projectType && ['ROOF_REPLACEMENT', 'FULL_EXTERIOR'].includes(project.projectType);
            
            case 'supplement_2': // Follow-Up Calls
                return project.projectType && ['ROOF_REPLACEMENT', 'FULL_EXTERIOR', 'KITCHEN_REMODEL'].includes(project.projectType);
            
            case 'supplement_3': // Review Approved Supp
                return project.projectType && ['FULL_EXTERIOR', 'KITCHEN_REMODEL'].includes(project.projectType);
            
            case 'supplement_4': // Customer Update
                return project.projectType && ['FULL_EXTERIOR', 'KITCHEN_REMODEL'].includes(project.projectType);
            
            default:
                return true;
        }
    }

    /**
     * Get detailed breakdown of steps by completion status
     * @param {Array} steps - Workflow steps
     * @returns {Object} Step breakdown
     */
    static getStepBreakdown(steps) {
        const breakdown = {
            total: steps.length,
            completed: steps.filter(s => s.isCompleted).length,
            byPhase: {},
            byStatus: {
                completed: 0,
                inProgress: 0,
                notStarted: 0
            }
        };

        // Group by phase
        steps.forEach(step => {
            const phase = step.phase || 'Unknown';
            if (!breakdown.byPhase[phase]) {
                breakdown.byPhase[phase] = { total: 0, completed: 0 };
            }
            breakdown.byPhase[phase].total++;
            if (step.isCompleted) {
                breakdown.byPhase[phase].completed++;
                breakdown.byStatus.completed++;
            } else if (step.actualStartDate) {
                breakdown.byStatus.inProgress++;
            } else {
                breakdown.byStatus.notStarted++;
            }
        });

        return breakdown;
    }

    /**
     * Get current phase based on workflow progress
     * @param {Object} project - Project object with workflow data
     * @returns {string} Current phase key
     */
    static getCurrentPhase(project) {
        if (!project || !project.workflow || !project.workflow.steps) {
            return 'LEAD';
        }

        const progress = this.calculateProjectProgress(project);
        const phases = Object.keys(PHASES);
        
        // Find the first phase that's not 100% complete
        for (const phaseKey of phases) {
            const phaseProgress = progress.phaseBreakdown[phaseKey];
            if (phaseProgress && phaseProgress.percentage < 100) {
                return phaseKey;
            }
        }

        return 'COMPLETION';
    }

    /**
     * Get next steps for a project
     * @param {Object} project - Project object with workflow data
     * @returns {Array} Array of next steps
     */
    static getNextSteps(project) {
        if (!project || !project.workflow || !project.workflow.steps) {
            return [];
        }

        const currentPhase = this.getCurrentPhase(project);
        const progress = this.calculateProjectProgress(project);
        const phaseBreakdown = progress.phaseBreakdown[currentPhase];
        
        if (!phaseBreakdown) {
            return [];
        }

        const nextSteps = [];
        Object.values(phaseBreakdown.steps).forEach(step => {
            if (!step.isCompleted) {
                nextSteps.push({
                    stepId: step.stepId,
                    name: step.name,
                    phase: currentPhase,
                    weight: step.weight,
                    isConditional: step.isConditional,
                    isDynamic: step.isDynamic
                });
            }
        });

        return nextSteps;
    }

    /**
     * Get phase color for UI display
     * @param {string} phaseKey - Phase key
     * @returns {Object} Object with background color and text color classes for colored background circles
     */
    static getPhaseColor(phaseKey) {
        const colors = {
            LEAD: { bg: 'bg-[#E0E7FF]', text: 'text-gray-800', hex: '#E0E7FF' },
            PROSPECT: { bg: 'bg-[#0066CC]', text: 'text-white', hex: '#0066CC' },
            APPROVED: { bg: 'bg-[#10B981]', text: 'text-white', hex: '#10B981' },
            EXECUTION: { bg: 'bg-[#F59E0B]', text: 'text-white', hex: '#F59E0B' },
            SECOND_SUPPLEMENT: { bg: 'bg-[#8B5CF6]', text: 'text-white', hex: '#8B5CF6' },
            COMPLETION: { bg: 'bg-[#14532D]', text: 'text-white', hex: '#14532D' }
        };
        return colors[phaseKey] || { bg: 'bg-[#E0E7FF]', text: 'text-gray-800', hex: '#E0E7FF' };
    }

    /**
     * Get phase display name
     * @param {string} phaseKey - Phase key
     * @returns {string} Display name
     */
    static getPhaseName(phaseKey) {
        return PHASES[phaseKey]?.name || phaseKey;
    }

    /**
     * CENTRALIZED PHASE DETECTION - Used by ALL components throughout the app
     * This is the single source of truth for determining project phases
     * @param {Object} project - Project object with workflow/phase data
     * @param {Object} activity - Optional activity/alert metadata
     * @returns {string} Current phase key (LEAD, PROSPECT, APPROVED, EXECUTION, SUPPLEMENT, COMPLETION, etc.)
     */
    static getProjectPhase(project, activity = null) {
        // Priority 1: Use activity metadata phase if provided (for alerts)
        if (activity?.metadata?.phase) {
            return this.normalizePhase(activity.metadata.phase);
        }

        // Priority 2: Use workflow progress if available
        if (project?.workflow?.steps && project.workflow.steps.length > 0) {
            // Find the most recently completed step to determine actual current phase
            const completedSteps = project.workflow.steps
                .filter(step => step.isCompleted)
                .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
            
            const incompleteSteps = project.workflow.steps
                .filter(step => !step.isCompleted)
                .sort((a, b) => a.stepId.localeCompare(b.stepId));
            
            // If there are incomplete steps, use the phase of the first incomplete step
            if (incompleteSteps.length > 0) {
                return this.normalizePhase(incompleteSteps[0].phase);
            } 
            // If all steps are complete, use the phase of the last completed step
            else if (completedSteps.length > 0) {
                return this.normalizePhase(completedSteps[0].phase);
            }
        }

        // Priority 3: Use project.phase field directly
        if (project?.phase) {
            return this.normalizePhase(project.phase);
        }

        // Priority 4: Use project.status and map to phase
        if (project?.status) {
            const statusPhaseMap = {
                'IN_PROGRESS': 'EXECUTION',
                'INPROGRESS': 'EXECUTION', 
                'IN PROGRESS': 'EXECUTION',
                'ACTIVE': 'EXECUTION',
                'PENDING': 'LEAD',
                'NEW': 'LEAD',
                'COMPLETED': 'COMPLETION',
                'COMPLETE': 'COMPLETION',
                'FINISHED': 'COMPLETION',
                'DONE': 'COMPLETION'
            };
            const mappedPhase = statusPhaseMap[project.status.toUpperCase()];
            if (mappedPhase) {
                return this.normalizePhase(mappedPhase);
            }
            return this.normalizePhase(project.status);
        }

        // Priority 5: Fallback to LEAD
        return 'LEAD';
    }

    /**
     * Normalize phase names to consistent format
     * @param {string} phase - Raw phase value
     * @returns {string} Normalized phase key
     */
    static normalizePhase(phase) {
        if (!phase) return 'LEAD';
        
        const phaseStr = String(phase).trim();
        const upperPhase = phaseStr.toUpperCase();
        
        // Normalize all phase variations to the standard 6 phases
        const normalizations = {
            // Lead variations
            'LEAD': 'LEAD',
            'LEADS': 'LEAD',
            
            // Prospect variations  
            'PROSPECT': 'PROSPECT',
            'PROSPECTS': 'PROSPECT',
            
            // Approved variations
            'APPROVED': 'APPROVED',
            'APPROVE': 'APPROVED',
            
            // Execution variations
            'EXECUTION': 'EXECUTION',
            'EXECUTE': 'EXECUTION',
            'EXECUTING': 'EXECUTION',
            'IN_PROGRESS': 'EXECUTION',
            'INPROGRESS': 'EXECUTION',
            'IN PROGRESS': 'EXECUTION',
            'ACTIVE': 'EXECUTION',
            
            // Supplement variations
            'SUPPLEMENT': 'SECOND_SUPPLEMENT',
            '2ND SUPP': 'SECOND_SUPPLEMENT',
            '2ND-SUPP': 'SECOND_SUPPLEMENT', 
            'SECOND SUPP': 'SECOND_SUPPLEMENT',
            'SECOND_SUPP': 'SECOND_SUPPLEMENT',
            '2ND_SUPP': 'SECOND_SUPPLEMENT',
            '2ND SUPPLEMENT': 'SECOND_SUPPLEMENT',
            'SECOND SUPPLEMENT': 'SECOND_SUPPLEMENT',
            'SECOND_SUPPLEMENT': 'SECOND_SUPPLEMENT',
            
            // Completion variations
            'COMPLETION': 'COMPLETION',
            'COMPLETE': 'COMPLETION',
            'COMPLETED': 'COMPLETION',
            'FINISHED': 'COMPLETION',
            'DONE': 'COMPLETION'
        };
        
        if (normalizations[upperPhase]) {
            return normalizations[upperPhase];
        }
        
        // Return uppercase version for standard phases
        const validPhases = ['LEAD', 'PROSPECT', 'APPROVED', 'EXECUTION', 'SECOND_SUPPLEMENT', 'COMPLETION'];
        if (validPhases.includes(upperPhase)) {
            return upperPhase;
        }
        
        // Return original for unrecognized phases
        return phaseStr;
    }

    /**
     * Get all possible phases that exist in the system
     * @returns {Array} Array of phase objects with id, name, color, etc.
     */
    static getAllPhases() {
        return [
            { id: 'LEAD', name: 'Lead', initial: 'L', color: '#E0E7FF', gradientColor: 'from-indigo-200 to-indigo-300', bgColor: 'bg-indigo-50', textColor: 'text-indigo-800', borderColor: 'border-indigo-200' },
            { id: 'PROSPECT', name: 'Prospect', initial: 'P', color: '#0066CC', gradientColor: 'from-brand-500 to-brand-600', bgColor: 'bg-brand-50', textColor: 'text-brand-700', borderColor: 'border-brand-200' },
            { id: 'APPROVED', name: 'Approved', initial: 'A', color: '#10B981', gradientColor: 'from-emerald-500 to-emerald-600', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700', borderColor: 'border-emerald-200' },
            { id: 'EXECUTION', name: 'Execution', initial: 'E', color: '#F59E0B', gradientColor: 'from-amber-500 to-amber-600', bgColor: 'bg-amber-50', textColor: 'text-amber-700', borderColor: 'border-amber-200' },
            { id: 'SECOND_SUPPLEMENT', name: '2nd Supplement', initial: 'S', color: '#8B5CF6', gradientColor: 'from-violet-500 to-violet-600', bgColor: 'bg-violet-50', textColor: 'text-violet-700', borderColor: 'border-violet-200' },
            { id: 'COMPLETION', name: 'Completion', initial: 'C', color: '#14532D', gradientColor: 'from-green-800 to-green-900', bgColor: 'bg-green-50', textColor: 'text-green-800', borderColor: 'border-green-200' }
        ];
    }

    /**
     * Event listeners for phase changes
     */
    static phaseChangeListeners = new Set();

    /**
     * Add listener for phase changes
     * @param {Function} callback - Function to call when phase changes
     */
    static addPhaseChangeListener(callback) {
        this.phaseChangeListeners.add(callback);
        return () => this.phaseChangeListeners.delete(callback);
    }

    /**
     * Notify all listeners that a project's phase has changed
     * @param {Object} project - Project that changed
     * @param {string} oldPhase - Previous phase
     * @param {string} newPhase - New phase
     */
    static notifyPhaseChange(project, oldPhase, newPhase) {
        console.log(`🔄 PHASE CHANGE: Project ${project.id} changed from ${oldPhase} to ${newPhase}`);
        this.phaseChangeListeners.forEach(callback => {
            try {
                callback(project, oldPhase, newPhase);
            } catch (error) {
                console.error('Error in phase change listener:', error);
            }
        });
    }
}

export default WorkflowProgressService; 