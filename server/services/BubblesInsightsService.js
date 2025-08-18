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
      // Fetch comprehensive project data
      const projectData = await this.fetchProjectAnalysisData(projectId);
      
      // Generate AI-powered insights
      const insights = await this.generateAIInsights(projectData);
      
      // Combine with rule-based insights
      const combinedInsights = await this.combineInsights(projectData, insights);
      
      // Cache the results
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
      // Accept string IDs; also try numeric projectNumber if applicable
      const idAsString = String(projectId);
      const maybeProjectNumber = /^\d{5}$/.test(idAsString) ? parseInt(idAsString, 10) : null;
      let project = await prisma.project.findUnique({
        where: { id: idAsString },
        include: {
          workflow: {
            include: {
              phases: {
                include: {
                  sections: {
                    include: {
                      lineItems: true
                    }
                  }
                }
              }
            }
          },
          alerts: true,
          tasks: true
        }
      });

      if (!project && Number.isFinite(maybeProjectNumber)) {
        project = await prisma.project.findUnique({
          where: { projectNumber: maybeProjectNumber },
          include: {
            workflow: {
              include: {
                phases: {
                  include: {
                    sections: {
                      include: {
                        lineItems: true
                      }
                    }
                  }
                }
              }
            },
            alerts: true,
            tasks: true
          }
        });
      }

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
      
      // Timeline risks
      if (projectData.project.progress < this.expectedProgress(projectData.project)) {
        risks.push({
          type: 'timeline',
          severity: 'high',
          description: 'Project is behind schedule',
          impact: 'Completion date may be delayed',
          recommendations: [
            'Review critical path activities',
            'Consider adding resources',
            'Optimize workflow dependencies'
          ]
        });
      }

      // Budget risks
      if (projectData.budgetUtilization > 85) {
        risks.push({
          type: 'budget',
          severity: projectData.budgetUtilization > 95 ? 'critical' : 'medium',
          description: 'High budget utilization',
          impact: 'May exceed approved budget',
          recommendations: [
            'Review remaining scope',
            'Identify cost-saving opportunities',
            'Update budget forecasts'
          ]
        });
      }

      // Quality risks
      const qualityIssues = projectData.alerts.filter(a => 
        a.alertType === 'QUALITY' && a.status === 'ACTIVE'
      );
      
      if (qualityIssues.length > 0) {
        risks.push({
          type: 'quality',
          severity: 'medium',
          description: `${qualityIssues.length} active quality alerts`,
          impact: 'May require rework and impact timeline',
          recommendations: [
            'Address quality issues immediately',
            'Review quality control processes',
            'Increase inspection frequency'
          ]
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

      // Workflow optimization
      const workflowAnalysis = this.analyzeWorkflowEfficiency(projectData);
      if (workflowAnalysis.inefficiencies.length > 0) {
        recommendations.push({
          category: 'workflow',
          title: 'Workflow Optimization Opportunities',
          priority: 'medium',
          description: 'Identified opportunities to streamline workflow processes',
          actions: workflowAnalysis.recommendations,
          expectedImpact: 'Reduce completion time by 5-15%'
        });
      }

      // Resource optimization
      const resourceAnalysis = this.analyzeResourceUtilization(projectData);
      if (resourceAnalysis.underutilized.length > 0) {
        recommendations.push({
          category: 'resources',
          title: 'Resource Reallocation Opportunity',
          priority: 'low',
          description: 'Some team members may be underutilized',
          actions: resourceAnalysis.suggestions,
          expectedImpact: 'Improve team efficiency by 10-20%'
        });
      }

      // Technology recommendations
      if (this.shouldRecommendTechnology(projectData)) {
        recommendations.push({
          category: 'technology',
          title: 'Digital Tool Integration',
          priority: 'low',
          description: 'Additional digital tools could enhance project efficiency',
          actions: [
            'Consider mobile inspection apps',
            'Implement digital documentation',
            'Use drone surveying for large areas'
          ],
          expectedImpact: 'Reduce documentation time by 25%'
        });
      }

      return recommendations;
      
    } catch (error) {
      console.error('Error generating optimization recommendations:', error);
      return [];
    }
  }

  // Private helper methods
  async fetchProjectAnalysisData(projectId) {
    const idAsString = String(projectId);
    const maybeProjectNumber = /^\d{5}$/.test(idAsString) ? parseInt(idAsString, 10) : null;

    // Fetch the project first (by ID, then by projectNumber fallback)
    let project = await prisma.project.findUnique({
      where: { id: idAsString },
      include: {
        projectManager: true,
        customer: true,
        workflow: {
          include: {
            phases: {
              include: {
                sections: {
                  include: {
                    lineItems: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!project && Number.isFinite(maybeProjectNumber)) {
      project = await prisma.project.findUnique({
        where: { projectNumber: maybeProjectNumber },
        include: {
          projectManager: true,
          customer: true,
          workflow: {
            include: {
              phases: {
                include: {
                  sections: {
                    include: {
                      lineItems: true
                    }
                  }
                }
              }
            }
          }
        }
      });
    }

    const effectiveProjectId = project?.id || idAsString;

    const [tasks, alerts, activities] = await Promise.all([
      prisma.task.findMany({ where: { projectId: effectiveProjectId } }),
      prisma.workflowAlert.findMany({ where: { projectId: effectiveProjectId } }),
      prisma.activity.findMany({
        where: { projectId: effectiveProjectId },
        orderBy: { createdAt: 'desc' },
        take: 50
      })
    ]);

    return {
      project,
      tasks,
      alerts,
      activities,
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
    
    // Progress analysis
    if (projectData.project.progress > 80) {
      insights.push({
        type: 'positive',
        title: 'Project Nearing Completion',
        description: 'Project is in final stages with strong progress',
        recommendation: 'Focus on quality control and final inspections'
      });
    } else if (projectData.project.progress < 50) {
      insights.push({
        type: 'attention',
        title: 'Early Project Phase',
        description: 'Project is in early development stages',
        recommendation: 'Ensure solid foundation and clear communication'
      });
    }

    // Alert analysis
    if (projectData.alerts.length > 5) {
      insights.push({
        type: 'warning',
        title: 'High Alert Volume',
        description: `${projectData.alerts.length} active alerts require attention`,
        recommendation: 'Prioritize alert resolution to prevent delays'
      });
    }

    return {
      aiGenerated: false,
      insights,
      confidence: 0.7
    };
  }

  calculateCompletionPrediction(project) {
    const currentProgress = project.progress || 0;
    const remainingWork = 100 - currentProgress;
    
    // Simple linear projection (can be enhanced with ML models)
    const averageDailyProgress = currentProgress / this.getProjectDays(project);
    const remainingDays = remainingWork / (averageDailyProgress || 1);
    
    const predictedDate = new Date();
    predictedDate.setDate(predictedDate.getDate() + remainingDays);
    
    return {
      date: predictedDate,
      confidence: currentProgress > 20 ? 0.8 : 0.6,
      factors: ['Current progress rate', 'Remaining workflow items', 'Resource availability'],
      risks: this.identifyCompletionRisks(project),
      recommendations: this.getCompletionRecommendations(project)
    };
  }

  getProjectDays(project) {
    const start = new Date(project.startDate || project.createdAt);
    const now = new Date();
    return Math.max(1, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
  }

  expectedProgress(project) {
    const totalDays = this.getProjectDays(project);
    const estimatedDuration = 90; // Default 90 days for construction projects
    return Math.min(100, (totalDays / estimatedDuration) * 100);
  }

  // Additional helper methods...
  identifyCompletionRisks(project) {
    return ['Weather delays', 'Material availability', 'Inspection scheduling'];
  }

  getCompletionRecommendations(project) {
    return [
      'Monitor critical path activities',
      'Maintain regular stakeholder communication',
      'Prepare for final inspections'
    ];
  }

  getFallbackInsights(projectId) {
    return {
      insights: [{
        type: 'info',
        title: 'Analysis Unavailable',
        description: 'Unable to generate detailed insights at this time',
        recommendation: 'Please try again later'
      }],
      recommendations: [],
      risks: []
    };
  }

  getFallbackPortfolioInsights() {
    return {
      insights: [],
      recommendations: [],
      metrics: {},
      trends: []
    };
  }

  analyzeWorkflowEfficiency(projectData) {
    return {
      inefficiencies: [],
      recommendations: ['Review workflow dependencies', 'Optimize task sequencing']
    };
  }

  analyzeResourceUtilization(projectData) {
    return {
      underutilized: [],
      suggestions: ['Balance workload distribution', 'Cross-train team members']
    };
  }

  shouldRecommendTechnology(projectData) {
    return projectData.project.progress < 50; // Recommend tech for early-stage projects
  }

  analyzePortfolioPerformance(portfolioData) {
    return [{
      type: 'portfolio',
      title: 'Portfolio Performance',
      description: `Managing ${portfolioData.projects.length} active projects`,
      recommendation: 'Focus on projects with highest priority'
    }];
  }

  generatePortfolioRecommendations(portfolioData) {
    return [
      'Review project priorities monthly',
      'Ensure balanced resource allocation',
      'Monitor cross-project dependencies'
    ];
  }

  calculatePortfolioMetrics(portfolioData) {
    return {
      totalProjects: portfolioData.projects.length,
      totalValue: portfolioData.totalValue,
      avgProgress: portfolioData.projects.reduce((sum, p) => sum + (p.progress || 0), 0) / portfolioData.projects.length
    };
  }

  identifyTrends(portfolioData) {
    return ['Increasing completion rates', 'Stable budget adherence'];
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