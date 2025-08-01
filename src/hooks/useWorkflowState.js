/**
 * Centralized Workflow State Hook
 * CRITICAL: ALL components must use this hook for workflow data
 * This ensures 100% consistency across the entire application
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import WorkflowDataService from '../services/workflowDataService';

export const useWorkflowState = (project) => {
    const [workflowState, setWorkflowState] = useState(() => 
        WorkflowDataService.getProjectWorkflowState(project)
    );
    const [isUpdating, setIsUpdating] = useState(false);
    const projectRef = useRef(project);

    // Update state when project changes
    useEffect(() => {
        if (project && project !== projectRef.current) {
            projectRef.current = project;
            const newState = WorkflowDataService.getProjectWorkflowState(project);
            setWorkflowState(newState);
        }
    }, [project]);

    // Listen for workflow updates from other components
    useEffect(() => {
        const unsubscribe = WorkflowDataService.addListener((updatedProjectId, newState) => {
            if (project && project.id === updatedProjectId) {
                setWorkflowState(newState);
                setIsUpdating(false);
            }
        });

        return unsubscribe;
    }, [project]);

    // Method to update workflow when line items are checked
    const updateWorkflow = useCallback(async (updatedProject) => {
        if (!updatedProject) return;

        setIsUpdating(true);
        
        try {
            // Update the centralized state
            const newState = WorkflowDataService.updateWorkflowState(updatedProject.id, updatedProject);
            
            // Update local state
            setWorkflowState(newState);
            
            return newState;
        } catch (error) {
            console.error('Error updating workflow state:', error);
            setIsUpdating(false);
            throw error;
        }
    }, []);

    // Method to check a line item
    const checkLineItem = useCallback(async (stepId, isCompleted) => {
        if (!project || !project.workflow) return;

        setIsUpdating(true);

        try {
            // Update the step in the project workflow
            const updatedWorkflow = {
                ...project.workflow,
                steps: project.workflow.steps.map(step => 
                    step.stepId === stepId 
                        ? { ...step, isCompleted, completedAt: isCompleted ? new Date().toISOString() : null }
                        : step
                )
            };

            const updatedProject = {
                ...project,
                workflow: updatedWorkflow,
                updatedAt: new Date().toISOString()
            };

            // TODO: Make API call to save the updated project
            // await api.updateProject(project.id, updatedProject);

            // Update the centralized state
            const newState = await updateWorkflow(updatedProject);
            
            return newState;
        } catch (error) {
            console.error('Error checking line item:', error);
            setIsUpdating(false);
            throw error;
        }
    }, [project, updateWorkflow]);

    return {
        // Current workflow state
        ...workflowState,
        
        // State management
        isUpdating,
        
        // Actions
        updateWorkflow,
        checkLineItem,
        
        // Convenience getters
        getCurrentPhase: () => workflowState.currentPhase,
        getCurrentSection: () => workflowState.currentSection,
        getCurrentLineItem: () => workflowState.currentLineItem,
        getPhaseColor: () => workflowState.phaseColor,
        getPhaseInitial: () => workflowState.phaseInitial,
        getPhaseName: () => workflowState.phaseName,
        getOverallProgress: () => workflowState.overallProgress,
        
        // Display helpers
        getPhaseDisplay: () => workflowState.currentPhaseDisplay,
        getSectionDisplay: () => workflowState.currentSectionDisplay,
        getLineItemDisplay: () => workflowState.currentLineItemDisplay
    };
};

// Hook for multiple projects
export const useWorkflowStates = (projects) => {
    const [workflowStates, setWorkflowStates] = useState(() => {
        if (!projects || !Array.isArray(projects)) return {};
        
        const states = {};
        projects.forEach(project => {
            if (project && project.id) {
                states[project.id] = WorkflowDataService.getProjectWorkflowState(project);
            }
        });
        return states;
    });

    // Update states when projects change
    useEffect(() => {
        if (!projects || !Array.isArray(projects)) return;

        const newStates = {};
        projects.forEach(project => {
            if (project && project.id) {
                newStates[project.id] = WorkflowDataService.getProjectWorkflowState(project);
            }
        });
        setWorkflowStates(newStates);
    }, [projects]);

    // Listen for workflow updates
    useEffect(() => {
        const unsubscribe = WorkflowDataService.addListener((updatedProjectId, newState) => {
            setWorkflowStates(prev => ({
                ...prev,
                [updatedProjectId]: newState
            }));
        });

        return unsubscribe;
    }, []);

    return {
        workflowStates,
        getWorkflowState: (projectId) => workflowStates[projectId],
        getPhaseForProject: (projectId) => workflowStates[projectId]?.currentPhase || 'LEAD',
        getPhaseColorForProject: (projectId) => workflowStates[projectId]?.phaseColor || '#94A3B8',
        getPhaseInitialForProject: (projectId) => workflowStates[projectId]?.phaseInitial || 'L',
        getProgressForProject: (projectId) => workflowStates[projectId]?.overallProgress || 0
    };
};

export default useWorkflowState;