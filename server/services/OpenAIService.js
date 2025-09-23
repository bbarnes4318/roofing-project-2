class OpenAIService {
  constructor() {
    this.isEnabled = false;
    this.client = null;
    this.apiKey = null;
    // Default to gpt-4o-mini unless overridden; service uses server-owned key and is always on
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.lastError = null;
    this.lastUsedModel = null;
    this.lastUsedApi = null;
    
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
        this.lastError = null;
      } catch (error) {
        console.error('❌ OpenAI package not found or failed to initialize:', error.message);
        console.error('❌ Full error:', error);
        console.log('⚠️ Using enhanced mock responses instead');
        this.isEnabled = false;
        this.lastError = error?.message || String(error);
      }
    } else {
      console.log('⚠️ OpenAI API key not provided, using enhanced mock responses');
      this.lastError = 'OPENAI_API_KEY not provided';
    }
  }

  async generateResponse(prompt, context = {}) {
    if (!this.isEnabled) {
      return this.generateMockResponse(prompt, context);
    }

    const systemPrompt = context.systemPrompt || this.buildSystemPrompt(context);
    const messages = this.buildMessages(systemPrompt, prompt, context);

    const attemptResponses = async (modelName) => {
      console.log('🔍 Making OpenAI API call (responses.create)...', modelName);
      const response = await this.client.responses.create({
        model: modelName,
        input: messages,
        max_output_tokens: 900,
        temperature: 0.8,
      });
      console.log('✅ OpenAI API call successful (responses.create)', modelName);
      this.lastError = null;
      this.lastUsedModel = modelName;
      this.lastUsedApi = 'responses';
      const text = response.output_text 
        || response?.output?.[0]?.content?.[0]?.text 
        || response?.choices?.[0]?.message?.content 
        || '';
      const aiResponse = text || 'OK';
      return {
        type: this.detectResponseType(prompt),
        content: aiResponse,
        confidence: 0.95,
        source: `openai:${modelName}`,
        suggestedActions: this.extractSuggestedActions(aiResponse, context),
        metadata: { model: modelName, tokens: response.usage?.total_tokens, timestamp: new Date() }
      };
    };

    const tryModel = async (modelName) => {
      try {
        return await attemptResponses(modelName);
      } catch (error) {
        console.error('❌ OpenAI responses.create error:', error?.message || error);
        this.lastError = error?.message || String(error);
        // Fallback path: try chat.completions for orgs without Responses API access
        try {
          console.log('🔁 Falling back to chat.completions API...', modelName);
          const chatResponse = await this.client.chat.completions.create({
            model: modelName,
            messages,
            max_tokens: 900,
            temperature: 0.8
          });
          console.log('✅ OpenAI API call successful (chat.completions.create)', modelName);
          this.lastError = null;
          this.lastUsedModel = modelName;
          this.lastUsedApi = 'chat.completions';
          const text = chatResponse?.choices?.[0]?.message?.content || '';
          const aiResponse = text || 'OK';
          return {
            type: this.detectResponseType(prompt),
            content: aiResponse,
            confidence: 0.95,
            source: `openai:${modelName}`,
            suggestedActions: this.extractSuggestedActions(aiResponse, context),
            metadata: { model: modelName, tokens: chatResponse.usage?.total_tokens, timestamp: new Date(), api: 'chat.completions' }
          };
        } catch (chatErr) {
          console.error('❌ OpenAI chat.completions error:', chatErr?.message || chatErr);
          this.lastError = chatErr?.message || String(chatErr);
          throw error; // rethrow original to trigger outer fallbacks
        }
      }
    };

    try {
      // Primary model
      return await tryModel(this.model);
    } catch (error) {
      console.error('❌ OpenAI API error (primary model):', error?.message || error);
      // Fallback model
      const fallbackModel = process.env.OPENAI_FALLBACK_MODEL || 'gpt-4o';
      try {
        return await tryModel(fallbackModel);
      } catch (error2) {
        console.error('❌ OpenAI API error (fallback model):', error2?.message || error2);
        this.lastError = error2?.message || String(error2);
        return this.generateMockResponse(prompt, context);
      }
    }
  }

  buildSystemPrompt(context) {
    return `You are Bubbles, a proactive project copilot for construction and roofing teams. Write in a natural, conversational tone — like a human.

Context:
${context.projectName ? `Current project: ${context.projectName}` : 'No specific project selected'}
${context.userRole ? `User role: ${context.userRole}` : ''}
${context.activeAlerts ? `Active alerts: ${context.activeAlerts}` : ''}
${context.workflowStatus ? `Workflow: ${context.workflowStatus}` : ''}

Style rules:
- Keep it concise and actionable.
- Do not use numbered lists (1., 2., 3.).
- Avoid heavy formatting, headings, and bold text.
- Prefer short paragraphs. Use a list only if the user explicitly asks for one.
- If you suggest next steps, keep them inline as a short sentence at the end (e.g., Next: do X, then Y).

If document context is provided, treat it as the primary source of truth:
- Use the document context (“documentSnippets”) to answer fact questions.
- If you assert a fact from a snippet, add a minimal inline citation like [file:ID p:N] at the end of that sentence.
- If no relevant snippet exists, answer from general knowledge.

Format:
- Natural sentences and short paragraphs.
- ≤ 250 words unless the user asks for more.`;
  }

  buildMessages(systemPrompt, prompt, context) {
    const messages = [{ role: 'system', content: systemPrompt }];

    if (Array.isArray(context.conversationHistory) && context.conversationHistory.length > 0) {
      const recent = context.conversationHistory.slice(-8);
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

    // Inject document context if available
    if (Array.isArray(context.documentSnippets) && context.documentSnippets.length > 0) {
      const block = ['--- DOCUMENT CONTEXT BEGIN ---', ...context.documentSnippets, '--- DOCUMENT CONTEXT END ---'].join('\n\n');
      messages.push({ role: 'user', content: block });
    }

    const userPrompt = this.buildUserPrompt(prompt, context);
    messages.push({ role: 'user', content: userPrompt });

    return messages;
  }

  buildUserPrompt(prompt, context) {
    let contextualPrompt = prompt;
    
    if (context.projectName) {
      contextualPrompt += `\n\nProject Context: ${context.projectName}`;
      if (context.progress) contextualPrompt += ` (${context.progress}% complete)`;
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
    
    if (actions.length === 0) {
      actions.push({ type: 'help', label: 'Show Commands' });
    }
    
    return actions.slice(0, 3);
  }

  // Enhanced mock response generator for when OpenAI is not available
  generateMockResponse(prompt, context) {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('help') || lowerPrompt.includes('what can you do') || lowerPrompt === 'help') {
      return {
        type: 'capabilities',
        content: `I can summarize project status with next steps, surface risks and blockers, create alerts and assign tasks, update workflow items and milestones, and forecast timelines.
${context.projectName ? `We’re focused on ${context.projectName}. ` : ''}Ask me for priorities, project status, or to create an alert. Next: say what you want to do, and I’ll do it.`,
        confidence: 1.0,
        source: 'mock-responses',
        suggestedActions: [
          { type: 'priorities_today', label: "Today's priorities" },
          { type: 'project_status', label: 'Project status' },
          { type: 'create_alert', label: 'Create alert' }
        ]
      };
    }

    if (lowerPrompt.includes('status') || lowerPrompt.includes('progress')) {
      if (context.projectName) {
        return {
          type: 'project_status',
          content: `Project: ${context.projectName}
${context.projectNumber ? `Project number: #${String(context.projectNumber).padStart(5, '0')}
` : ''}Progress: ${context.progress ?? 'N/A'}%
Phase: N/A
Section: N/A
Line item: N/A
Next: no upcoming items found.`,
          confidence: 0.94,
          source: 'mock-responses',
          suggestedActions: [
            { type: 'view_workflow', label: 'View workflow' },
            { type: 'check_alerts', label: 'Check alerts' },
            { type: 'team_status', label: 'Team status' }
          ]
        };
      }
    }

    if (lowerPrompt.includes('complete') || lowerPrompt.includes('mark') || lowerPrompt.includes('done')) {
      return {
        type: 'workflow_action',
        content: `I can complete a task. Tell me the task name${context.projectName ? ` for ${context.projectName}` : ''}, and add any notes if needed. For example: "Mark foundation inspection complete". Next: name the task to complete.`,
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
        content: `Let’s create an alert. Tell me the priority (urgent, high, medium, or low) and the message. ${context.projectName ? `This will be for ${context.projectName}. ` : ''}Example: Create urgent alert: weather delay. Next: give me the priority and message.`,
        confidence: 0.90,
        source: 'mock-responses',
        suggestedActions: [
          { type: 'urgent_alert', label: 'Create Urgent Alert' },
          { type: 'general_alert', label: 'Create General Alert' },
          { type: 'check_alerts', label: 'View Existing Alerts' }
        ]
      };
    }

    const hasProject = Boolean(context && context.projectName);
    const content = hasProject
      ? `I’m ready to act on ${context.projectName}. Tell me whether you want status, to see incomplete tasks, or to complete a specific task.`
      : `Tell me which project you want to use (project number or customer name) so I can act.`;

    const actions = hasProject
      ? [
          { type: 'project_status', label: 'Project Status' },
          { type: 'view_pending', label: 'Show Incomplete Tasks' },
          { type: 'complete_task', label: 'Complete a Task' }
        ]
      : [
          { type: 'use_project', label: 'Use Project #_____' }
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
      status: this.isEnabled ? 'active' : 'fallback',
      lastError: this.lastError,
      activeModel: this.lastUsedModel || null,
      activeApi: this.lastUsedApi || null
    };
  }

  /**
   * Generate a bulletproof single-shot response with guaranteed project context
   */
  async generateSingleResponse(prompt, projectContext = null) {
    if (!this.isEnabled) {
      return {
        content: prompt && typeof prompt === 'string' ? prompt.slice(0, 400) : 'Acknowledged.',
        confidence: 0.9,
        source: 'mock-responses'
      };
    }

    try {
      let systemContent = `# BUBBLES AI ASSISTANT - SINGLE RESPONSE GENERATOR

## CORE INSTRUCTIONS
- You are a concise, professional assistant
- Reply in under 80 words
- Use proper formatting with bullet points and bold text
- Be natural and conversational
- NEVER use numbered lists (1., 2., 3.) - use bullet points (-) or bold headings instead
- If you need to list items, use bullet points (-) or bold headings (**Heading:**)

## PROJECT CONTEXT RULES
${projectContext && projectContext.projectName ? `
### ✅ ACTIVE PROJECT: ${projectContext.projectName}
- **Customer:** ${projectContext.customer?.primaryName || 'N/A'}

Display rules:
- Show Project Number, never the internal Project ID
- Do not use a field named "Status"; show Phase, Section, Line Item, and Next Actions

### 🚨 MANDATORY RULES:
1. **NEVER ask for project numbers or customer names**
2. **ALWAYS use the selected project context**
3. **Project is already selected - no need for identification**
4. **Answer directly using the selected project**

### ✅ CORRECT BEHAVIOR:
- Use project context automatically
- Answer questions about the selected project
- Provide project-specific information
- Suggest relevant next actions

### ❌ INCORRECT BEHAVIOR:
- Asking "Tell me the project number"
- Asking for customer identification
- Asking for project identification
- Asking "Use project #12345"

**REMEMBER:** The project is already selected. Use it directly without asking for identification.
` : `
### ❌ NO PROJECT SELECTED
- Answer general questions directly
- If project-specific question: Ask user to select project
`}

## RESPONSE REQUIREMENTS
- Natural and conversational tone
- Proper formatting with bullet points
- Clear and concise information
- Relevant next actions when appropriate
- NEVER ask for project identification when project is selected`;

      const messages = [
        { role: 'system', content: systemContent },
        { role: 'user', content: String(prompt) }
      ];

      const response = await this.client.responses.create({
        model: this.model,
        input: messages,
        max_output_tokens: 200,
        temperature: 0.3
      });
      const text = response.output_text 
        || response?.output?.[0]?.content?.[0]?.text 
        || response?.choices?.[0]?.message?.content 
        || 'Done.';

      return {
        content: text,
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