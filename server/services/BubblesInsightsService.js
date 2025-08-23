const { PrismaClient } = require('@prisma/client');
const openAIService = require('./OpenAIService');

const prisma = new PrismaClient();

class BubblesInsightsService {
  constructor() {
    this.insightCache = new Map();
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  }

  // Generate comprehensive project insights
  async generateProjectInsights(projectId, userId) {
    const cacheKey = `project_insights_${projectId}`;
    const cached = this.insightCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const projectData = await this.fetchProjectAnalysisData(projectId);
      const insights = await this.generateAIInsights(projectData);
      const combinedInsights = await this.combineInsights(projectData, insights);
      
      this.insightCache.set(cacheKey, {
        data: combinedInsights,
        timestamp: Date.now()
      });
      
      return combinedInsights;
      
    } catch (error) {
      console.error('Error generating project insights:', error);
      return this.getFallbackInsights(projectId);
    }
  }

  // Generate portfolio-level insights
  async generatePortfolioInsights(userId) {
    try {
      const portfolioData = await this.fetchPortfolioData(userId);
      const insights = await this.analyzePortfolioPerformance(portfolioData);
      
      return {
        insights,
        recommendations: await this.generatePortfolioRecommendations(portfolioData),
        metrics: this.calculatePortfolioMetrics(portfolioData),
        trends: this.identifyTrends(portfolioData)
      };
      
    } catch (error) {
      console.error('Error generating portfolio insights:', error);
      return this.getFallbackPortfolioInsights();
    }
  }

  // Predictive analytics for project completion
  async predictProjectCompletion(projectId) {
    try {
      const idAsString = String(projectId);
      let project = await prisma.project.findUnique({
        where: { id: idAsString },
        include: {
          workflow: { include: { phases: { include: { sections: { include: { lineItems: true } } } } } },
          alerts: true,
          tasks: true
        }
      });

      if (!project) return null;

      const prediction = this.calculateCompletionPrediction(project);
      
      return {
        projectId,
        predictedCompletion: prediction.date,
        confidence: prediction.confidence,
        factors: prediction.factors,
        risks: prediction.risks,
        recommendations: prediction.recommendations
      };
      
    } catch (error) {
      console.error('Error predicting project completion:', error);
      return null;
    }
  }

  // Identify project risks and bottlenecks
  async identifyRisks(projectId) {
    try {
      const projectData = await this.fetchProjectAnalysisData(String(projectId));
      const risks = [];
      
      if (projectData.project.progress < this.expectedProgress(projectData.project)) {
        risks.push({
          type: 'timeline',
          severity: 'high',
          description: 'Project is behind schedule',
          recommendations: ['Review critical path activities']
        });
      }

      if (projectData.budgetUtilization > 85) {
        risks.push({
          type: 'budget',
          severity: projectData.budgetUtilization > 95 ? 'critical' : 'medium',
          description: 'High budget utilization',
          recommendations: ['Review remaining scope']
        });
      }
      
      const qualityIssues = projectData.alerts.filter(a => a.alertType === 'QUALITY' && a.status === 'ACTIVE');
      if (qualityIssues.length > 0) {
        risks.push({
          type: 'quality',
          severity: 'medium',
          description: `${qualityIssues.length} active quality alerts`,
          recommendations: ['Address quality issues immediately']
        });
      }

      return risks;
      
    } catch (error) {
      console.error('Error identifying risks:', error);
      return [];
    }
  }

  // Generate optimization recommendations
  async generateOptimizationRecommendations(projectId) {
    try {
      const projectData = await this.fetchProjectAnalysisData(String(projectId));
      const recommendations = [];
      const workflowAnalysis = this.analyzeWorkflowEfficiency(projectData);
      if (workflowAnalysis.inefficiencies.length > 0) {
        recommendations.push({
          category: 'workflow',
          title: 'Workflow Optimization Opportunities',
          actions: workflowAnalysis.recommendations,
        });
      }
      return recommendations;
    } catch (error) {
      console.error('Error generating optimization recommendations:', error);
      return [];
    }
  }

  /**
   * NEW FUNCTION: Answers a specific question about a project.
   */
  async answerQuestionAboutProject(projectId, question) {
    try {
        const projectData = await this.fetchProjectAnalysisData(projectId);
        if (!projectData) {
            return "I couldn't find any data for that project.";
        }

        const context = `
            Project Name: ${projectData.project.projectName}
            Status: ${projectData.project.status}
            Progress: ${projectData.project.progress}%
            Start Date: ${projectData.project.startDate}
            End Date: ${projectData.project.endDate}
            Estimate Value: $${projectData.project.estimateValue}
            Active Alerts: ${projectData.alerts.length}
            Recent Activities: ${projectData.activities.map(a => a.description).join(', ')}
        `;

        const prompt = `
You are an expert project assistant. Based ONLY on the following context, answer the user's question.
If the answer is not in the context, say "I don't have that information in the project details."

Context:
${context}

User's Question:
"${question}"

Answer:
`;
        const response = await openAIService.generateSingleResponse(prompt);
        return response.content;

    } catch (error) {
        console.error('Error answering project question:', error);
        return "Sorry, I encountered an error while looking up the project details.";
    }
  }

  // --- Private helper methods (restored from your original file) ---

  async fetchProjectAnalysisData(projectId) {
    const idAsString = String(projectId);
    const project = await prisma.project.findUnique({
      where: { id: idAsString },
      include: {
        projectManager: true,
        customer: true,
        workflow: { include: { phases: { include: { sections: { include: { lineItems: true } } } } } },
        tasks: true,
        alerts: true,
        activities: { orderBy: { createdAt: 'desc' }, take: 50 }
      }
    });

    if (!project) {
        return null;
    }

    return {
      project,
      tasks: project.tasks,
      alerts: project.alerts,
      activities: project.activities,
      budgetUtilization: Math.random() * 100, // Mock for now
      teamEfficiency: 85 + Math.random() * 15
    };
  }

  async fetchPortfolioData(userId) {
    const projects = await prisma.project.findMany({
      where: { isArchived: false },
      include: {
        workflow: true,
        alerts: { where: { status: 'ACTIVE' } }
      }
    });

    return {
      projects,
      totalValue: projects.reduce((sum, p) => sum + (p.estimateValue || 0), 0),
      activeAlerts: projects.reduce((sum, p) => sum + p.alerts.length, 0)
    };
  }

  async generateAIInsights(projectData) {
    if (!openAIService.isAvailable()) {
      return this.generateRuleBasedInsights(projectData);
    }

    try {
      const prompt = `Analyze this construction project data and provide insights:
      
Project: ${projectData.project.projectName}
Progress: ${projectData.project.progress}%
Status: ${projectData.project.status}
Active Alerts: ${projectData.alerts.length}
Team Efficiency: ${projectData.teamEfficiency}%

Provide specific, actionable insights about:
1. Project health and trajectory
2. Potential risks or concerns
3. Optimization opportunities
4. Next recommended actions`;

      const response = await openAIService.generateResponse(prompt, {
        projectName: projectData.project.projectName,
        progress: projectData.project.progress,
        alertCount: projectData.alerts.length
      });

      return {
        aiGenerated: true,
        content: response.content,
        confidence: response.confidence || 0.8
      };
      
    } catch (error) {
      console.error('AI insights generation failed:', error);
      return this.generateRuleBasedInsights(projectData);
    }
  }

  generateRuleBasedInsights(projectData) {
    const insights = [];
    if (projectData.project.progress > 80) {
      insights.push({ type: 'positive', title: 'Project Nearing Completion' });
    }
    if (projectData.alerts.length > 5) {
      insights.push({ type: 'warning', title: 'High Alert Volume' });
    }
    return { aiGenerated: false, insights, confidence: 0.7 };
  }

  calculateCompletionPrediction(project) {
    const currentProgress = project.progress || 0;
    const remainingWork = 100 - currentProgress;
    const averageDailyProgress = currentProgress / this.getProjectDays(project);
    const remainingDays = remainingWork / (averageDailyProgress || 1);
    const predictedDate = new Date();
    predictedDate.setDate(predictedDate.getDate() + remainingDays);
    return { date: predictedDate, confidence: 0.8, factors: [], risks: [], recommendations: [] };
  }

  getProjectDays(project) {
    const start = new Date(project.startDate || project.createdAt);
    const now = new Date();
    return Math.max(1, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
  }

  expectedProgress(project) {
    const totalDays = this.getProjectDays(project);
    const estimatedDuration = 90;
    return Math.min(100, (totalDays / estimatedDuration) * 100);
  }

  getFallbackInsights(projectId) {
    return { insights: [{ type: 'info', title: 'Analysis Unavailable' }], recommendations: [], risks: [] };
  }

  getFallbackPortfolioInsights() {
    return { insights: [], recommendations: [], metrics: {}, trends: [] };
  }

  analyzeWorkflowEfficiency(projectData) {
    return { inefficiencies: [], recommendations: ['Review workflow dependencies'] };
  }

  combineInsights(projectData, aiInsights) {
    return {
      projectId: projectData.project.id,
      projectName: projectData.project.projectName,
      generatedAt: new Date(),
      aiPowered: aiInsights.aiGenerated,
      insights: aiInsights.insights || [aiInsights],
      metrics: {
        progress: projectData.project.progress,
        efficiency: projectData.teamEfficiency,
        alertCount: projectData.alerts.length
      }
    };
  }
}

module.exports = new BubblesInsightsService();
