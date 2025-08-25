class OpenAIService {
  constructor() {
    this.isEnabled = false;
    this.client = null;
    this.apiKey = null;
    // Default to gpt-5 unless overridden; service uses server-owned key and is always on
    this.model = process.env.OPENAI_MODEL || 'gpt-5';
    
    // Try to initialize OpenAI if available
    console.log('🔍 OpenAI Initialization: Checking for API key...');
    // Sanitize key to avoid invisible whitespace/quotes issues
    const rawKey = process.env.OPENAI_API_KEY;
    const sanitizedKey = typeof rawKey === 'string' 
      ? rawKey.trim().replace(/^['\"]|['\"]$/g, '')
      : null;
    this.apiKey = sanitizedKey || null;
    console.log('🔍 API Key present:', !!this.apiKey);
    console.log('🔍 API Key length:', this.apiKey ? this.apiKey.length : 0);
    console.log('🔍 API Key first 20 chars:', this.apiKey ? this.apiKey.substring(0, 20) + '...' : 'NONE');
    console.log('🔍 API Key last 4 chars:', this.apiKey ? '...' + this.apiKey.slice(-4) : 'NONE');
    
    if (this.apiKey) {
      try {
        console.log('🔍 OpenAI: Loading OpenAI package...');
        const OpenAI = require('openai');
        console.log('🔍 OpenAI: Creating v4 client...');
        this.client = new OpenAI({ apiKey: this.apiKey });
        this.isEnabled = true;
        console.log(`✅ OpenAI service initialized successfully with model: ${this.model}`);
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
      const systemPrompt = context.systemPrompt || this.buildSystemPrompt(context);
      const messages = this.buildMessages(systemPrompt, prompt, context);

      console.log('🔍 Making OpenAI API call...');
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        max_tokens: 900,
        temperature: 0.8,
        presence_penalty: 0.3,
        frequency_penalty: 0.1
      });
      console.log('✅ OpenAI API call successful');

      const aiResponse = response.choices[0].message.content;
      
      return {
        type: this.detectResponseType(prompt),
        content: aiResponse,
        confidence: 0.95,
        source: `openai:${this.model}`,
        suggestedActions: this.extractSuggestedActions(aiResponse, context),
        metadata: {
          model: this.model,
          tokens: response.usage?.total_tokens,
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
    return `You are Bubbles, the proactive AI project copilot for construction and roofing teams. Your goal is to make the next best action obvious and fast while sounding like a helpful, normal human — not robotic.

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
- Sound conversational and warm; acknowledge naturally; avoid repeating the user's phrasing
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

  buildMessages(systemPrompt, prompt, context) {
    const messages = [{ role: 'system', content: systemPrompt }];

    // Add recent conversation history as alternating user/assistant messages
    if (Array.isArray(context.conversationHistory) && context.conversationHistory.length > 0) {
      const recent = context.conversationHistory.slice(-8); // last 8 turns max
      for (const item of recent) {
        if (item && typeof item.message === 'string' && item.message.trim().length > 0) {
          messages.push({ role: 'user', content: this.truncateForContext(item.message) });
        }
        const respText = this.extractResponseText(item?.response);
        if (respText) {
          messages.push({ role: 'assistant', content: this.truncateForContext(respText) });
        }
      }
    }

    // Current user prompt with embedded lightweight context
    const userPrompt = this.buildUserPrompt(prompt, context);
    messages.push({ role: 'user', content: userPrompt });

    return messages;
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
        const priorResponseText = typeof item.response === 'string'
          ? item.response
          : (item.response && typeof item.response.content === 'string'
              ? item.response.content
              : '');
        const snippet = priorResponseText
          ? priorResponseText.substring(0, 200)
          : '[no prior response]';
        contextualPrompt += `User: ${item.message}\nBubbles: ${snippet}...\n`;
      });
    }

    return contextualPrompt;
  }

  extractResponseText(response) {
    if (!response) return '';
    if (typeof response === 'string') return response;
    if (typeof response.content === 'string') return response.content;
    if (response.message && typeof response.message.content === 'string') return response.message.content;
    return '';
  }

  truncateForContext(text) {
    if (!text || typeof text !== 'string') return '';
    const max = 500;
    return text.length > max ? `${text.slice(0, max)}…` : text;
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

    // Default: action-first, no canned phrasing
    const hasProject = Boolean(context && context.projectName);
    const content = hasProject
      ? `I'm ready to act on ${context.projectName}. Choose a next step:
• Project status
• Show incomplete tasks
• Complete a task (name it)`
      : `Tell me the project number or primary customer name so I can act (e.g., "Use project #12345" or the customer's name).`;

    const actions = hasProject
      ? [
          { type: 'project_status', label: 'Project Status' },
          { type: 'view_pending', label: 'Show Incomplete Tasks' },
          { type: 'complete_task', label: 'Complete a Task' }
        ]
      : [
          { type: 'use_project', label: 'Use Project #_____'}
        ];

    return {
      type: hasProject ? 'project_assist' : 'project_selection',
      content,
      confidence: 0.85,
      source: 'mock-responses',
      suggestedActions: actions
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
      model: this.isEnabled ? this.model : 'mock-responses',
      status: this.isEnabled ? 'active' : 'fallback'
    };
  }

  /**
   * Generate a single-shot response without conversation scaffolding.
   * Used to turn tool results into concise confirmations.
   */
  async generateSingleResponse(prompt) {
    if (!this.isEnabled) {
      return {
        content: prompt && typeof prompt === 'string' ? prompt.slice(0, 400) : 'Acknowledged.',
        confidence: 0.9,
        source: 'mock-responses'
      };
    }

    try {
      const messages = [
        { role: 'system', content: 'You are a concise, professional assistant. Reply in under 80 words.' },
        { role: 'user', content: String(prompt) }
      ];

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        max_tokens: 200,
        temperature: 0.3
      });

      return {
        content: response.choices?.[0]?.message?.content || 'Done.',
        confidence: 0.95,
        source: `openai:${this.model}`
      };
    } catch (error) {
      console.error('❌ OpenAI single response error:', error?.message || error);
      return {
        content: 'Acknowledged.',
        confidence: 0.7,
        source: 'fallback'
      };
    }
  }
}

// Export singleton instance
module.exports = new OpenAIService();