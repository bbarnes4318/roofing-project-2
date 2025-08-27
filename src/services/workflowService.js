import api from './api';

class WorkflowService {
  /**
   * Complete a workflow line item
   */
  async completeLineItem(projectId, lineItemId, notes = '', alertId = null) {
    try {
      console.log(`📝 Completing line item ${lineItemId} for project ${projectId}`);
      
      const response = await api.post('/workflows/complete-item', {
        projectId,
        lineItemId,
        notes,
        alertId
      });

      console.log('✅ Line item completed successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error completing line item:', error);
      throw error;
    }
  }

  /**
   * Get current workflow position
   */
  async getCurrentPosition(projectId) {
    try {
      const response = await api.get(`/workflows/position/${projectId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error getting current position:', error);
      throw error;
    }
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(projectId) {
    try {
      const response = await api.get(`/workflows/status/${projectId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error getting workflow status:', error);
      throw error;
    }
  }

  /**
   * Get complete workflow data for UI display
   */
  async getWorkflowData(projectId) {
    try {
      const response = await api.get(`/workflows/data/${projectId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error getting workflow data:', error);
      throw error;
    }
  }

  /**
   * Update a legacy/checkbox step state (backwards compatibility)
   * If stepId is a DB UUID, delegate to complete-item when marking complete
   */
  async updateStep(projectId, stepId, completed) {
    try {
      // Debug logging to understand stepId format
      console.log(`🔍 WORKFLOW SERVICE: updateStep called with stepId: "${stepId}" (length: ${stepId?.length}), completed: ${completed}`);
      
      // If stepId looks like a UUID from DB and completed=true, use new endpoint
      const isDbId = typeof stepId === 'string' && stepId.length > 20 && !stepId.includes('DB_');
      console.log(`🔍 WORKFLOW SERVICE: isDbId detection: ${isDbId}`);
      
      if (completed && isDbId) {
        console.log(`✅ WORKFLOW SERVICE: Calling completeLineItem for UUID stepId: ${stepId}`);
        return await this.completeLineItem(projectId, stepId, 'Completed via checkbox', null);
      }
      // Otherwise call legacy updater to persist UI state only
      const response = await api.put(`/workflows/project/${projectId}/workflow/${encodeURIComponent(stepId)}`, {
        completed
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error updating step:', error);
      throw error;
    }
  }

  /**
   * Get workflow for project (legacy compatibility)
   */
  async getWorkflow(projectId) {
    try {
      const response = await api.get(`/workflows/project/${projectId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error getting workflow:', error);
      throw error;
    }
  }

  /**
   * Subscribe to workflow updates via WebSocket
   */
  subscribeToWorkflowUpdates(projectId, onUpdate) {
    // Assuming we have socket.io client available
    if (window.socket) {
      // Join project room
      window.socket.emit('join', `project_${projectId}`);
      
      // Listen for workflow updates
      window.socket.on('workflow_updated', (data) => {
        if (data.projectId === projectId) {
          console.log('📡 Received workflow update:', data);
          onUpdate(data);
        }
      });

      // Listen for alert updates
      window.socket.on('alerts_refresh', () => {
        console.log('📨 Alerts refresh requested');
        // Trigger alert refresh
        if (window.refreshAlerts) {
          window.refreshAlerts();
        }
      });

      return () => {
        window.socket.off('workflow_updated');
        window.socket.off('alerts_refresh');
      };
    }
    
    return () => {}; // No-op if socket not available
  }
}

const workflowService = new WorkflowService();
export default workflowService;