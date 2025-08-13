/**
 * Frontend Workflow Progress Service - UPDATED FOR NEW SYSTEM
 * Uses ProjectWorkflowTracker and currentWorkflowItem for consistency
 */

// Phase definitions with weights
const PHASES = {
  LEAD: { name: "Lead", weight: 10 },
  PROSPECT: { name: "Prospect", weight: 15 },
  APPROVED: { name: "Approved", weight: 15 },
  EXECUTION: { name: "Execution", weight: 40 },
  SECOND_SUPPLEMENT: { name: "2nd Supplement", weight: 10 },
  COMPLETION: { name: "Completion", weight: 10 }
};

class WorkflowProgressService {
    
    /**
     * Calculate project completion percentage using currentWorkflowItem
     * @param {Object} project - Project object with currentWorkflowItem
     * @returns {Object} Progress data with overall percentage and breakdown
     */
    static calculateProjectProgress(project) {
        if (!project) {
            return this.getDefaultProgressData();
        }

        // Use currentWorkflowItem for accurate progress calculation
        const currentWorkflow = project.currentWorkflowItem;
        
        if (!currentWorkflow) {
            return this.getDefaultProgressData();
        }

        // If workflow is complete, return 100%
        if (currentWorkflow.isComplete) {
            return {
                overall: 100,
                phaseBreakdown: this.getCompletedPhaseBreakdown(),
                currentPhase: 'COMPLETION',
                currentPhaseDisplay: 'Completion',
                currentSection: null,
                currentLineItem: null,
                totalPhases: Object.keys(PHASES).length,
                completedPhases: Object.keys(PHASES).length,
                hasPhaseOverride: false
            };
        }

        // Calculate progress based on current position
        const currentPhase = currentWorkflow.phase || 'LEAD';
        const phaseKeys = Object.keys(PHASES);
        const currentPhaseIndex = phaseKeys.indexOf(currentPhase);
        
        // Calculate overall progress
        let overallProgress = 0;
        if (currentPhaseIndex >= 0) {
            // Previous phases are 100% complete
            const completedPhaseWeight = phaseKeys.slice(0, currentPhaseIndex)
                .reduce((sum, key) => sum + PHASES[key].weight, 0);
            
            // Current phase is partially complete (assume 50% if active)
            const currentPhaseWeight = PHASES[currentPhase].weight * 0.5;
            
            const totalWeight = Object.values(PHASES).reduce((sum, phase) => sum + phase.weight, 0);
            overallProgress = Math.round(((completedPhaseWeight + currentPhaseWeight) / totalWeight) * 100);
        }

        return {
            overall: Math.min(overallProgress, 95), // Cap at 95% until truly complete
            phaseBreakdown: this.calculatePhaseBreakdown(currentPhase, currentPhaseIndex),
            currentPhase: currentPhase,
            currentPhaseDisplay: currentWorkflow.phaseDisplay || this.formatPhase(currentPhase),
            currentSection: currentWorkflow.section,
            currentLineItem: currentWorkflow.lineItem,
            totalPhases: phaseKeys.length,
            completedPhases: currentPhaseIndex,
            hasPhaseOverride: false
        };
    }

    /**
     * Calculate phase breakdown for progress display
     */
    static calculatePhaseBreakdown(currentPhase, currentPhaseIndex) {
        const breakdown = {};
        const phaseKeys = Object.keys(PHASES);
        
        phaseKeys.forEach((phaseKey, index) => {
            let progress = 0;
            if (index < currentPhaseIndex) {
                progress = 100; // Completed phases
            } else if (index === currentPhaseIndex) {
                progress = 50; // Current phase (partially complete)
            }
            // Future phases remain at 0
            
            breakdown[phaseKey] = {
                name: PHASES[phaseKey].name,
                progress: progress,
                weight: PHASES[phaseKey].weight,
                isCompleted: progress === 100,
                isCurrent: index === currentPhaseIndex,
                isPending: index > currentPhaseIndex
            };
        });
        
        return breakdown;
    }

    /**
     * Get completed phase breakdown (for 100% projects)
     */
    static getCompletedPhaseBreakdown() {
        const breakdown = {};
        Object.keys(PHASES).forEach(phaseKey => {
            breakdown[phaseKey] = {
                name: PHASES[phaseKey].name,
                progress: 100,
                weight: PHASES[phaseKey].weight,
                isCompleted: true,
                isCurrent: false,
                isPending: false
            };
        });
        return breakdown;
    }

    /**
     * Get default progress data for projects without workflow
     */
    static getDefaultProgressData() {
        return {
            overall: 0,
            phaseBreakdown: {},
            currentPhase: 'LEAD',
            currentPhaseDisplay: 'Lead',
            currentSection: 'Not Started',
            currentLineItem: 'No active task',
            totalPhases: Object.keys(PHASES).length,
            completedPhases: 0,
            hasPhaseOverride: false
        };
    }

    /**
     * Format phase name for display
     */
    static formatPhase(phase) {
        if (!phase) return 'Lead';
        return phase.charAt(0).toUpperCase() + phase.slice(1).toLowerCase().replace('_', ' ');
    }

    /**
     * Get phase color for UI display
     */
    static getPhaseColor(phase) {
        const colors = {
            LEAD: '#6B7280',
            PROSPECT: '#3B82F6',
            APPROVED: '#10B981',
            EXECUTION: '#F59E0B',
            SECOND_SUPPLEMENT: '#8B5CF6',
            COMPLETION: '#059669'
        };
        return colors[phase] || '#6B7280';
    }

    /**
     * Get next phase in sequence
     */
    static getNextPhase(currentPhase) {
        const phaseKeys = Object.keys(PHASES);
        const currentIndex = phaseKeys.indexOf(currentPhase);
        
        if (currentIndex >= 0 && currentIndex < phaseKeys.length - 1) {
            return phaseKeys[currentIndex + 1];
        }
        
        return null; // No next phase (workflow complete)
    }

    /**
     * Check if project is in final phase
     */
    static isInFinalPhase(phase) {
        const phaseKeys = Object.keys(PHASES);
        return phase === phaseKeys[phaseKeys.length - 1];
    }

    /**
     * Get workflow status summary
     */
    static getWorkflowStatus(project) {
        if (!project || !project.currentWorkflowItem) {
            return {
                status: 'Not Started',
                phase: 'LEAD',
                progress: 0,
                isComplete: false
            };
        }

        const currentWorkflow = project.currentWorkflowItem;
        
        if (currentWorkflow.isComplete) {
            return {
                status: 'Complete',
                phase: 'COMPLETION',
                progress: 100,
                isComplete: true
            };
        }

        const progressData = this.calculateProjectProgress(project);
        
        return {
            status: 'In Progress',
            phase: currentWorkflow.phase || 'LEAD',
            progress: progressData.overall,
            isComplete: false,
            currentSection: currentWorkflow.section,
            currentTask: currentWorkflow.lineItem
        };
    }

    /**
     * Get all available project phases
     * @returns {Array} Array of phase objects with keys and display names
     */
    static getAllPhases() {
        return Object.keys(PHASES).map(phaseKey => ({
            key: phaseKey,
            name: PHASES[phaseKey].name,
            weight: PHASES[phaseKey].weight,
            color: this.getPhaseColor(phaseKey)
        }));
    }

    /**
     * Get the current phase for a project
     * @param {Object} project - Project object with phase information
     * @returns {string} Current phase key (e.g. 'LEAD', 'EXECUTION', etc.)
     */
    static getProjectPhase(project) {
        if (!project) return 'LEAD';

        // Use currentWorkflowItem if available (new system)
        if (project.currentWorkflowItem && project.currentWorkflowItem.phase) {
            return project.currentWorkflowItem.phase;
        }

        // Fallback to project.phase if available
        if (project.phase) {
            return project.phase;
        }

        // Default fallback
        return 'LEAD';
    }

    /**
     * Get the display name for a phase
     * @param {string} phaseKey - Phase key (e.g. 'LEAD', 'EXECUTION')
     * @returns {string} Display name (e.g. 'Lead', 'Execution')
     */
    static getPhaseName(phaseKey) {
        if (!phaseKey) return 'Lead';
        const normalizedKey = this.normalizePhase(phaseKey);
        return PHASES[normalizedKey]?.name || this.formatPhase(phaseKey);
    }

    /**
     * Normalize phase key to standard format
     * @param {string} phase - Raw phase string
     * @returns {string} Normalized phase key
     */
    static normalizePhase(phase) {
        if (!phase) return 'LEAD';
        
        const normalized = phase.toUpperCase()
            .replace(/\s*PHASE$/i, '')
            .replace('PHASE-', '')
            .replace('PHASE', '')
            .replace(/-INSURANCE-1ST SUPPLEMENT/i, '')
            .replace('2ND SUPPLEMENT', 'SECOND_SUPPLEMENT')
            .replace('2ND SUPP', 'SECOND_SUPPLEMENT')
            .replace('EXECUTE', 'EXECUTION')
            .trim();
            
        // Map common variations
        const phaseMap = {
            'LEAD': 'LEAD',
            'PROSPECT': 'PROSPECT',
            'APPROVED': 'APPROVED',
            'EXECUTION': 'EXECUTION',
            'EXECUTE': 'EXECUTION',
            'SECOND_SUPPLEMENT': 'SECOND_SUPPLEMENT',
            '2ND_SUPPLEMENT': 'SECOND_SUPPLEMENT',
            'SUPPLEMENT': 'SECOND_SUPPLEMENT',
            'COMPLETION': 'COMPLETION',
            'COMPLETE': 'COMPLETION'
        };
        
        return phaseMap[normalized] || 'LEAD';
    }

    /**
     * Notify listeners of phase changes
     * @param {Object} project - Updated project
     * @param {string} oldPhase - Previous phase
     * @param {string} newPhase - New phase
     */
    static notifyPhaseChange(project, oldPhase, newPhase) {
        if (oldPhase !== newPhase) {
            console.log(`🔄 Phase change for project ${project.projectNumber}: ${oldPhase} → ${newPhase}`);
            
            // Emit custom event for phase change
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('workflowPhaseChange', {
                    detail: { project, oldPhase, newPhase }
                }));
            }
        }
    }

    /**
     * DEPRECATED: Legacy method for backward compatibility
     * @deprecated Use calculateProjectProgress instead
     */
    static calculateProgress(project) {
        console.warn('WorkflowProgressService.calculateProgress is deprecated. Use calculateProjectProgress instead.');
        return this.calculateProjectProgress(project);
    }
}

export default WorkflowProgressService;