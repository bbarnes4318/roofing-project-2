const express = require('express');
const { body, validationResult } = require('express-validator');
const { 
  asyncHandler, 
  sendSuccess, 
  sendPaginatedResponse,
  formatValidationErrors,
  AppError 
} = require('../middleware/errorHandler');
const { 
  managerAndAbove, 
  projectManagerAndAbove 
} = require('../middleware/auth');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Activity = require('../models/Activity');
const Document = require('../models/Document');

const router = express.Router();

// Mock AI responses - In production, replace with actual AI service calls
const generateAIResponse = async (prompt, context = {}) => {
  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  // Mock responses based on prompt keywords
  if (prompt.toLowerCase().includes('project') && prompt.toLowerCase().includes('analysis')) {
    return {
      type: 'project_analysis',
      content: `Based on the project data analysis, here are key insights:

• **Progress Status**: Current project is ${context.progress || 'N/A'}% complete
• **Timeline**: ${context.timeline || 'On schedule based on current metrics'}
• **Risk Assessment**: ${context.risks || 'Low to medium risk factors identified'}
• **Resource Allocation**: ${context.resources || 'Optimal resource distribution'}
• **Next Steps**: ${context.nextSteps || 'Continue monitoring critical path activities'}

**Recommendations:**
1. Focus on completing high-priority tasks
2. Monitor material delivery schedules
3. Ensure team communication remains consistent
4. Review quality checkpoints regularly`,
      confidence: 0.85,
      sources: ['project_data', 'historical_patterns', 'industry_standards']
    };
  }
  
  if (prompt.toLowerCase().includes('schedule') || prompt.toLowerCase().includes('timeline')) {
    return {
      type: 'schedule_optimization',
      content: `**Schedule Analysis & Optimization Recommendations:**

• **Critical Path**: Identified 3 critical activities that could impact delivery
• **Resource Conflicts**: 2 potential scheduling conflicts detected
• **Weather Impact**: 15% buffer recommended for outdoor activities
• **Dependency Chain**: All dependencies properly mapped and validated

**Optimization Strategies:**
1. **Parallel Processing**: 4 activities can be executed simultaneously
2. **Resource Reallocation**: Suggest moving 2 team members to critical tasks
3. **Early Start Opportunities**: 3 tasks can begin 2 days earlier
4. **Risk Mitigation**: Add 3-day buffer for material delivery delays`,
      confidence: 0.78,
      sources: ['project_schedule', 'resource_calendar', 'weather_data']
    };
  }
  
  if (prompt.toLowerCase().includes('cost') || prompt.toLowerCase().includes('budget')) {
    return {
      type: 'cost_analysis',
      content: `**Cost Analysis & Budget Optimization:**

• **Current Spend**: ${context.currentSpend || '67%'} of allocated budget utilized
• **Projected Completion**: ${context.projectedCost || '98%'} of budget expected
• **Cost Variance**: ${context.variance || '+2.3%'} above initial estimates
• **Savings Opportunities**: ${context.savings || '$12,500'} identified in material costs

**Budget Recommendations:**
1. **Material Sourcing**: Alternative suppliers could save 8%
2. **Labor Optimization**: Current efficiency at 94% - target 98%
3. **Waste Reduction**: Implement lean practices for 3% savings
4. **Timeline Acceleration**: Early completion bonus of $5,000 available`,
      confidence: 0.82,
      sources: ['budget_tracking', 'vendor_pricing', 'historical_projects']
    };
  }
  
  if (prompt.toLowerCase().includes('quality') || prompt.toLowerCase().includes('inspection')) {
    return {
      type: 'quality_assessment',
      content: `**Quality Control & Inspection Analysis:**

• **Quality Score**: Current project quality rating: 94/100
• **Inspection Results**: 12 checkpoints completed, 2 pending
• **Defect Rate**: 0.8% - well below industry average of 2.3%
• **Compliance Status**: 100% compliant with building codes

**Quality Improvement Actions:**
1. **Preventive Measures**: Implement 3 additional quality gates
2. **Training Focus**: Specialized training for 2 critical processes
3. **Tool Calibration**: Schedule equipment calibration checks
4. **Documentation**: Enhance quality documentation procedures`,
      confidence: 0.91,
      sources: ['inspection_reports', 'quality_metrics', 'compliance_standards']
    };
  }
  
  // Default general response
  return {
    type: 'general_assistance',
    content: `I understand you're asking about: "${prompt}"

Based on the available project data and construction industry best practices, here's my analysis:

**Key Considerations:**
• Current project metrics and performance indicators
• Industry standards and regulatory requirements
• Resource availability and allocation efficiency
• Timeline optimization opportunities
• Risk mitigation strategies

**Recommendations:**
1. **Data-Driven Decisions**: Leverage project analytics for informed choices
2. **Proactive Planning**: Anticipate potential challenges and prepare solutions
3. **Stakeholder Communication**: Maintain clear communication channels
4. **Continuous Improvement**: Regular process evaluation and optimization

Would you like me to focus on any specific aspect of your project or provide more detailed analysis on a particular area?`,
    confidence: 0.75,
    sources: ['project_context', 'industry_knowledge', 'best_practices']
  };
};

// Validation rules
const chatValidation = [
  body('message')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message must be between 1 and 2000 characters'),
  body('projectId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Project ID must be a positive integer'),
  body('context')
    .optional()
    .isObject()
    .withMessage('Context must be an object')
];

// @desc    Chat with AI assistant
// @route   POST /api/ai/chat
// @access  Private
router.post('/chat', chatValidation, asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors)
    });
  }

  const { message, projectId, context = {} } = req.body;

  // Get project context if projectId provided
  let projectContext = {};
  if (projectId) {
    const project = await Project.findOne({ id: projectId });
    if (project) {
      projectContext = {
        projectName: project.name,
        progress: project.progress,
        status: project.status,
        estimateValue: project.estimateValue,
        timeline: `${project.startDate} to ${project.endDate}`,
        projectManager: project.projectManager
      };
    }
  }

  // Generate AI response
  const aiResponse = await generateAIResponse(message, { ...context, ...projectContext });

  // Log the interaction
  const chatLog = {
    userId: req.user._id,
    userName: req.user.fullName || `${req.user.firstName} ${req.user.lastName}`,
    message,
    response: aiResponse.content,
    responseType: aiResponse.type,
    confidence: aiResponse.confidence,
    projectId: projectId || null,
    context: { ...context, ...projectContext },
    timestamp: new Date()
  };

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`user_${req.user._id}`).emit('ai_response', {
    message,
    response: aiResponse,
    timestamp: new Date()
  });

  sendSuccess(res, 200, {
    message,
    response: aiResponse,
    chatLog
  }, 'AI response generated successfully');
}));

// @desc    Analyze project with AI
// @route   POST /api/ai/analyze-project/:projectId
// @access  Private
router.post('/analyze-project/:projectId', asyncHandler(async (req, res, next) => {
  const projectId = parseInt(req.params.projectId);
  
  const project = await Project.findOne({ id: projectId });
  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  // Get related data
  const [tasks, activities, documents] = await Promise.all([
    Task.find({ projectId }).lean(),
    Activity.find({ projectId }).lean(),
    Document.find({ projectId }).lean()
  ]);

  // Prepare analysis context
  const analysisContext = {
    project: {
      name: project.name,
      status: project.status,
      progress: project.progress,
      estimateValue: project.estimateValue,
      startDate: project.startDate,
      endDate: project.endDate,
      teamSize: project.teamSize,
      priority: project.priority
    },
    tasks: {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      pending: tasks.filter(t => t.status === 'pending').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed').length
    },
    activities: {
      total: activities.length,
      recent: activities.filter(a => new Date(a.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length
    },
    documents: {
      total: documents.length,
      categories: [...new Set(documents.map(d => d.category))]
    }
  };

  // Generate comprehensive analysis
  const analysis = await generateAIResponse(
    `Provide a comprehensive analysis of project: ${project.name}`,
    analysisContext
  );

  // Calculate additional metrics
  const metrics = {
    healthScore: Math.round(85 + Math.random() * 10), // Mock health score
    riskLevel: project.priority === 'High' ? 'Medium' : 'Low',
    completionPrediction: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    budgetUtilization: Math.round(60 + Math.random() * 30),
    teamEfficiency: Math.round(80 + Math.random() * 15)
  };

  sendSuccess(res, 200, {
    projectId,
    analysis,
    context: analysisContext,
    metrics,
    generatedAt: new Date()
  }, 'Project analysis completed successfully');
}));

// @desc    Get AI insights for dashboard
// @route   GET /api/ai/insights
// @access  Private
router.get('/insights', asyncHandler(async (req, res) => {
  const { timeframe = '30' } = req.query;
  
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - parseInt(timeframe));

  // Get recent data for insights
  const [projects, tasks, activities] = await Promise.all([
    Project.find({ createdAt: { $gte: dateThreshold } }).lean(),
    Task.find({ createdAt: { $gte: dateThreshold } }).lean(),
    Activity.find({ createdAt: { $gte: dateThreshold } }).lean()
  ]);

  // Generate insights
  const insights = [
    {
      id: 1,
      type: 'performance',
      title: 'Project Performance Trending Up',
      description: 'Overall project completion rate has improved by 12% this month',
      priority: 'Medium',
      actionable: true,
      recommendation: 'Continue current practices and consider scaling successful strategies',
      confidence: 0.87,
      createdAt: new Date()
    },
    {
      id: 2,
      type: 'risk',
      title: 'Weather Impact Alert',
      description: 'Upcoming weather patterns may affect 3 outdoor projects',
      priority: 'High',
      actionable: true,
      recommendation: 'Review schedules and prepare contingency plans for affected projects',
      confidence: 0.92,
      createdAt: new Date()
    },
    {
      id: 3,
      type: 'optimization',
      title: 'Resource Allocation Opportunity',
      description: 'Team efficiency could be improved by 8% with better task distribution',
      priority: 'Medium',
      actionable: true,
      recommendation: 'Implement automated task assignment based on skill matching',
      confidence: 0.79,
      createdAt: new Date()
    },
    {
      id: 4,
      type: 'cost',
      title: 'Material Cost Savings Available',
      description: 'Alternative suppliers could reduce material costs by 6%',
      priority: 'Low',
      actionable: true,
      recommendation: 'Evaluate new suppliers and negotiate better rates for bulk purchases',
      confidence: 0.84,
      createdAt: new Date()
    }
  ];

  sendSuccess(res, 200, {
    insights,
    dataPoints: {
      projects: projects.length,
      tasks: tasks.length,
      activities: activities.length
    },
    timeframe: parseInt(timeframe),
    generatedAt: new Date()
  }, 'AI insights generated successfully');
}));

// @desc    Generate project recommendations
// @route   POST /api/ai/recommendations/:projectId
// @access  Private (Project Manager and above)
router.post('/recommendations/:projectId', projectManagerAndAbove, asyncHandler(async (req, res, next) => {
  const projectId = parseInt(req.params.projectId);
  const { focusArea = 'general' } = req.body;
  
  const project = await Project.findOne({ id: projectId });
  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  // Generate recommendations based on focus area
  let recommendations = [];
  
  switch (focusArea) {
    case 'schedule':
      recommendations = [
        {
          id: 1,
          category: 'Schedule Optimization',
          title: 'Parallel Task Execution',
          description: 'Execute foundation and framing preparations simultaneously',
          impact: 'High',
          effort: 'Medium',
          timesSaved: '3-5 days',
          implementation: 'Coordinate with structural team and adjust resource allocation'
        },
        {
          id: 2,
          category: 'Timeline Management',
          title: 'Early Material Delivery',
          description: 'Schedule material delivery 2 days before needed',
          impact: 'Medium',
          effort: 'Low',
          timesSaved: '1-2 days',
          implementation: 'Update vendor delivery schedules and storage arrangements'
        }
      ];
      break;
      
    case 'cost':
      recommendations = [
        {
          id: 1,
          category: 'Cost Reduction',
          title: 'Bulk Material Purchase',
          description: 'Combine orders with other projects for volume discounts',
          impact: 'High',
          effort: 'Medium',
          savings: '$8,500',
          implementation: 'Coordinate with procurement team and adjust ordering schedules'
        },
        {
          id: 2,
          category: 'Budget Optimization',
          title: 'Labor Efficiency Improvement',
          description: 'Implement lean construction practices',
          impact: 'Medium',
          effort: 'High',
          savings: '$12,000',
          implementation: 'Train team on lean practices and update workflows'
        }
      ];
      break;
      
    case 'quality':
      recommendations = [
        {
          id: 1,
          category: 'Quality Assurance',
          title: 'Additional Quality Gates',
          description: 'Add 2 intermediate quality checkpoints',
          impact: 'High',
          effort: 'Low',
          benefit: 'Reduce rework by 40%',
          implementation: 'Schedule additional inspections at 40% and 70% completion'
        },
        {
          id: 2,
          category: 'Process Improvement',
          title: 'Digital Quality Documentation',
          description: 'Implement mobile quality tracking system',
          impact: 'Medium',
          effort: 'Medium',
          benefit: 'Improve documentation accuracy by 60%',
          implementation: 'Deploy mobile app and train team on digital processes'
        }
      ];
      break;
      
    default:
      recommendations = [
        {
          id: 1,
          category: 'General Optimization',
          title: 'Communication Enhancement',
          description: 'Implement daily standup meetings',
          impact: 'Medium',
          effort: 'Low',
          benefit: 'Improve team coordination',
          implementation: 'Schedule 15-minute daily meetings at 8 AM'
        },
        {
          id: 2,
          category: 'Risk Management',
          title: 'Contingency Planning',
          description: 'Develop weather and supply chain backup plans',
          impact: 'High',
          effort: 'Medium',
          benefit: 'Reduce project delays by 30%',
          implementation: 'Create detailed contingency procedures and backup supplier list'
        }
      ];
  }

  sendSuccess(res, 200, {
    projectId,
    focusArea,
    recommendations,
    projectContext: {
      name: project.name,
      status: project.status,
      progress: project.progress
    },
    generatedAt: new Date()
  }, 'Project recommendations generated successfully');
}));

// @desc    Process document with AI
// @route   POST /api/ai/process-document/:documentId
// @access  Private
router.post('/process-document/:documentId', asyncHandler(async (req, res, next) => {
  const documentId = parseInt(req.params.documentId);
  const { analysisType = 'general' } = req.body;
  
  const document = await Document.findOne({ id: documentId });
  if (!document) {
    return next(new AppError('Document not found', 404));
  }

  // Check access permissions
  const hasAccess = !document.isPrivate || 
                   document.uploadedBy.toString() === req.user._id.toString() ||
                   ['admin', 'manager'].includes(req.user.role);

  if (!hasAccess) {
    return next(new AppError('Access denied', 403));
  }

  // Mock document processing based on file type and analysis type
  let analysis = {};
  
  if (document.category === 'contract') {
    analysis = {
      type: 'contract_analysis',
      keyTerms: [
        'Payment schedule: Net 30 days',
        'Completion deadline: 90 days from start',
        'Change order approval required',
        'Warranty period: 2 years'
      ],
      riskFactors: [
        'Weather delay clauses need clarification',
        'Material cost escalation not addressed'
      ],
      recommendations: [
        'Add force majeure clause',
        'Define material cost adjustment mechanism'
      ],
      confidence: 0.89
    };
  } else if (document.category === 'blueprint') {
    analysis = {
      type: 'blueprint_analysis',
      specifications: [
        'Total square footage: 2,450 sq ft',
        'Foundation type: Concrete slab',
        'Roof structure: Gable with asphalt shingles',
        'Electrical: 200 amp service'
      ],
      materialEstimate: {
        concrete: '45 cubic yards',
        lumber: '12,000 board feet',
        roofing: '28 squares',
        electrical: '2,200 linear feet'
      },
      complexity: 'Medium',
      estimatedDuration: '12-16 weeks',
      confidence: 0.82
    };
  } else {
    analysis = {
      type: 'general_analysis',
      summary: `Document analysis for ${document.name}`,
      keyPoints: [
        'Document is well-structured and complete',
        'All required information appears to be present',
        'No obvious issues or concerns identified'
      ],
      recommendations: [
        'Review with relevant team members',
        'Archive in appropriate project folder'
      ],
      confidence: 0.75
    };
  }

  // Update document with analysis
  await Document.findOneAndUpdate(
    { id: documentId },
    { 
      $set: { 
        aiAnalysis: analysis,
        lastAnalyzedAt: new Date(),
        lastAnalyzedBy: req.user._id
      }
    }
  );

  sendSuccess(res, 200, {
    documentId,
    document: {
      name: document.name,
      category: document.category,
      mimeType: document.mimeType
    },
    analysis,
    analysisType,
    generatedAt: new Date()
  }, 'Document processed successfully');
}));

// @desc    Get AI chat history
// @route   GET /api/ai/chat-history
// @access  Private
router.get('/chat-history', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, projectId } = req.query;

  // In a real implementation, this would come from a ChatHistory model
  // For now, return mock data
  const chatHistory = [
    {
      id: 1,
      message: 'Can you analyze the progress of Project Alpha?',
      response: 'Project Alpha is currently 75% complete and on schedule...',
      responseType: 'project_analysis',
      projectId: projectId ? parseInt(projectId) : 1,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
      id: 2,
      message: 'What are the main risks for upcoming projects?',
      response: 'Based on current data, the main risks include weather delays...',
      responseType: 'risk_analysis',
      projectId: null,
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000)
    }
  ];

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const total = chatHistory.length;

  sendPaginatedResponse(res, chatHistory, pageNum, limitNum, total, 'Chat history retrieved successfully');
}));

// @desc    Get AI capabilities and features
// @route   GET /api/ai/capabilities
// @access  Private
router.get('/capabilities', asyncHandler(async (req, res) => {
  const capabilities = {
    chatAssistant: {
      name: 'AI Chat Assistant',
      description: 'Interactive chat for project questions and guidance',
      features: [
        'Natural language project queries',
        'Context-aware responses',
        'Project-specific insights',
        'Real-time assistance'
      ],
      status: 'active'
    },
    projectAnalysis: {
      name: 'Project Analysis',
      description: 'Comprehensive project performance analysis',
      features: [
        'Progress tracking',
        'Risk assessment',
        'Timeline optimization',
        'Resource allocation'
      ],
      status: 'active'
    },
    documentProcessing: {
      name: 'Document Processing',
      description: 'AI-powered document analysis and extraction',
      features: [
        'Contract analysis',
        'Blueprint interpretation',
        'Specification extraction',
        'Compliance checking'
      ],
      status: 'active'
    },
    predictiveInsights: {
      name: 'Predictive Insights',
      description: 'Future trend analysis and recommendations',
      features: [
        'Completion predictions',
        'Cost forecasting',
        'Risk prediction',
        'Performance trends'
      ],
      status: 'active'
    },
    qualityAssurance: {
      name: 'Quality Assurance',
      description: 'AI-powered quality control and inspection',
      features: [
        'Defect detection',
        'Compliance verification',
        'Quality scoring',
        'Improvement recommendations'
      ],
      status: 'beta'
    }
  };

  sendSuccess(res, 200, {
    capabilities,
    totalFeatures: Object.keys(capabilities).length,
    activeFeatures: Object.values(capabilities).filter(c => c.status === 'active').length,
    version: '1.0.0'
  }, 'AI capabilities retrieved successfully');
}));

module.exports = router; 