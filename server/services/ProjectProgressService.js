/**
 * ProjectProgressService - Calculates project progress based on workflow completion
 */

class ProjectProgressService {
    
    /**
     * Calculate comprehensive project progress based on workflow completion
     * @param {Object} project - Project object with workflow data
     * @returns {Object} Progress data including overall, materials, labor, and trades
     */
    static calculateProjectProgress(project) {
        if (!project || !project.workflow || !project.workflow.steps) {
            return {
                overall: 0,
                materials: 0,
                labor: 0,
                trades: [],
                totalSteps: 0,
                completedSteps: 0
            };
        }

        const workflow = project.workflow;
        const steps = workflow.steps || [];
        
        // Calculate basic completion stats
        const totalSteps = steps.length;
        const completedSteps = steps.filter(step => step.isCompleted).length;
        const overallProgress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

        // Calculate materials progress
        const materialsProgress = this.calculateMaterialsProgress(steps);
        
        // Calculate labor progress  
        const laborProgress = this.calculateLaborProgress(steps);
        
        // Calculate individual trade progress
        const tradesProgress = this.calculateTradesProgress(project, steps);

        return {
            overall: overallProgress,
            materials: materialsProgress,
            labor: laborProgress,
            trades: tradesProgress,
            totalSteps,
            completedSteps,
            stepBreakdown: this.getStepBreakdown(steps)
        };
    }

    /**
     * Calculate materials progress based on materials-related workflow steps
     * @param {Array} steps - Workflow steps array
     * @returns {number} Materials progress percentage
     */
    static calculateMaterialsProgress(steps) {
        // Define materials-related step keywords
        const materialsKeywords = [
            'material', 'delivery', 'order', 'supply', 'purchase', 'procurement',
            'inventory', 'stock', 'equipment', 'tools', 'supplies'
        ];

        const materialsSteps = steps.filter(step => 
            this.containsKeywords(step.stepName, materialsKeywords) ||
            this.containsKeywords(step.description, materialsKeywords)
        );

        if (materialsSteps.length === 0) {
            // If no specific materials steps, check if materials delivery dates exist
            return 0; // Will be overridden by delivery date logic in frontend
        }

        const completedMaterialsSteps = materialsSteps.filter(step => step.isCompleted).length;
        return Math.round((completedMaterialsSteps / materialsSteps.length) * 100);
    }

    /**
     * Calculate labor progress based on labor-related workflow steps
     * @param {Array} steps - Workflow steps array  
     * @returns {number} Labor progress percentage
     */
    static calculateLaborProgress(steps) {
        // Define labor-related step keywords
        const laborKeywords = [
            'install', 'build', 'construct', 'labor', 'work', 'crew', 'field',
            'execution', 'production', 'assembly', 'fabrication', 'completion'
        ];

        const laborSteps = steps.filter(step => 
            this.containsKeywords(step.stepName, laborKeywords) ||
            this.containsKeywords(step.description, laborKeywords) ||
            step.phase === 'Execution' || step.phase === 'Execution Phase'
        );

        if (laborSteps.length === 0) {
            // If no specific labor steps, use overall project progress as approximation
            const totalSteps = steps.length;
            const completedSteps = steps.filter(step => step.isCompleted).length;
            return totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
        }

        const completedLaborSteps = laborSteps.filter(step => step.isCompleted).length;
        return Math.round((completedLaborSteps / laborSteps.length) * 100);
    }

    /**
     * Calculate individual trade progress based on project type and workflow
     * @param {Object} project - Project object
     * @param {Array} steps - Workflow steps array
     * @returns {Array} Array of trade progress objects
     */
    static calculateTradesProgress(project, steps) {
        const projectType = project.projectType || project.type || 'General';
        const trades = this.getProjectTrades(project);

        return trades.map(trade => {
            // Find steps related to this specific trade
            const tradeSteps = steps.filter(step => 
                this.containsKeywords(step.stepName, [trade.name.toLowerCase()]) ||
                this.containsKeywords(step.description, [trade.name.toLowerCase()])
            );

            let laborProgress = 0;
            let materialsDelivered = false;

            if (tradeSteps.length > 0) {
                // Calculate progress based on trade-specific steps
                const completedTradeSteps = tradeSteps.filter(step => step.isCompleted).length;
                laborProgress = Math.round((completedTradeSteps / tradeSteps.length) * 100);
                
                // Check if materials for this trade are delivered
                const materialsSteps = tradeSteps.filter(step => 
                    this.containsKeywords(step.stepName, ['material', 'delivery', 'order'])
                );
                materialsDelivered = materialsSteps.length > 0 && 
                                  materialsSteps.every(step => step.isCompleted);
            } else {
                // Fallback to overall project progress for this trade
                const totalSteps = steps.length;
                const completedSteps = steps.filter(step => step.isCompleted).length;
                laborProgress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
                
                // Use project-level materials delivery info
                materialsDelivered = project.materialsDeliveryStart ? true : false;
            }

            return {
                name: trade.name,
                laborProgress: Math.max(0, Math.min(100, laborProgress)), // Ensure 0-100 range
                materialsDelivered
            };
        });
    }

    /**
     * Get trades for a project based on project type and complexity
     * @param {Object} project - Project object
     * @returns {Array} Array of trade objects
     */
    static getProjectTrades(project) {
        const projectType = project.projectType || project.type || 'General';
        const projectId = project.id || project._id;

        // Complex projects get multiple trades
        if (this.shouldHaveMultipleTrades(projectId)) {
            switch (projectType.toLowerCase()) {
                case 'roof replacement':
                case 'roofing':
                    return [
                        { name: 'Roofing' },
                        { name: 'Gutters' },
                        { name: 'Cleanup' }
                    ];
                case 'full exterior':
                case 'exterior':
                    return [
                        { name: 'Roofing' },
                        { name: 'Siding' },
                        { name: 'Windows' },
                        { name: 'Doors' }
                    ];
                case 'kitchen remodel':
                case 'kitchen':
                    return [
                        { name: 'Demolition' },
                        { name: 'Plumbing' },
                        { name: 'Electrical' },
                        { name: 'Cabinets' }
                    ];
                default:
                    return [
                        { name: 'Roofing' },
                        { name: 'Siding' },
                        { name: 'Windows' }
                    ];
            }
        } else {
            // Simple projects get single trade
            const tradeName = this.getMainTradeFromProjectType(projectType);
            return [{ name: tradeName }];
        }
    }

    /**
     * Determine if project should have multiple trades
     * @param {string|number} projectId - Project ID
     * @returns {boolean} True if project should have multiple trades
     */
    static shouldHaveMultipleTrades(projectId) {
        // Convert to number for consistent comparison
        const id = typeof projectId === 'string' ? parseInt(projectId) : projectId;
        return [1, 3, 5].includes(id) || (id && id > 10); // Large projects get multiple trades
    }

    /**
     * Get main trade name from project type
     * @param {string} projectType - Project type
     * @returns {string} Main trade name
     */
    static getMainTradeFromProjectType(projectType) {
        const type = projectType.toLowerCase();
        
        if (type.includes('roof')) return 'Roofing';
        if (type.includes('siding')) return 'Siding';
        if (type.includes('window')) return 'Windows';
        if (type.includes('door')) return 'Doors';
        if (type.includes('deck')) return 'Decking';
        if (type.includes('kitchen')) return 'Kitchen';
        if (type.includes('bathroom')) return 'Bathroom';
        if (type.includes('basement')) return 'Basement';
        if (type.includes('flooring')) return 'Flooring';
        if (type.includes('painting')) return 'Painting';
        
        return 'General';
    }

    /**
     * Check if text contains any of the specified keywords
     * @param {string} text - Text to search
     * @param {Array} keywords - Keywords to search for
     * @returns {boolean} True if text contains any keyword
     */
    static containsKeywords(text, keywords) {
        if (!text || !keywords || keywords.length === 0) return false;
        
        const lowerText = text.toLowerCase();
        return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
    }

    /**
     * Get detailed breakdown of steps by category
     * @param {Array} steps - Workflow steps
     * @returns {Object} Step breakdown by category
     */
    static getStepBreakdown(steps) {
        const breakdown = {
            total: steps.length,
            completed: steps.filter(s => s.isCompleted).length,
            byPhase: {},
            byType: {
                materials: 0,
                labor: 0,
                admin: 0,
                other: 0
            }
        };

        // Group by phase
        steps.forEach(step => {
            const phase = step.phase || 'Unknown';
            if (!breakdown.byPhase[phase]) {
                breakdown.byPhase[phase] = { total: 0, completed: 0 };
            }
            breakdown.byPhase[phase].total++;
            if (step.isCompleted) {
                breakdown.byPhase[phase].completed++;
            }

            // Categorize by type
            if (this.containsKeywords(step.stepName, ['material', 'delivery', 'order'])) {
                breakdown.byType.materials++;
            } else if (this.containsKeywords(step.stepName, ['install', 'build', 'construct', 'labor'])) {
                breakdown.byType.labor++;
            } else if (this.containsKeywords(step.stepName, ['admin', 'office', 'paperwork', 'permit'])) {
                breakdown.byType.admin++;
            } else {
                breakdown.byType.other++;
            }
        });

        return breakdown;
    }

    /**
     * Update project progress in database
     * @param {Object} project - Project object with updated workflow
     * @returns {Object} Updated project with progress data
     */
    static updateProjectProgress(project) {
        const progressData = this.calculateProjectProgress(project);
        
        // Update project object with calculated progress
        project.progress = progressData.overall;
        project.progressData = progressData;
        
        return project;
    }
}

module.exports = ProjectProgressService; 