/**
 * Centralized Workflow Data Service
 * CRITICAL: This is the SINGLE SOURCE OF TRUTH for all workflow-related data
 * ALL components must use this service to ensure 100% consistency
 */

import WorkflowProgressService from './workflowProgress';

class WorkflowDataService {
    static cache = new Map();
    static listeners = new Set();

    /**
     * MAIN METHOD: Get complete workflow state for a project
     * This ensures ALL components show identical data
     */
    static getProjectWorkflowState(project) {
        if (!project) return this.getDefaultState();

        const cacheKey = `${project.id}_${project.updatedAt || Date.now()}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const workflowState = this.calculateWorkflowState(project);
        this.cache.set(cacheKey, workflowState);
        
        return workflowState;
    }

    /**
     * Calculate the complete workflow state for a project
     */
    static calculateWorkflowState(project) {
        // CRITICAL: Use project.phase FIRST, only calculate if missing
        let currentPhase = project.phase || 'Lead';
        
        // Normalize the phase name to match the phase keys
        currentPhase = this.normalizePhaseKey(currentPhase);
        
        // Use the existing WorkflowProgressService for calculations
        // BUT prefer the project's actual progress value if available
        let overallProgress = project.progress || 0;
        const progress = WorkflowProgressService.calculateProjectProgress(project);
        
        // Use calculated progress only if project doesn't have a progress value
        if (!project.progress && progress.overall) {
            overallProgress = progress.overall;
        }
        
        const nextSteps = WorkflowProgressService.getNextSteps(project);

        // Get current section and line item
        const currentSection = this.getCurrentSection(project);
        const currentLineItem = this.getCurrentLineItem(project);

        // Get phase configuration
        const phaseConfig = this.getPhaseConfig(currentPhase);

        return {
            // Core workflow data
            projectId: project.id,
            currentPhase: currentPhase,
            currentPhaseDisplay: this.formatPhaseDisplay(currentPhase),
            currentSection: currentSection,
            currentSectionDisplay: this.formatSectionDisplay(currentSection),
            currentLineItem: currentLineItem,
            currentLineItemDisplay: this.formatLineItemDisplay(currentLineItem),
            
            // Progress data
            overallProgress: overallProgress,
            phaseProgress: progress.phaseBreakdown,
            
            // Next actions
            nextSteps: nextSteps,
            
            // Display data
            phaseConfig: phaseConfig,
            phaseColor: phaseConfig.color,
            phaseInitial: phaseConfig.initial,
            phaseName: phaseConfig.name,
            
            // Workflow structure
            workflow: project.workflow,
            
            // Timestamps
            lastUpdated: new Date().toISOString(),
            cacheKey: `${project.id}_${project.updatedAt || Date.now()}`
        };
    }

    /**
     * Get current section based on workflow progress
     */
    static getCurrentSection(project) {
        if (!project.workflow || !project.workflow.steps) return null;

        // Find the first incomplete step to determine current section
        const incompleteStep = project.workflow.steps.find(step => !step.isCompleted);
        return incompleteStep ? incompleteStep.section : null;
    }

    /**
     * Get current line item based on workflow progress
     */
    static getCurrentLineItem(project) {
        if (!project.workflow || !project.workflow.steps) return null;

        // Find the first incomplete step
        const incompleteStep = project.workflow.steps.find(step => !step.isCompleted);
        return incompleteStep ? incompleteStep : null;
    }

    /**
     * Get phase configuration
     */
    static getPhaseConfig(phaseKey) {
        const phaseColors = WorkflowProgressService.getPhaseColor(phaseKey);
        
        return {
            id: phaseKey,
            name: WorkflowProgressService.getPhaseName(phaseKey),
            color: phaseColors.hex,
            bgClass: phaseColors.bg,
            textClass: phaseColors.text,
            initial: this.getPhaseInitial(phaseKey)
        };
    }

    /**
     * Normalize phase key to match our constants
     */
    static normalizePhaseKey(phase) {
        if (!phase) return 'LEAD';
        
        const normalized = phase.toUpperCase()
            .replace(/\s*PHASE$/i, '')
            .replace('PHASE-', '')
            .replace('PHASE', '')
            .replace(/-INSURANCE-1ST SUPPLEMENT/i, '')
            .replace('2ND SUPPLEMENT', 'SECOND_SUPP')
            .replace('2ND SUPP', 'SECOND_SUPP')
            .replace('EXECUTE', 'EXECUTION')
            .trim();
            
        // Map common variations
        const phaseMap = {
            'LEAD': 'LEAD',
            'PROSPECT': 'PROSPECT',
            'APPROVED': 'APPROVED',
            'EXECUTION': 'EXECUTION',
            'EXECUTE': 'EXECUTION',
            'SECOND_SUPP': 'SECOND_SUPP',
            '2ND_SUPP': 'SECOND_SUPP',
            'SUPPLEMENT': 'SECOND_SUPP',
            'COMPLETION': 'COMPLETION',
            'COMPLETE': 'COMPLETION'
        };
        
        return phaseMap[normalized] || 'LEAD';
    }

    /**
     * Get phase initial letter
     */
    static getPhaseInitial(phaseKey) {
        const initials = {
            'LEAD': 'L',
            'PROSPECT': 'P',
            'APPROVED': 'A',
            'EXECUTION': 'E',
            'SECOND_SUPP': 'S',
            '2ND_SUPP': 'S',
            'COMPLETION': 'C'
        };
        return initials[phaseKey] || 'L';
    }

    /**
     * Format phase for display
     */
    static formatPhaseDisplay(phase) {
        if (!phase) return 'Lead';
        return phase.charAt(0).toUpperCase() + phase.slice(1).toLowerCase();
    }

    /**
     * Format section for display
     */
    static formatSectionDisplay(section) {
        if (!section) return 'Not Started';
        return section.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Format line item for display
     */
    static formatLineItemDisplay(lineItem) {
        if (!lineItem) return 'No active task';
        return lineItem.name || lineItem.stepName || 'Unknown Task';
    }

    /**
     * Default state for projects without workflow data
     */
    static getDefaultState() {
        return {
            projectId: null,
            currentPhase: 'LEAD',
            currentPhaseDisplay: 'Lead',
            currentSection: null,
            currentSectionDisplay: 'Not Started',
            currentLineItem: null,
            currentLineItemDisplay: 'No active task',
            overallProgress: 0,
            phaseProgress: {},
            nextSteps: [],
            phaseConfig: this.getPhaseConfig('LEAD'),
            phaseColor: '#94A3B8',
            phaseInitial: 'L',
            phaseName: 'Lead',
            workflow: null,
            lastUpdated: new Date().toISOString(),
            cacheKey: 'default'
        };
    }

    /**
     * Update workflow state when line items change
     * This will notify all listening components
     */
    static updateWorkflowState(projectId, updatedProject) {
        // Clear cache for this project
        const keysToDelete = [];
        for (const key of this.cache.keys()) {
            if (key.startsWith(`${projectId}_`)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.cache.delete(key));

        // Calculate new state
        const newState = this.getProjectWorkflowState(updatedProject);

        // Notify all listeners
        this.notifyListeners(projectId, newState);

        return newState;
    }

    /**
     * Register a component to listen for workflow updates
     */
    static addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Notify all listening components of workflow changes
     */
    static notifyListeners(projectId, newState) {
        this.listeners.forEach(callback => {
            try {
                callback(projectId, newState);
            } catch (error) {
                console.error('Error notifying workflow listener:', error);
            }
        });
    }

    /**
     * Clear all cached data
     */
    static clearCache() {
        this.cache.clear();
    }
}

export default WorkflowDataService;