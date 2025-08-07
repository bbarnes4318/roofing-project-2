/**
 * Hook for updating workflow steps and handling phase progression
 */

import { useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = (typeof window !== 'undefined' && window.location && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
  ? `${window.location.protocol}//${window.location.host}/api`
  : (process.env.REACT_APP_API_URL || 'http://localhost:5000/api');

export const useWorkflowUpdate = () => {
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Update a single workflow step
     */
    const updateWorkflowStep = useCallback(async (projectId, stepId, isCompleted) => {
        setUpdating(true);
        setError(null);

        try {
            const response = await axios.put(
                `${API_URL}/workflow-updates/${projectId}/steps/${stepId}`,
                { isCompleted, completed: isCompleted }, // Send both field names for compatibility
                {
                    headers: {
                        'Content-Type': 'application/json',
                        // Add auth token if needed
                        // 'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.data.success) {
                console.log(`✅ Workflow step updated - New phase: ${response.data.data.phase}, Progress: ${response.data.data.progress}%`);
                
                // The backend has already updated project.phase and project.progress
                // Return the updated data
                return response.data.data;
            } else {
                throw new Error(response.data.message || 'Failed to update workflow step');
            }
        } catch (err) {
            console.error('❌ Error updating workflow step:', err);
            setError(err.message || 'Failed to update workflow step');
            throw err;
        } finally {
            setUpdating(false);
        }
    }, []);

    /**
     * Update multiple workflow steps at once
     */
    const updateMultipleSteps = useCallback(async (projectId, updates) => {
        setUpdating(true);
        setError(null);

        try {
            const response = await axios.post(
                `${API_URL}/workflow-updates/${projectId}/bulk-update`,
                { updates },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        // Add auth token if needed
                        // 'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.data.success) {
                console.log(`✅ Multiple workflow steps updated - New phase: ${response.data.data.phase}, Progress: ${response.data.data.progress}%`);
                return response.data.data;
            } else {
                throw new Error(response.data.message || 'Failed to update workflow steps');
            }
        } catch (err) {
            console.error('❌ Error updating workflow steps:', err);
            setError(err.message || 'Failed to update workflow steps');
            throw err;
        } finally {
            setUpdating(false);
        }
    }, []);

    /**
     * Get current phase calculation
     */
    const getCurrentPhase = useCallback(async (projectId) => {
        try {
            const response = await axios.get(
                `${API_URL}/workflow-updates/${projectId}/phase`
            );

            if (response.data.success) {
                return response.data.data;
            } else {
                throw new Error(response.data.message || 'Failed to get phase');
            }
        } catch (err) {
            console.error('❌ Error getting current phase:', err);
            throw err;
        }
    }, []);

    return {
        updateWorkflowStep,
        updateMultipleSteps,
        getCurrentPhase,
        updating,
        error
    };
};

export default useWorkflowUpdate;