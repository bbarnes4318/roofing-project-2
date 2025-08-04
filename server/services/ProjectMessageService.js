const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ProjectMessageService {
  
  /**
   * Generate realistic team messages for workflow progress
   */
  static async generateWorkflowMessages(project, workflowStep, messageType = 'STEP_COMPLETION') {
    try {
      const teamMembers = [
        { name: 'Sarah Owner', role: 'PROJECT_MANAGER', id: null },
        { name: 'Mike Rodriguez', role: 'FIELD_DIRECTOR', id: null },
        { name: 'Jennifer Williams', role: 'OFFICE', id: null },
        { name: 'David Chen', role: 'ADMINISTRATION', id: null },
        { name: 'Alex Thompson', role: 'FIELD_DIRECTOR', id: null },
        { name: 'Maria Santos', role: 'PROJECT_MANAGER', id: null }
      ];

      const messages = [];
      
      // Primary completion message
      const completionMessage = await this.createCompletionMessage(project, workflowStep, messageType);
      if (completionMessage) {
        messages.push(completionMessage);
      }
      
      // Generate 2-4 follow-up discussion messages
      const followUpCount = Math.floor(Math.random() * 3) + 2; // 2-4 messages
      const usedMembers = new Set();
      
      for (let i = 0; i < followUpCount; i++) {
        // Select a random team member who hasn't posted yet
        const availableMembers = teamMembers.filter(member => !usedMembers.has(member.name));
        if (availableMembers.length === 0) break;
        
        const member = availableMembers[Math.floor(Math.random() * availableMembers.length)];
        usedMembers.add(member.name);
        
        const followUpMessage = await this.createFollowUpMessage(
          project, 
          workflowStep, 
          member, 
          i, 
          completionMessage?.id
        );
        
        if (followUpMessage) {
          messages.push(followUpMessage);
        }
        
        // Add random delay between messages (5 minutes to 2 hours)
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for timestamp variety
      }
      
      return messages;
    } catch (error) {
      console.error('Error generating workflow messages:', error);
      return [];
    }
  }
  
  /**
   * Create the main completion message
   */
  static async createCompletionMessage(project, workflowStep, messageType) {
    try {
      const completionMessages = [
        `Great news! Just completed "${workflowStep.stepName}" for project ${project.projectNumber}. Everything looks good and we're ready to move forward.`,
        `"${workflowStep.stepName}" has been successfully completed for ${project.projectName}. Quality check passed - moving to the next phase.`,
        `Finished working on "${workflowStep.stepName}" for project ${project.projectNumber}. All requirements met and documented.`,
        `Update: "${workflowStep.stepName}" is now complete for ${project.projectName}. Timeline is on track.`,
        `Completed "${workflowStep.stepName}" for project ${project.projectNumber}. No issues encountered, proceeding as planned.`
      ];
      
      const subjects = [
        `${workflowStep.stepName} - Complete`,
        `Project ${project.projectNumber} Update`,
        `Workflow Progress - ${workflowStep.phase}`,
        `${project.projectName} - Step Completed`,
        `${workflowStep.stepName} Finished`
      ];
      
      const content = completionMessages[Math.floor(Math.random() * completionMessages.length)];
      const subject = subjects[Math.floor(Math.random() * subjects.length)];
      
      // Get responsible team member based on step's default responsible role
      const responsibleMember = this.getResponsibleTeamMember(workflowStep.defaultResponsible);
      
      const messageData = {
        content,
        subject,
        messageType: messageType,
        priority: workflowStep.alertPriority === 'HIGH' ? 'HIGH' : 'MEDIUM',
        authorName: responsibleMember.name,
        authorRole: responsibleMember.role,
        projectId: project.id,
        projectNumber: project.projectNumber,
        workflowId: workflowStep.workflowId,
        stepId: workflowStep.id,
        stepName: workflowStep.stepName,
        phase: workflowStep.phase,
        section: this.extractSectionFromStep(workflowStep.stepName),
        lineItem: workflowStep.stepName,
        isSystemGenerated: true,
        isWorkflowMessage: true,
        metadata: {
          completedAt: new Date().toISOString(),
          stepProgress: 100,
          phaseProgress: await this.calculatePhaseProgress(project.id, workflowStep.phase),
          responsible: workflowStep.defaultResponsible
        }
      };
      
      return await prisma.projectMessage.create({
        data: messageData
      });
    } catch (error) {
      console.error('Error creating completion message:', error);
      return null;
    }
  }
  
  /**
   * Create follow-up discussion messages
   */
  static async createFollowUpMessage(project, workflowStep, teamMember, messageIndex, parentMessageId) {
    try {
      const followUpTemplates = [
        // Response messages
        [`Thanks for the update on "${workflowStep.stepName}". Customer will be pleased with the progress.`, 'Excellent work!'],
        [`Confirmed - "${workflowStep.stepName}" completed successfully. I've updated the project timeline accordingly.`, 'Timeline Updated'],
        [`Good to see "${workflowStep.stepName}" wrapped up on schedule. Materials for the next phase are ready.`, 'Materials Ready'],
        [`"${workflowStep.stepName}" completion noted. I'll coordinate with the customer for the next inspection.`, 'Customer Coordination'],
        
        // Planning messages
        [`Perfect timing on "${workflowStep.stepName}". Weather forecast looks good for continuing with the next phase.`, 'Weather Update'],
        [`With "${workflowStep.stepName}" done, we can now focus on scheduling the upcoming tasks. I'll reach out to the team.`, 'Next Steps Planning'],
        [`"${workflowStep.stepName}" completion confirmed. All permits and documentation are in order for moving forward.`, 'Documentation Complete'],
        
        // Quality/Safety messages
        [`Reviewed the work on "${workflowStep.stepName}" - quality standards exceeded. Great job team!`, 'Quality Review'],
        [`Safety protocols were perfectly followed during "${workflowStep.stepName}". Zero incidents reported.`, 'Safety Update'],
        [`"${workflowStep.stepName}" completed with full compliance. Ready for the next phase inspection.`, 'Compliance Check']
      ];
      
      const template = followUpTemplates[Math.floor(Math.random() * followUpTemplates.length)];
      const content = template[0];
      const subject = template[1];
      
      // Add time variance to messages (5 minutes to 2 hours after main message)
      const baseTime = new Date();
      const minutesDelay = Math.floor(Math.random() * 115) + 5; // 5-120 minutes
      const messageTime = new Date(baseTime.getTime() + (minutesDelay * 60 * 1000));
      
      const messageData = {
        content,
        subject,
        messageType: 'WORKFLOW_UPDATE',
        priority: 'MEDIUM',
        authorName: teamMember.name,
        authorRole: teamMember.role,
        projectId: project.id,
        projectNumber: project.projectNumber,
        workflowId: workflowStep.workflowId,
        stepId: workflowStep.id,
        stepName: workflowStep.stepName,
        phase: workflowStep.phase,
        section: this.extractSectionFromStep(workflowStep.stepName),
        lineItem: workflowStep.stepName,
        isSystemGenerated: true,
        isWorkflowMessage: true,
        parentMessageId: parentMessageId,
        createdAt: messageTime,
        metadata: {
          messageIndex: messageIndex,
          responseType: 'follow_up',
          responsible: teamMember.role
        }
      };
      
      return await prisma.projectMessage.create({
        data: messageData
      });
    } catch (error) {
      console.error('Error creating follow-up message:', error);
      return null;
    }
  }
  
  /**
   * Generate ongoing project discussion messages
   */
  static async generateOngoingDiscussion(project) {
    try {
      const discussionTopics = [
        {
          subject: 'Material Delivery Update',
          content: `Materials for project ${project.projectNumber} arrived this morning. Quality looks excellent and quantities match our order exactly.`,
          author: 'Mike Rodriguez',
          role: 'FIELD_DIRECTOR'
        },
        {
          subject: 'Customer Meeting Scheduled',
          content: `Scheduled progress review meeting with customer for project ${project.projectNumber}. Meeting set for Friday at 2:00 PM.`,
          author: 'Sarah Owner',
          role: 'PROJECT_MANAGER'
        },
        {
          subject: 'Weather Consideration',
          content: `Checked forecast for project ${project.projectNumber}. Clear skies expected through the weekend - perfect for continuing outdoor work.`,
          author: 'Jennifer Williams',
          role: 'OFFICE'
        },
        {
          subject: 'Quality Inspection Passed',
          content: `Morning inspection for project ${project.projectNumber} went smoothly. All work meets our quality standards and customer expectations.`,
          author: 'Alex Thompson',
          role: 'FIELD_DIRECTOR'
        },
        {
          subject: 'Permit Documentation',
          content: `Updated all permit documentation for project ${project.projectNumber}. Everything is current and properly filed.`,
          author: 'David Chen',
          role: 'ADMINISTRATION'
        }
      ];
      
      // Generate 1-3 discussion messages
      const messageCount = Math.floor(Math.random() * 3) + 1;
      const messages = [];
      
      for (let i = 0; i < messageCount; i++) {
        const topic = discussionTopics[Math.floor(Math.random() * discussionTopics.length)];
        
        // Add time variance (last 24 hours)
        const hoursAgo = Math.floor(Math.random() * 24);
        const messageTime = new Date(Date.now() - (hoursAgo * 60 * 60 * 1000));
        
        const messageData = {
          content: topic.content,
          subject: topic.subject,
          messageType: 'USER_MESSAGE',
          priority: 'MEDIUM',
          authorName: topic.author,
          authorRole: topic.role,
          projectId: project.id,
          projectNumber: project.projectNumber,
          isSystemGenerated: true,
          isWorkflowMessage: false,
          createdAt: messageTime,
          metadata: {
            discussionType: 'ongoing',
            topic: topic.subject
          }
        };
        
        const message = await prisma.projectMessage.create({
          data: messageData
        });
        
        messages.push(message);
      }
      
      return messages;
    } catch (error) {
      console.error('Error generating ongoing discussion:', error);
      return [];
    }
  }
  
  /**
   * Get messages for a specific project
   */
  static async getProjectMessages(projectId, options = {}) {
    try {
      const { limit = 50, offset = 0, includeReplies = true } = options;
      
      const messages = await prisma.projectMessage.findMany({
        where: {
          projectId: projectId,
          parentMessageId: includeReplies ? undefined : null
        },
        include: {
          replies: includeReplies ? {
            orderBy: { createdAt: 'asc' }
          } : false,
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      });
      
      return messages;
    } catch (error) {
      console.error('Error fetching project messages:', error);
      return [];
    }
  }
  
  /**
   * Create a user-generated message
   */
  static async createUserMessage(projectId, userId, content, subject, options = {}) {
    try {
      const { parentMessageId, priority = 'MEDIUM' } = options;
      
      // Get user and project info
      const [user, project] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true, role: true }
        }),
        prisma.project.findUnique({
          where: { id: projectId },
          select: { projectNumber: true }
        })
      ]);
      
      if (!user || !project) {
        throw new Error('User or project not found');
      }
      
      const messageData = {
        content,
        subject,
        messageType: 'USER_MESSAGE',
        priority,
        authorId: userId,
        authorName: `${user.firstName} ${user.lastName}`,
        authorRole: user.role,
        projectId,
        projectNumber: project.projectNumber,
        parentMessageId,
        isSystemGenerated: false,
        isWorkflowMessage: false
      };
      
      return await prisma.projectMessage.create({
        data: messageData,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true
            }
          }
        }
      });
    } catch (error) {
      console.error('Error creating user message:', error);
      throw error;
    }
  }
  
  /**
   * Helper function to get responsible team member
   */
  static getResponsibleTeamMember(responsibleRole) {
    const teamMembersByRole = {
      'PROJECT_MANAGER': { name: 'Sarah Owner', role: 'PROJECT_MANAGER' },
      'FIELD_DIRECTOR': { name: 'Mike Rodriguez', role: 'FIELD_DIRECTOR' },
      'OFFICE': { name: 'Jennifer Williams', role: 'OFFICE' },
      'ADMINISTRATION': { name: 'David Chen', role: 'ADMINISTRATION' },
      'ROOF_SUPERVISOR': { name: 'Alex Thompson', role: 'FIELD_DIRECTOR' }
    };
    
    return teamMembersByRole[responsibleRole] || teamMembersByRole['OFFICE'];
  }
  
  /**
   * Extract section name from step name
   */
  static extractSectionFromStep(stepName) {
    // Simple logic to extract section - can be enhanced based on actual step structure
    if (stepName.includes('Inspection')) return 'Inspection';
    if (stepName.includes('Contract')) return 'Contract & Permitting';
    if (stepName.includes('Material')) return 'Material & Installation';
    if (stepName.includes('Quality')) return 'Quality Control';
    if (stepName.includes('Final')) return 'Final Review';
    return 'General';
  }
  
  /**
   * Calculate phase progress
   */
  static async calculatePhaseProgress(projectId, phase) {
    try {
      const workflow = await prisma.projectWorkflow.findFirst({
        where: { projectId },
        include: {
          steps: {
            where: { phase }
          }
        }
      });
      
      if (!workflow || !workflow.steps.length) return 0;
      
      const completedSteps = workflow.steps.filter(step => step.isCompleted).length;
      const totalSteps = workflow.steps.length;
      
      return Math.round((completedSteps / totalSteps) * 100);
    } catch (error) {
      console.error('Error calculating phase progress:', error);
      return 0;
    }
  }
  
  /**
   * Mark message as read by user
   */
  static async markAsRead(messageId, userId) {
    try {
      const message = await prisma.projectMessage.findUnique({
        where: { id: messageId },
        select: { readBy: true }
      });
      
      if (!message) return false;
      
      const readBy = message.readBy || [];
      if (!readBy.includes(userId)) {
        readBy.push(userId);
        
        await prisma.projectMessage.update({
          where: { id: messageId },
          data: {
            readBy,
            readCount: readBy.length
          }
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error marking message as read:', error);
      return false;
    }
  }
  
  /**
   * Trigger message generation when workflow step completes
   */
  static async onWorkflowStepCompletion(workflowStep, project) {
    try {
      console.log(`🔔 Generating messages for completed step: ${workflowStep.stepName}`);
      
      // Generate workflow completion messages
      const messages = await this.generateWorkflowMessages(project, workflowStep, 'STEP_COMPLETION');
      
      // Also generate some ongoing discussion if this is a major milestone
      if (['APPROVED', 'EXECUTION', 'COMPLETION'].includes(workflowStep.phase)) {
        const discussionMessages = await this.generateOngoingDiscussion(project);
        messages.push(...discussionMessages);
      }
      
      console.log(`✅ Generated ${messages.length} messages for step completion`);
      return messages;
    } catch (error) {
      console.error('Error in onWorkflowStepCompletion:', error);
      return [];
    }
  }
}

module.exports = ProjectMessageService;