const { PrismaClient } = require('@prisma/client');
const ProjectMessageService = require('./ProjectMessageService');

const prisma = new PrismaClient();

class ProjectInitializationService {
  
  /**
   * Initialize a new project with starter messages
   */
  static async initializeProjectMessages(project) {
    try {
      console.log(`🔄 Initializing messages for project ${project.projectNumber}`);
      
      // Generate initial project kickoff messages
      const kickoffMessages = await this.generateKickoffMessages(project);
      
      // Generate some ongoing discussion messages
      const discussionMessages = await ProjectMessageService.generateOngoingDiscussion(project);
      
      const allMessages = [...kickoffMessages, ...discussionMessages];
      
      console.log(`✅ Generated ${allMessages.length} initial messages for project ${project.projectNumber}`);
      return allMessages;
    } catch (error) {
      console.error('Error initializing project messages:', error);
      return [];
    }
  }
  
  /**
   * Generate project kickoff messages
   */
  static async generateKickoffMessages(project) {
    try {
      const messages = [];
      
      // Project manager welcome message
      const welcomeMessage = await this.createMessage({
        content: `Welcome to project ${project.projectNumber} - ${project.projectName}! I'm excited to work with you on this project. We've set up all the initial documentation and are ready to begin the process.`,
        subject: `Welcome to Project ${project.projectNumber}`,
        messageType: 'PROJECT_MILESTONE',
        priority: 'HIGH',
        authorName: 'Sarah Owner',
        authorRole: 'PROJECT_MANAGER',
        projectId: project.id,
        projectNumber: project.projectNumber,
        isSystemGenerated: true,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      });
      
      if (welcomeMessage) messages.push(welcomeMessage);
      
      // Field director introduction
      const fieldIntroMessage = await this.createMessage({
        content: `Hi team! I'll be overseeing the field operations for project ${project.projectNumber}. All materials have been ordered and the crew schedule is confirmed. Looking forward to a smooth project execution.`,
        subject: 'Field Operations - Ready to Begin',
        messageType: 'USER_MESSAGE',
        priority: 'MEDIUM',
        authorName: 'Mike Rodriguez',
        authorRole: 'FIELD_DIRECTOR',
        projectId: project.id,
        projectNumber: project.projectNumber,
        isSystemGenerated: true,
        createdAt: new Date(Date.now() - 90 * 60 * 1000) // 90 minutes ago
      });
      
      if (fieldIntroMessage) messages.push(fieldIntroMessage);
      
      // Office coordination message
      const coordinationMessage = await this.createMessage({
        content: `Project ${project.projectNumber} has been added to our tracking system. All permits are in order and customer contact information has been verified. Ready to proceed!`,
        subject: 'Project Setup Complete',
        messageType: 'SYSTEM_NOTIFICATION',
        priority: 'MEDIUM',
        authorName: 'Jennifer Williams',
        authorRole: 'OFFICE',
        projectId: project.id,
        projectNumber: project.projectNumber,
        isSystemGenerated: true,
        createdAt: new Date(Date.now() - 45 * 60 * 1000) // 45 minutes ago
      });
      
      if (coordinationMessage) messages.push(coordinationMessage);
      
      return messages;
    } catch (error) {
      console.error('Error generating kickoff messages:', error);
      return [];
    }
  }
  
  /**
   * Create a project message
   */
  static async createMessage(messageData) {
    try {
      return await prisma.projectMessage.create({
        data: messageData
      });
    } catch (error) {
      console.error('Error creating message:', error);
      return null;
    }
  }
  
  /**
   * Initialize messages for existing projects (one-time setup)
   */
  static async initializeExistingProjects() {
    try {
      console.log('🔄 Initializing messages for existing projects...');
      
      // Get all projects that don't have messages yet
      const projects = await prisma.project.findMany({
        where: {
          projectMessages: {
            none: {}
          }
        },
        select: {
          id: true,
          projectNumber: true,
          projectName: true,
          createdAt: true
        },
        take: 10 // Limit to 10 projects for initial setup
      });
      
      console.log(`Found ${projects.length} projects without messages`);
      
      let totalMessages = 0;
      
      for (const project of projects) {
        const messages = await this.initializeProjectMessages(project);
        totalMessages += messages.length;
      }
      
      console.log(`✅ Initialized ${totalMessages} messages across ${projects.length} projects`);
      return { projectCount: projects.length, messageCount: totalMessages };
    } catch (error) {
      console.error('Error initializing existing projects:', error);
      throw error;
    }
  }
  
  /**
   * Generate realistic workflow completion messages for testing
   */
  static async simulateWorkflowProgress(projectId) {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          workflow: {
            include: {
              steps: {
                where: { isCompleted: true },
                orderBy: { completedAt: 'desc' },
                take: 3 // Get last 3 completed steps
              }
            }
          }
        }
      });
      
      if (!project || !project.workflow) {
        throw new Error('Project or workflow not found');
      }
      
      const messages = [];
      
      // Generate messages for recent completed steps
      for (const step of project.workflow.steps) {
        const stepMessages = await ProjectMessageService.onWorkflowStepCompletion(step, project);
        messages.push(...stepMessages);
      }
      
      return messages;
    } catch (error) {
      console.error('Error simulating workflow progress:', error);
      return [];
    }
  }
}

module.exports = ProjectInitializationService;