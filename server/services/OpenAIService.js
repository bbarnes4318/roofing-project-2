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
    return `You are Bubbles, the proactive AI project copilot for construction and roofing teams. Your goal is to make the next best action obvious and fast.

Key Capabilities (prioritize relevance to user intent):
- Project status summarization with next steps
- Risk and blocker detection with mitigation suggestions
- Alert creation, routing, and follow-up
- Workflow updates and milestone management
- Timeline forecasting and schedule impact
- Natural-language task assignment and coordination

Context Information:
${context.projectName ? `- Current Project: ${context.projectName}` : '- No specific project selected'}
${context.userRole ? `- User Role: ${context.userRole}` : ''}
${context.activeAlerts ? `- Active Alerts: ${context.activeAlerts} pending` : ''}
${context.workflowStatus ? `- Workflow Status: ${context.workflowStatus}` : ''}

Communication Style:
- Be confident, concise, and actionable
- Prefer imperative phrasing (“Do X”, “Review Y”)
- Use construction terminology appropriately
- Structure with short headings and tight bullets
- Offer 2–3 crisp follow-ups as buttons

Response Format:
- ≤ 250 words unless user asks for detail
- Use markdown headings and bullets
- Surface risks/urgencies up top when present
- Always include 2–3 suggested actions aligned to the content`;
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
    if (lowerPrompt.includes('help') || lowerPrompt.includes('what can you do') || lowerPrompt === 'help') {
      return {
        type: 'capabilities',
        content: `Here’s what I can do fast:

**Status & Focus**
• Summarize project status with next steps
• Show today’s priorities and deadlines
• Surface risks and blockers

**Actions I Can Take**
• Create alerts and assign tasks
• Update workflow items and milestones
• Forecast timelines and schedule impacts

${context.projectName ? `Current project: **${context.projectName}**.` : ''}

Ask for anything, or try a quick command:
• "Show priorities"
• "Project status"
• "Create alert: weather delay — urgent"`,
        confidence: 1.0,
        source: 'mock-responses',
        suggestedActions: [
          { type: 'priorities_today', label: "Today's Priorities" },
          { type: 'project_status', label: 'Project Status' },
          { type: 'create_alert', label: 'Create Alert' }
        ]
      };
    }

    if (lowerPrompt.includes('status') || lowerPrompt.includes('progress')) {
      if (context.projectName) {
        return {
          type: 'project_status',
          content: `**${context.projectName} — Status at a glance**

**Progress:** ${context.progress || '75'}%  |  **Phase:** ${context.status || 'Execution'}  |  **Timeline:** ${context.timeline || 'On track'}  |  **Budget:** ${context.budgetStatus || 'Within limits'}

**Recent milestones**
• Foundation inspection — complete
• Framing — 90% complete
• Roofing materials — delivered

**Action items**
• Schedule electrical inspection
• Coordinate plumbing rough‑in
• Review weather contingency

**Performance**
• Team efficiency: 94%  • Quality: 96/100  • Safety: Excellent

Need details on any section?`,
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
        content: `Let’s wrap this up. To complete a task I need:
• Project name/ID
• The workflow item
• Optional notes

Examples
• "Mark foundation inspection complete for Project Alpha"
• "Complete roofing installation task"
• "Mark electrical rough‑in done"

${context.projectName ? `For **${context.projectName}** — ` : ''}which task should I complete?`,
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
        content: `Let’s raise the right alert.

Priority levels
• Urgent — immediate attention
• High — near‑term deadline
• Medium — standard workflow
• Low — general info/reminder

I need
• Priority level
• Project
• Message/description

Example
"Create urgent alert: weather delay on Project Alpha"

${context.projectName ? `Create this for **${context.projectName}**? ` : ''}What’s the priority?`,
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
      content: `Got it: "${prompt}"

Here’s how I can help right now:
• Clarify status and next steps
• Flag risks and deadlines
• Create alerts or assign tasks

Quick actions
• "Project status"
• "Show risks"
• "Create alert"
• "Complete task: <item>"

What should we do first?`,
      confidence: 0.85,
      source: 'mock-responses',
      suggestedActions: [
        { type: 'priorities_today', label: "Today's Priorities" },
        { type: 'project_status', label: 'Project Status' },
        { type: 'risks_overview', label: 'Risks & Blockers' }
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