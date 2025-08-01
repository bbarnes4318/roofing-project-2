/**
 * Frontend Workflow Progress Service
 * Mirrors the backend calculation for consistency
 */

// Phase definitions with weights (same as backend)
const PHASES = {
  LEAD: { name: "Lead", weight: 10, steps: [] },
  PROSPECT: { name: "Prospect", weight: 15, steps: [] },
  PROSPECT_NON_INSURANCE: { name: "Prospect: Non-Insurance", weight: 15, steps: [] },
  APPROVED: { name: "Approved", weight: 15, steps: [] },
  EXECUTION: { name: "Execution", weight: 40, steps: [] },
  SECOND_SUPP: { name: "2nd Supp", weight: 10, steps: [] },
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
  PROSPECT_NON_INSURANCE: [
    { id: "write_estimate", name: "Write Estimate", weight: 4 },
    { id: "agreement_signing", name: "Agreement Signing", weight: 3 }
  ],
  APPROVED: [
    { id: "agreement_signing", name: "Agreement Signing", weight: 3 }
  ],
  EXECUTION: [
    { id: "installation", name: "Installation", weight: 10 },
    { id: "quality_check", name: "Quality Check", weight: 5 }
  ],
  SECOND_SUPP: [
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
            PROSPECT: { bg: 'bg-[#3B82F6]', text: 'text-white', hex: '#3B82F6' },
            APPROVED: { bg: 'bg-[#10B981]', text: 'text-white', hex: '#10B981' },
            EXECUTION: { bg: 'bg-[#F59E0B]', text: 'text-white', hex: '#F59E0B' },
            SECOND_SUPP: { bg: 'bg-[#8B5CF6]', text: 'text-white', hex: '#8B5CF6' },
            '2ND_SUPP': { bg: 'bg-[#8B5CF6]', text: 'text-white', hex: '#8B5CF6' },
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
}

export default WorkflowProgressService; 