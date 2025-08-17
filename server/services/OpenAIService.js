class OpenAIService {
  constructor() {
    this.isEnabled = false;
    this.client = null;
    
    // Try to initialize OpenAI if available
    console.log('🔍 OpenAI Initialization: Checking for API key...');
    console.log('🔍 API Key present:', !!process.env.OPENAI_API_KEY);
    console.log('🔍 API Key length:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0);
    console.log('🔍 API Key first 20 chars:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 20) + '...' : 'NONE');
    console.log('🔍 API Key last 4 chars:', process.env.OPENAI_API_KEY ? '...' + process.env.OPENAI_API_KEY.slice(-4) : 'NONE');
    
    if (process.env.OPENAI_API_KEY) {
      try {
        console.log('🔍 OpenAI: Loading OpenAI package...');
        const OpenAI = require('openai');
        console.log('🔍 OpenAI: Creating client...');
        this.client = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        this.isEnabled = true;
        console.log('✅ OpenAI service initialized successfully with GPT-4 Turbo');
      } catch (error) {
        console.error('❌ OpenAI package not found or failed to initialize:', error.message);
        console.error('❌ Full error:', error);
        console.log('⚠️ Using enhanced mock responses instead');
        this.isEnabled = false;
      }
    } else {
      console.log('⚠️ OpenAI API key not provided, using enhanced mock responses');
    }
  }

  async generateResponse(prompt, context = {}) {
    if (!this.isEnabled) {
      return this.generateMockResponse(prompt, context);
    }

    try {
      const systemPrompt = this.buildSystemPrompt(context);
      const userPrompt = this.buildUserPrompt(prompt, context);

      console.log('🔍 Making OpenAI API call...');
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview', // Using GPT-4 Turbo (latest available model)
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.7,
        presence_penalty: 0.6,
        frequency_penalty: 0.3
      });
      console.log('✅ OpenAI API call successful');

      const aiResponse = response.choices[0].message.content;
      
      return {
        type: this.detectResponseType(prompt),
        content: aiResponse,
        confidence: 0.95,
        source: 'openai-gpt4-turbo',
        suggestedActions: this.extractSuggestedActions(aiResponse, context),
        metadata: {
          model: 'gpt-4-turbo-preview',
          tokens: response.usage.total_tokens,
          timestamp: new Date()
        }
      };

    } catch (error) {
      console.error('❌ OpenAI API error:', error.message);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error type:', error.type);
      console.error('❌ Full error object:', error);
      // Fallback to mock response on error
      return this.generateMockResponse(prompt, context);
    }
  }

  buildSystemPrompt(context) {
    return `You are Bubbles, an AI assistant specialized in construction project management and roofing operations. You help users manage projects, workflows, alerts, and team coordination.

Key Capabilities:
- Project progress monitoring and status updates
- Workflow item completion and task management
- Alert creation and monitoring
- Team coordination and assignment management
- Intelligent insights and recommendations
- Natural language command processing

Context Information:
${context.projectName ? `- Current Project: ${context.projectName}` : '- No specific project selected'}
${context.userRole ? `- User Role: ${context.userRole}` : ''}
${context.activeAlerts ? `- Active Alerts: ${context.activeAlerts} pending` : ''}
${context.workflowStatus ? `- Workflow Status: ${context.workflowStatus}` : ''}

Communication Style:
- Be helpful, professional, and concise
- Use construction industry terminology appropriately
- Provide actionable suggestions when possible
- Format responses with clear structure using markdown
- Always suggest relevant follow-up actions

Response Format:
- Keep responses under 500 words
- Use bullet points and headers for clarity
- Include specific action buttons when appropriate
- Be proactive in suggesting workflow improvements`;
  }

  buildUserPrompt(prompt, context) {
    let contextualPrompt = prompt;
    
    if (context.projectName) {
      contextualPrompt += `\n\nProject Context: ${context.projectName}`;
      if (context.progress) contextualPrompt += ` (${context.progress}% complete)`;
      if (context.status) contextualPrompt += ` - Status: ${context.status}`;
    }
    
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      contextualPrompt += '\n\nRecent conversation context:\n';
      context.conversationHistory.slice(-3).forEach(item => {
        contextualPrompt += `User: ${item.message}\nBubbles: ${item.response.substring(0, 200)}...\n`;
      });
    }

    return contextualPrompt;
  }

  detectResponseType(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('complete') || lowerPrompt.includes('mark') || lowerPrompt.includes('done')) {
      return 'workflow_action';
    }
    if (lowerPrompt.includes('alert') || lowerPrompt.includes('notification')) {
      return 'alert_action';
    }
    if (lowerPrompt.includes('status') || lowerPrompt.includes('progress')) {
      return 'project_status';
    }
    if (lowerPrompt.includes('schedule') || lowerPrompt.includes('timeline')) {
      return 'schedule_management';
    }
    if (lowerPrompt.includes('team') || lowerPrompt.includes('assign')) {
      return 'team_management';
    }
    if (lowerPrompt.includes('help') || lowerPrompt.includes('what can')) {
      return 'capabilities';
    }
    
    return 'general_assistance';
  }

  extractSuggestedActions(response, context) {
    const actions = [];
    
    // Parse response for action suggestions
    if (response.includes('complete') || response.includes('mark as done')) {
      actions.push({ type: 'complete_task', label: 'Complete Task' });
    }
    if (response.includes('alert') || response.includes('notification')) {
      actions.push({ type: 'create_alert', label: 'Create Alert' });
    }
    if (response.includes('status') || response.includes('progress')) {
      actions.push({ type: 'view_status', label: 'View Status' });
    }
    if (response.includes('project') && context.projectName) {
      actions.push({ type: 'view_workflow', label: 'View Workflow' });
    }
    
    // Always include help option
    if (actions.length === 0) {
      actions.push({ type: 'help', label: 'Show Commands' });
    }
    
    return actions.slice(0, 3); // Limit to 3 actions
  }

  // Enhanced mock response generator for when OpenAI is not available
  generateMockResponse(prompt, context) {
    const lowerPrompt = prompt.toLowerCase();
    
    // Command detection and responses
    if (lowerPrompt.includes('help') || lowerPrompt.includes('what can you do')) {
      return {
        type: 'capabilities',
        content: `Hello! I'm Bubbles, your AI project management assistant. Here's how I can help you:

**🏗️ Project Management**
• Monitor project progress and status updates
• Track workflow completion and milestones
• Generate detailed project reports

**🚨 Alert & Task Management**
• Create and manage project alerts
• Complete workflow line items
• Assign tasks to team members
• Monitor deadlines and priorities

**📊 Analytics & Insights**
• Analyze project performance trends
• Identify potential bottlenecks
• Suggest process optimizations
• Risk assessment and mitigation

**💬 Smart Communication**
• Natural language project queries
• Context-aware responses based on your current project
• Proactive notifications and suggestions

**⚡ Quick Commands**
Try saying things like:
• "Mark the foundation inspection as complete"
• "Create an urgent alert for Project Alpha"
• "What's the status of my current project?"
• "Show me pending alerts"
• "Who is assigned to roofing tasks?"

${context.projectName ? `I see you're currently working on **${context.projectName}**. ` : ''}How can I assist you today?`,
        confidence: 1.0,
        source: 'mock-responses',
        suggestedActions: [
          { type: 'check_alerts', label: 'Check Alerts' },
          { type: 'project_status', label: 'Project Status' },
          { type: 'quick_actions', label: 'Quick Actions' }
        ]
      };
    }

    if (lowerPrompt.includes('status') || lowerPrompt.includes('progress')) {
      if (context.projectName) {
        return {
          type: 'project_status',
          content: `**${context.projectName} Status Report:**

**📋 Overall Progress:** ${context.progress || '75'}% Complete
**📅 Current Phase:** ${context.status || 'Execution'}
**⏰ Timeline:** ${context.timeline || 'On track for completion'}
**💰 Budget:** ${context.budgetStatus || 'Within approved limits'}

**🎯 Recent Milestones:**
• Foundation inspection completed ✅
• Framing phase 90% complete
• Roofing materials delivered

**⚠️ Action Items:**
• Schedule electrical inspection
• Coordinate plumbing rough-in
• Weather contingency planning

**📈 Performance Metrics:**
• Team efficiency: 94%
• Quality score: 96/100
• Safety record: Excellent

Would you like me to dive deeper into any specific aspect of the project?`,
          confidence: 0.94,
          source: 'mock-responses',
          suggestedActions: [
            { type: 'view_workflow', label: 'View Workflow' },
            { type: 'check_alerts', label: 'Check Alerts' },
            { type: 'team_status', label: 'Team Status' }
          ]
        };
      }
    }

    if (lowerPrompt.includes('complete') || lowerPrompt.includes('mark') || lowerPrompt.includes('done')) {
      return {
        type: 'workflow_action',
        content: `I can help you mark workflow items as complete! 

**To complete a task, I'll need:**
• Project name or ID
• Specific workflow line item
• Any completion notes

**Examples:**
• "Mark foundation inspection complete for Project Alpha"
• "Complete roofing installation task"
• "Mark electrical rough-in as done"

${context.projectName ? `For your current project **${context.projectName}**, ` : ''}which specific task would you like to mark as complete?`,
        confidence: 0.92,
        source: 'mock-responses',
        suggestedActions: [
          { type: 'complete_task', label: 'Complete Current Task' },
          { type: 'view_pending', label: 'Show Pending Items' },
          { type: 'view_workflow', label: 'View Full Workflow' }
        ]
      };
    }

    if (lowerPrompt.includes('alert') || lowerPrompt.includes('notification')) {
      return {
        type: 'alert_action',
        content: `I'll help you create a new alert! 

**Alert Types Available:**
• **Urgent**: Critical issues requiring immediate attention
• **High**: Important tasks with near-term deadlines
• **Medium**: Standard workflow notifications
• **Low**: General information and reminders

**What I need:**
• Alert priority level
• Project to associate with
• Alert message or description

**Example:**
"Create urgent alert for weather delay on Project Alpha"

${context.projectName ? `Would you like to create an alert for **${context.projectName}**? ` : ''}What type of alert should I create?`,
        confidence: 0.90,
        source: 'mock-responses',
        suggestedActions: [
          { type: 'urgent_alert', label: 'Create Urgent Alert' },
          { type: 'general_alert', label: 'Create General Alert' },
          { type: 'check_alerts', label: 'View Existing Alerts' }
        ]
      };
    }

    // Default intelligent response
    return {
      type: 'general_assistance',
      content: `I understand you're asking about: "${prompt}"

As your AI project assistant, I'm here to help with:

**🎯 Current Focus Areas:**
• Project workflow management and progress tracking
• Alert monitoring and team coordination
• Task completion and milestone management
• Performance analysis and optimization

**💡 Smart Suggestions:**
${context.projectName ? `For **${context.projectName}**:` : 'For your projects:'}
• Review pending alerts for any urgent items
• Check workflow progress for upcoming deadlines
• Ensure team assignments are up to date
• Monitor budget and timeline compliance

**🚀 Quick Actions:**
You can ask me things like:
• "Show project status"
• "Check my alerts"  
• "Mark task as complete"
• "Create new alert"

How would you like me to help you today?`,
      confidence: 0.85,
      source: 'mock-responses',
      suggestedActions: [
        { type: 'check_alerts', label: 'Check Alerts' },
        { type: 'project_status', label: 'Project Status' },
        { type: 'help', label: 'Show All Commands' }
      ]
    };
  }

  // Check if OpenAI is available
  isAvailable() {
    return this.isEnabled;
  }

  // Get service status
  getStatus() {
    return {
      enabled: this.isEnabled,
      model: this.isEnabled ? 'gpt-4-turbo-preview' : 'mock-responses',
      status: this.isEnabled ? 'active' : 'fallback'
    };
  }
}

// Export singleton instance
module.exports = new OpenAIService();