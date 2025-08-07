const { prisma } = require('../config/prisma');
const WorkflowProgressionService = require('./WorkflowProgressionService');

class WorkflowCompletionHandler {
  /**
   * Handle complete workflow update when a line item is marked complete
   */
  async handleLineItemCompletion(projectId, lineItemId, userId = null, notes = null, alertId = null) {
    try {
      console.log(`📋 Processing line item completion for project ${projectId}, item ${lineItemId}`);
      
      // Get socket.io instance for real-time updates
      const io = global.io || this.app?.get?.('io');
      
      // 1. Complete the line item and get new position (includes alert generation in transaction)
      const result = await WorkflowProgressionService.completeLineItem(
        projectId,
        lineItemId,
        userId,
        notes,
        io // Pass socket instance for real-time updates
      );

      // 2. Alert dismissal is handled in the transaction, no need for separate call
      
      // 3. Alert generation is handled in the transaction, no need for separate call

      // 4. Create system messages for phase/section completions
      if (result.completedPhase || result.completedSection) {
        await this.createCompletionMessage(projectId, result);
      }

      // 5. Get updated workflow data for UI refresh
      const updatedData = await this.getUpdatedWorkflowData(projectId, result.tracker);

      // 6. Additional WebSocket events for UI components (main events handled in transaction)
      if (io && updatedData) {
        io.to(`project_${projectId}`).emit('workflow_data_updated', {
          projectId,
          updatedData,
          completedPhase: result.completedPhase,
          completedSection: result.completedSection,
          isComplete: result.isWorkflowComplete,
          timestamp: new Date()
        });
      }

      return {
        success: true,
        result,
        updatedData
      };

    } catch (error) {
      console.error('❌ Error in workflow completion handler:', error);
      throw error;
    }
  }

  /**
   * Dismiss the alert for completed line item
   */
  async dismissAlert(alertId, projectId) {
    try {
      await prisma.workflowAlert.updateMany({
        where: { 
          OR: [
            { id: alertId },
            { 
              AND: [
                { projectId: projectId },
                { status: 'ACTIVE' }
              ]
            }
          ]
        },
        data: { 
          status: 'COMPLETED',
          isRead: true,
          acknowledgedAt: new Date()
        }
      });
      console.log(`✅ Dismissed alert ${alertId}`);
    } catch (error) {
      console.error('⚠️ Error dismissing alert:', error);
    }
  }

  /**
   * Generate alert for the new current line item (OPTIMIZED)
   */
  async generateNewAlert(tracker, projectId) {
    try {
      if (!tracker.currentLineItemId) return;

      const AlertGenerationService = require('./AlertGenerationService');
      const newAlert = await AlertGenerationService.generateActiveLineItemAlert(
        projectId,
        tracker.id,
        tracker.currentLineItemId
      );

      console.log(`✅ Generated new alert for line item: ${tracker.currentLineItemId}`);
      return newAlert;

    } catch (error) {
      console.error('⚠️ Error generating new alert:', error);
    }
  }

  /**
   * Get users by responsible role
   */
  async getUsersByRole(responsibleRole) {
    try {
      // Map workflow roles to user roles
      const roleMapping = {
        'OFFICE': ['ADMIN', 'MANAGER'],
        'ADMINISTRATION': ['ADMIN', 'MANAGER'],
        'PROJECT_MANAGER': ['PROJECT_MANAGER', 'MANAGER'],
        'FIELD_DIRECTOR': ['FOREMAN', 'MANAGER'],
        'ROOF_SUPERVISOR': ['FOREMAN', 'WORKER']
      };

      const userRoles = roleMapping[responsibleRole] || ['MANAGER'];

      const users = await prisma.user.findMany({
        where: {
          role: { in: userRoles },
          isActive: true
        }
      });

      return users;
    } catch (error) {
      console.error('Error finding users by role:', error);
      return [];
    }
  }

  /**
   * Create system message for phase/section completion
   */
  async createCompletionMessage(projectId, result) {
    try {
      const messageType = result.completedPhase ? 'PHASE_COMPLETION' : 'STEP_COMPLETION';
      const subject = result.completedPhase ? 'Phase Completed' : 'Section Completed';
      
      let messageContent = '';
      if (result.completedPhase && result.tracker.lastCompletedPhase) {
        messageContent = `Phase "${result.tracker.lastCompletedPhase.phaseName}" has been completed.`;
      } else if (result.completedSection && result.tracker.lastCompletedSection) {
        messageContent = `Section "${result.tracker.lastCompletedSection.sectionName}" has been completed.`;
      }

      if (messageContent) {
        await prisma.projectMessage.create({
          data: {
            projectId,
            subject,
            content: messageContent,
            messageType,
            isSystemGenerated: true,
            isWorkflowMessage: true,
            authorName: 'System',
            projectNumber: 0,
            phase: result.tracker.currentPhase?.phaseType,
            section: result.tracker.currentSection?.displayName,
            lineItem: result.tracker.currentLineItem?.itemName
          }
        });
      }
    } catch (error) {
      console.error('⚠️ Error creating completion message:', error);
    }
  }

  /**
   * Get all updated workflow data for UI refresh
   */
  async getUpdatedWorkflowData(projectId, tracker) {
    try {
      // Get all line items with completion status
      const allLineItems = await prisma.workflowLineItem.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
        include: {
          section: {
            include: {
              phase: true
            }
          }
        }
      });

      // Get completed items
      const completedItems = await prisma.completedWorkflowItem.findMany({
        where: { trackerId: tracker.id },
        include: {
          completedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      // Create a map of completed items
      const completedMap = new Map();
      completedItems.forEach(item => {
        completedMap.set(item.lineItemId, item);
      });

      // Transform line items with completion status
      const transformedItems = allLineItems.map(item => ({
        id: item.id,
        itemLetter: item.itemLetter,
        itemName: item.itemName,
        phase: item.section.phase.phaseType,
        phaseName: item.section.phase.phaseName,
        section: item.section.displayName,
        sectionNumber: item.section.sectionNumber,
        sectionName: item.section.sectionName,
        responsibleRole: item.responsibleRole,
        isCompleted: completedMap.has(item.id),
        isCurrent: item.id === tracker.currentLineItemId,
        completedAt: completedMap.get(item.id)?.completedAt,
        completedBy: completedMap.get(item.id)?.completedBy
      }));

      // Calculate phase and section completion
      const phaseCompletion = {};
      const sectionCompletion = {};

      transformedItems.forEach(item => {
        // Initialize phase tracking
        if (!phaseCompletion[item.phase]) {
          phaseCompletion[item.phase] = { total: 0, completed: 0 };
        }
        phaseCompletion[item.phase].total++;
        if (item.isCompleted) {
          phaseCompletion[item.phase].completed++;
        }

        // Initialize section tracking
        const sectionKey = `${item.phase}_${item.sectionNumber}`;
        if (!sectionCompletion[sectionKey]) {
          sectionCompletion[sectionKey] = { 
            phase: item.phase,
            section: item.section,
            total: 0, 
            completed: 0 
          };
        }
        sectionCompletion[sectionKey].total++;
        if (item.isCompleted) {
          sectionCompletion[sectionKey].completed++;
        }
      });

      // Mark phases as complete
      Object.keys(phaseCompletion).forEach(phase => {
        const data = phaseCompletion[phase];
        phaseCompletion[phase].isCompleted = data.completed === data.total;
      });

      // Mark sections as complete
      Object.keys(sectionCompletion).forEach(key => {
        const data = sectionCompletion[key];
        sectionCompletion[key].isCompleted = data.completed === data.total;
      });

      return {
        currentPosition: {
          phase: tracker.currentPhase?.phaseType,
          phaseName: tracker.currentPhase?.phaseName,
          section: tracker.currentSection?.displayName,
          sectionName: tracker.currentSection?.sectionName,
          lineItem: tracker.currentLineItem?.itemName,
          lineItemId: tracker.currentLineItemId
        },
        lineItems: transformedItems,
        phaseCompletion,
        sectionCompletion,
        overallProgress: await this.calculateOverallProgress(tracker.id)
      };

    } catch (error) {
      console.error('⚠️ Error getting updated workflow data:', error);
      return null;
    }
  }

  /**
   * Calculate overall progress percentage
   */
  async calculateOverallProgress(trackerId) {
    try {
      const totalItems = await prisma.workflowLineItem.count({
        where: { isActive: true }
      });

      const completedItems = await prisma.completedWorkflowItem.count({
        where: { trackerId }
      });

      return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    } catch (error) {
      console.error('Error calculating progress:', error);
      return 0;
    }
  }

  /**
   * Emit WebSocket events to update all UI components
   */
  async emitWorkflowUpdates(projectId, updatedData, result) {
    try {
      const io = global.io; // Assuming io is attached to global
      
      if (!io) {
        console.warn('⚠️ WebSocket not available for real-time updates');
        return;
      }

      // Emit to all users viewing this project
      io.to(`project_${projectId}`).emit('workflow_updated', {
        projectId,
        updatedData,
        completedPhase: result.completedPhase,
        completedSection: result.completedSection,
        isComplete: result.isWorkflowComplete,
        timestamp: new Date()
      });

      // Emit alert refresh event
      io.emit('alerts_refresh', {
        projectId,
        message: 'Workflow progressed, alerts updated'
      });

      console.log(`📡 Emitted workflow updates for project ${projectId}`);

    } catch (error) {
      console.error('⚠️ Error emitting WebSocket updates:', error);
    }
  }
}

module.exports = new WorkflowCompletionHandler();