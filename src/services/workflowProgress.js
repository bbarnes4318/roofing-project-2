/**
 * Frontend Workflow Progress Service - UPDATED FOR NEW SYSTEM
 * Uses ProjectWorkflowTracker and currentWorkflowItem for consistency
 */

// Phase definitions with weights
const PHASES = {
  LEAD: { name: "Lead", weight: 10 },
  PROSPECT: { name: "Prospect", weight: 15 },
  APPROVED: { name: "Approved", weight: 15 },
  EXECUTION: { name: "Execution", weight: 40 },
  SECOND_SUPPLEMENT: { name: "2nd Supplement", weight: 10 },
  COMPLETION: { name: "Completion", weight: 10 }
};

class WorkflowProgressService {
    
    /**
     * Calculate project completion percentage using completed line items
     * Includes logic to mark skipped items as completed if project has advanced beyond them
     * @param {Object} project - Project object with currentWorkflowItem containing completedItems
     * @returns {Object} Progress data with overall percentage and breakdown
     */
    static calculateProjectProgress(project) {
        if (!project) {
            return this.getDefaultProgressData();
        }

        // Use currentWorkflowItem for accurate progress calculation
        const currentWorkflow = project.currentWorkflowItem;
        
        if (!currentWorkflow) {
            return this.getDefaultProgressData();
        }

        // STRICT CALCULATION: overall = completed / total (no synthetic/skipped items)
        const totalLineItems = Number(currentWorkflow.totalLineItems) || this.estimateTotalLineItems();
        const completedLineItems = Array.isArray(currentWorkflow.completedItems)
            ? currentWorkflow.completedItems.length
            : 0;

        const overall = totalLineItems > 0 
            ? Math.round((completedLineItems / totalLineItems) * 100)
            : 0;

        // If workflow is complete, force 100%
        if (currentWorkflow.isComplete) {
            return {
                overall: 100,
                phaseBreakdown: this.getCompletedPhaseBreakdown(),
                currentPhase: 'COMPLETION',
                currentPhaseDisplay: 'Completion',
                currentSection: null,
                currentLineItem: null,
                totalPhases: Object.keys(PHASES).length,
                completedPhases: Object.keys(PHASES).length,
                hasPhaseOverride: false,
                completedLineItems,
                totalLineItems
            };
        }

        const currentPhase = currentWorkflow.phase || 'LEAD';
        const phaseKeys = Object.keys(PHASES);
        const currentPhaseIndex = phaseKeys.indexOf(currentPhase);

        return {
            overall,
            // Keep breakdown minimal without structure; rely on simple counts
            phaseBreakdown: {},
            currentPhase: currentPhase,
            currentPhaseDisplay: currentWorkflow.phaseDisplay || this.formatPhase(currentPhase),
            currentSection: currentWorkflow.section,
            currentLineItem: currentWorkflow.lineItem,
            totalPhases: phaseKeys.length,
            completedPhases: Math.max(0, currentPhaseIndex),
            hasPhaseOverride: false,
            completedLineItems,
            totalLineItems,
            skippedItemsCount: 0
        };
    }

    /**
     * Calculate progress accounting for skipped workflow items
     * If project is in a later phase/section/line item, mark all previous items as completed
     */
    static calculateProgressWithSkippedItems(completedItems, currentPhase, currentSection, currentLineItem, totalLineItems, workflowStructure) {
        const phaseKeys = Object.keys(PHASES);
        const currentPhaseIndex = phaseKeys.indexOf(currentPhase);
        
        // Start with explicitly completed items
        let adjustedCompletedItems = [...completedItems];
        let skippedItemsCount = 0;
        
        // If we have workflow structure, use it to determine skipped items
        if (workflowStructure && currentPhaseIndex > 0) {
            // Mark all items in previous phases as completed (they were skipped)
            for (let phaseIdx = 0; phaseIdx < currentPhaseIndex; phaseIdx++) {
                const phaseKey = phaseKeys[phaseIdx];
                const phaseData = workflowStructure[phaseKey];
                if (phaseData && phaseData.sections) {
                    const sectionValues = Object.values(phaseData.sections);
                    for (let s = 0; s < sectionValues.length; s++) {
                        const section = sectionValues[s];
                        if (section.lineItems) {
                            const liValues = Object.values(section.lineItems);
                            for (let l = 0; l < liValues.length; l++) {
                                const lineItem = liValues[l];
                                const isAlreadyCompleted = adjustedCompletedItems.some(item => 
                                    item.lineItemId === lineItem.id || 
                                    item.id === lineItem.id
                                );
                                if (!isAlreadyCompleted) {
                                    adjustedCompletedItems.push({
                                        id: lineItem.id,
                                        lineItemId: lineItem.id,
                                        phaseId: phaseKey,
                                        sectionId: section.id,
                                        name: lineItem.name,
                                        isSkipped: true,
                                        completedAt: new Date().toISOString()
                                    });
                                    skippedItemsCount++;
                                }
                            }
                        }
                    }
                }
            }
            // In current phase, mark items in previous sections as completed
            if (currentSection && workflowStructure[currentPhase]) {
                const currentPhaseData = workflowStructure[currentPhase];
                const sections = Object.values(currentPhaseData.sections || {});
                const currentSectionIndex = sections.findIndex(section => 
                    section.name === currentSection || section.id === currentSection
                );
                if (currentSectionIndex > 0) {
                    for (let secIdx = 0; secIdx < currentSectionIndex; secIdx++) {
                        const section = sections[secIdx];
                        if (section.lineItems) {
                            const liValues = Object.values(section.lineItems);
                            for (let l = 0; l < liValues.length; l++) {
                                const lineItem = liValues[l];
                                const isAlreadyCompleted = adjustedCompletedItems.some(item => 
                                    item.lineItemId === lineItem.id || 
                                    item.id === lineItem.id
                                );
                                if (!isAlreadyCompleted) {
                                    adjustedCompletedItems.push({
                                        id: lineItem.id,
                                        lineItemId: lineItem.id,
                                        phaseId: currentPhase,
                                        sectionId: section.id,
                                        name: lineItem.name,
                                        isSkipped: true,
                                        completedAt: new Date().toISOString()
                                    });
                                    skippedItemsCount++;
                                }
                            }
                        }
                    }
                }
                // In current section, mark items before current line item as completed
                if (currentLineItem && currentSectionIndex >= 0) {
                    const currentSectionData = sections[currentSectionIndex];
                    if (currentSectionData && currentSectionData.lineItems) {
                        const lineItems = Object.values(currentSectionData.lineItems);
                        const currentLineItemIndex = lineItems.findIndex(item => 
                            item.name === currentLineItem || item.id === currentLineItem
                        );
                        if (currentLineItemIndex > 0) {
                            for (let itemIdx = 0; itemIdx < currentLineItemIndex; itemIdx++) {
                                const lineItem = lineItems[itemIdx];
                                const isAlreadyCompleted = adjustedCompletedItems.some(item => 
                                    item.lineItemId === lineItem.id || 
                                    item.id === lineItem.id
                                );
                                if (!isAlreadyCompleted) {
                                    adjustedCompletedItems.push({
                                        id: lineItem.id,
                                        lineItemId: lineItem.id,
                                        phaseId: currentPhase,
                                        sectionId: currentSectionData.id,
                                        name: lineItem.name,
                                        isSkipped: true,
                                        completedAt: new Date().toISOString()
                                    });
                                    skippedItemsCount++;
                                }
                            }
                        }
                    }
                }
            }
        } else {
            // No structure: do NOT synthesize skipped items. Use actual completed items only.
        }
        
        // Calculate overall progress
        const overallProgress = totalLineItems > 0 
            ? Math.round((adjustedCompletedItems.length / totalLineItems) * 100)
            : 0;
        
        return {
            overallProgress,
            adjustedCompletedItems,
            totalLineItems,
            skippedItemsCount
        };
    }

    /**
     * Estimate total line items (fallback when not provided)
     */
    static estimateTotalLineItems() {
        // Conservative estimate: roughly 20-30 line items per typical roofing workflow
        return 25;
    }

    /**
     * Calculate phase breakdown based on actual completed line items
     * Uses real line item counts per phase, not estimates
     */
    static calculatePhaseBreakdownFromLineItems(completedItems, currentPhase, currentPhaseIndex, workflowStructure) {
        const breakdown = {};
        const phaseKeys = Object.keys(PHASES);
        
        // Group completed items by phase
        const completedByPhase = {};
        const totalItemsByPhase = {};
        
        // Count completed items by phase
        completedItems.forEach(item => {
            if (item.phaseId) {
                completedByPhase[item.phaseId] = (completedByPhase[item.phaseId] || 0) + 1;
            }
        });
        
        // If we have workflow structure, get actual totals per phase
        if (workflowStructure) {
            phaseKeys.forEach(phaseKey => {
                let phaseTotal = 0;
                const phaseData = workflowStructure[phaseKey];
                
                if (phaseData && phaseData.sections) {
                    Object.values(phaseData.sections).forEach(section => {
                        if (section.lineItems) {
                            phaseTotal += Object.keys(section.lineItems).length;
                        }
                    });
                }
                
                totalItemsByPhase[phaseKey] = phaseTotal;
            });
        } else {
            // Fallback: distribute total items evenly across phases
            const estimatedItemsPerPhase = Math.ceil(this.estimateTotalLineItems() / phaseKeys.length);
            phaseKeys.forEach(phaseKey => {
                totalItemsByPhase[phaseKey] = estimatedItemsPerPhase;
            });
        }
        
        phaseKeys.forEach((phaseKey, index) => {
            const completedCount = completedByPhase[phaseKey] || 0;
            const totalCount = totalItemsByPhase[phaseKey] || 1;
            
            let progress = 0;
            
            if (index < currentPhaseIndex) {
                // Previous phases are considered 100% complete
                progress = 100;
            } else if (index === currentPhaseIndex) {
                // Current phase: calculate based on actual completed/total ratio
                progress = Math.min(Math.round((completedCount / totalCount) * 100), 100);
            }
            // Future phases remain at 0
            
            breakdown[phaseKey] = {
                name: PHASES[phaseKey].name,
                progress: progress,
                weight: PHASES[phaseKey].weight,
                isCompleted: progress === 100,
                isCurrent: index === currentPhaseIndex,
                isPending: index > currentPhaseIndex,
                completedItems: completedCount,
                totalItems: totalCount
            };
        });
        
        return breakdown;
    }

    /**
     * Calculate phase breakdown for progress display (legacy method)
     */
    static calculatePhaseBreakdown(currentPhase, currentPhaseIndex) {
        const breakdown = {};
        const phaseKeys = Object.keys(PHASES);
        
        phaseKeys.forEach((phaseKey, index) => {
            let progress = 0;
            if (index < currentPhaseIndex) {
                progress = 100; // Completed phases
            } else if (index === currentPhaseIndex) {
                progress = 50; // Current phase (partially complete)
            }
            // Future phases remain at 0
            
            breakdown[phaseKey] = {
                name: PHASES[phaseKey].name,
                progress: progress,
                weight: PHASES[phaseKey].weight,
                isCompleted: progress === 100,
                isCurrent: index === currentPhaseIndex,
                isPending: index > currentPhaseIndex
            };
        });
        
        return breakdown;
    }

    /**
     * Get completed phase breakdown (for 100% projects)
     */
    static getCompletedPhaseBreakdown() {
        const breakdown = {};
        Object.keys(PHASES).forEach(phaseKey => {
            breakdown[phaseKey] = {
                name: PHASES[phaseKey].name,
                progress: 100,
                weight: PHASES[phaseKey].weight,
                isCompleted: true,
                isCurrent: false,
                isPending: false
            };
        });
        return breakdown;
    }

    /**
     * Get default progress data for projects without workflow
     */
    static getDefaultProgressData() {
        return {
            overall: 0,
            phaseBreakdown: {},
            currentPhase: 'LEAD',
            currentPhaseDisplay: 'Lead',
            currentSection: 'Not Started',
            currentLineItem: 'No active task',
            totalPhases: Object.keys(PHASES).length,
            completedPhases: 0,
            hasPhaseOverride: false
        };
    }

    /**
     * Format phase name for display
     */
    static formatPhase(phase) {
        if (!phase) return 'Lead';
        return phase.charAt(0).toUpperCase() + phase.slice(1).toLowerCase().replace('_', ' ');
    }

    /**
     * Get phase color for UI display
     */
    static getPhaseColor(phase) {
        const normalizedPhase = this.normalizePhase(phase);
        const colors = {
            LEAD: '#EAB308',           // Yellow
            PROSPECT: '#F97316',       // Orange
            APPROVED: '#10B981',       // Emerald Green (stays the same)
            EXECUTION: '#D946EF',      // Fuchsia
            SECOND_SUPPLEMENT: '#8B5CF6', // Vivid Violet (stays the same)
            COMPLETION: '#0EA5E9'      // Bright Cyan-Teal (stays the same)
        };
        return colors[normalizedPhase] || '#EAB308';
    }

    /**
     * Get phase initials
     * @param {string} phase - Phase key
     * @returns {string} Phase initials
     */
    static getPhaseInitials(phase) {
        const normalizedPhase = this.normalizePhase(phase);
        const initials = {
            LEAD: 'L',
            PROSPECT: 'P',
            APPROVED: 'A',
            EXECUTION: 'E',
            SECOND_SUPPLEMENT: 'S',
            COMPLETION: 'C'
        };
        return initials[normalizedPhase] || 'L';
    }

    /**
     * Determine text color for optimal contrast on background
     * @param {string} backgroundColor - Hex color (e.g., '#6B7280')
     * @returns {string} 'white' or 'black' for best contrast
     */
    static getContrastTextColor(backgroundColor) {
        // Remove # if present
        const hex = backgroundColor.replace('#', '').toUpperCase();
        
        // Yellow (Lead) and Orange (Prospect) need dark text for better contrast
        if (hex === 'EAB308' || hex === 'F97316') {
            return '#111827';
        }
        
        // All other phases use white text
        return 'white';
    }

    /**
     * Get complete phase button props for UI components
     * @param {string} phase - Phase key or display name
     * @returns {Object} Phase properties with initials, colors, and display name
     */
    static getPhaseButtonProps(phase) {
        const normalizedPhase = this.normalizePhase(phase);
        const phaseName = this.getPhaseName(normalizedPhase);
        const phaseColor = this.getPhaseColor(normalizedPhase);
        const initials = this.getPhaseInitials(normalizedPhase);
        let textColor = this.getContrastTextColor(phaseColor);
        
        // Convert hex colors to Tailwind background classes
        const colorToBg = {
            '#EAB308': 'bg-yellow-500',    // Lead - Yellow
            '#F97316': 'bg-orange-600',    // Prospect - Orange (correct shade for #F97316)
            '#10B981': 'bg-emerald-500',   // Approved - Emerald Green (stays the same)
            '#D946EF': 'bg-fuchsia-500',   // Execution - Fuchsia
            '#8B5CF6': 'bg-violet-500',    // Second Supplement - Vivid Violet (stays the same)
            '#0EA5E9': 'bg-sky-500'        // Completion - Bright Cyan-Teal (stays the same)
        };
        
        // Custom text colors for optimal contrast based on Lᶜ values
        const tailwindTextColor = (() => {
            switch (normalizedPhase) {
                case 'LEAD': return 'text-black';        // #000000 (black) — Lᶜ = +70.23
                case 'PROSPECT': return 'text-white';    // #FFFFFF (white) — Lᶜ = −61.11
                case 'APPROVED': return 'text-black';   // #000000 (black) — Lᶜ = +57.60
                case 'EXECUTION': return 'text-white';  // #FFFFFF (white) — Lᶜ = −69.12
                case 'SECOND_SUPPLEMENT': return 'text-white'; // #FFFFFF (white) — Lᶜ = −76.91
                case 'COMPLETION': return 'text-white'; // #FFFFFF (white) — Lᶜ = −60.77
                default: return 'text-black';
            }
        })();
        
        return {
            initials,
            bgColor: colorToBg[phaseColor] || 'bg-yellow-500',
            textColor: tailwindTextColor,
            fullName: phaseName,
            hexColor: phaseColor,
            phase: normalizedPhase,
            contrastTextColor: textColor
        };
    }

    /**
     * Get next phase in sequence
     */
    static getNextPhase(currentPhase) {
        const phaseKeys = Object.keys(PHASES);
        const currentIndex = phaseKeys.indexOf(currentPhase);
        
        if (currentIndex >= 0 && currentIndex < phaseKeys.length - 1) {
            return phaseKeys[currentIndex + 1];
        }
        
        return null; // No next phase (workflow complete)
    }

    /**
     * Check if project is in final phase
     */
    static isInFinalPhase(phase) {
        const phaseKeys = Object.keys(PHASES);
        return phase === phaseKeys[phaseKeys.length - 1];
    }

    /**
     * Get workflow status summary
     */
    static getWorkflowStatus(project) {
        if (!project || !project.currentWorkflowItem) {
            return {
                status: 'Not Started',
                phase: 'LEAD',
                progress: 0,
                isComplete: false
            };
        }

        const currentWorkflow = project.currentWorkflowItem;
        
        if (currentWorkflow.isComplete) {
            return {
                status: 'Complete',
                phase: 'COMPLETION',
                progress: 100,
                isComplete: true
            };
        }

        const progressData = this.calculateProjectProgress(project);
        
        return {
            status: 'In Progress',
            phase: currentWorkflow.phase || 'LEAD',
            progress: progressData.overall,
            isComplete: false,
            currentSection: currentWorkflow.section,
            currentTask: currentWorkflow.lineItem
        };
    }

    /**
     * Get all available project phases
     * @returns {Array} Array of phase objects with keys and display names
     */
    static getAllPhases() {
        return Object.keys(PHASES).map(phaseKey => ({
            id: phaseKey,
            key: phaseKey,
            name: PHASES[phaseKey].name,
            weight: PHASES[phaseKey].weight,
            color: this.getPhaseColor(phaseKey),
            initial: this.getPhaseInitials(phaseKey)
        }));
    }

    /**
     * Get the current phase for a project
     * @param {Object} project - Project object with phase information
     * @returns {string} Current phase key (e.g. 'LEAD', 'EXECUTION', etc.)
     */
    static getProjectPhase(project) {
        if (!project) return 'LEAD';

        // Use currentWorkflowItem if available (new system)
        if (project.currentWorkflowItem && project.currentWorkflowItem.phase) {
            return project.currentWorkflowItem.phase;
        }

        // Fallback to project.phase if available
        if (project.phase) {
            return project.phase;
        }

        // Default fallback
        return 'LEAD';
    }

    /**
     * Get the display name for a phase
     * @param {string} phaseKey - Phase key (e.g. 'LEAD', 'EXECUTION')
     * @returns {string} Display name (e.g. 'Lead', 'Execution')
     */
    static getPhaseName(phaseKey) {
        if (!phaseKey) return 'Lead';
        const normalizedKey = this.normalizePhase(phaseKey);
        return PHASES[normalizedKey]?.name || this.formatPhase(phaseKey);
    }

    /**
     * Normalize phase key to standard format
     * @param {string} phase - Raw phase string
     * @returns {string} Normalized phase key
     */
    static normalizePhase(phase) {
        if (!phase) return 'LEAD';
        
        const normalized = phase.toUpperCase()
            .replace(/\s*PHASE$/i, '')
            .replace('PHASE-', '')
            .replace('PHASE', '')
            .replace(/-INSURANCE-1ST SUPPLEMENT/i, '')
            .replace('2ND SUPPLEMENT', 'SECOND_SUPPLEMENT')
            .replace('2ND SUPP', 'SECOND_SUPPLEMENT')
            .replace('EXECUTE', 'EXECUTION')
            .trim();
            
        // Map common variations
        const phaseMap = {
            'LEAD': 'LEAD',
            'PROSPECT': 'PROSPECT',
            'APPROVED': 'APPROVED',
            'EXECUTION': 'EXECUTION',
            'EXECUTE': 'EXECUTION',
            'SECOND_SUPPLEMENT': 'SECOND_SUPPLEMENT',
            '2ND_SUPPLEMENT': 'SECOND_SUPPLEMENT',
            'SUPPLEMENT': 'SECOND_SUPPLEMENT',
            'COMPLETION': 'COMPLETION',
            'COMPLETE': 'COMPLETION'
        };
        
        return phaseMap[normalized] || 'LEAD';
    }

    /**
     * Notify listeners of phase changes
     * @param {Object} project - Updated project
     * @param {string} oldPhase - Previous phase
     * @param {string} newPhase - New phase
     */
    static notifyPhaseChange(project, oldPhase, newPhase) {
        if (oldPhase !== newPhase) {
            console.log(`🔄 Phase change for project ${project.projectNumber}: ${oldPhase} → ${newPhase}`);
            
            // Emit custom event for phase change
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('workflowPhaseChange', {
                    detail: { project, oldPhase, newPhase }
                }));
            }
        }
    }

    /**
     * Calculate trade/labor breakdown based on multiple workflow trackers
     * NEW: Now supports actual multiple workflows instead of simulated trades
     * Each workflow tracker represents a real trade with its own line items
     */
    static calculateTradeBreakdown(project, completedItems, totalLineItems, workflowStructure) {
        if (!project) return [];
        
        // Check if project has multiple workflow trackers (real multiple workflows)
        if (project.workflowTrackers && project.workflowTrackers.length > 0) {
            return this.calculateRealMultipleWorkflowBreakdown(project.workflowTrackers);
        }
        
        // Fallback to legacy method for backward compatibility
        if (project.currentWorkflowItem) {
            // Single workflow: use existing logic
            const overallProgress = totalLineItems > 0 
                ? Math.round((completedItems.length / totalLineItems) * 100)
                : 0;
                
            return [{
                name: project.projectType || project.type || 'Roofing',
                laborProgress: overallProgress,
                materialsDelivered: this.estimateMaterialsDelivered(project, overallProgress),
                completedItems: completedItems.length,
                totalItems: totalLineItems,
                isMainTrade: true
            }];
        }
        
        // Final fallback: determine if single or multiple trades
        const projectTypes = this.getProjectTypes(project);
        const hasSingleTrade = projectTypes.length === 1;
        
        if (hasSingleTrade) {
            // Single trade: matches project type and overall progress
            const overallProgress = totalLineItems > 0 
                ? Math.round((completedItems.length / totalLineItems) * 100)
                : 0;
                
            return [{
                name: projectTypes[0],
                laborProgress: overallProgress,
                materialsDelivered: this.estimateMaterialsDelivered(project, overallProgress),
                completedItems: completedItems.length,
                totalItems: totalLineItems,
                isMainTrade: true
            }];
        } else {
            // Multiple trades: calculate based on line items grouped by trade
            return this.calculateMultipleTradeBreakdown(
                projectTypes, 
                completedItems, 
                totalLineItems, 
                workflowStructure,
                project
            );
        }
    }

    /**
     * Calculate breakdown for projects with actual multiple workflow trackers
     * NEW: This handles real multiple workflows from the database
     */
    static calculateRealMultipleWorkflowBreakdown(workflowTrackers) {
        const trades = [];
        
        workflowTrackers.forEach((tracker, index) => {
            // Get workflow type name for display
            const workflowTypeName = this.getWorkflowTypeDisplayName(tracker.workflowType);
            
            // Calculate completed items for this workflow
            const completedItems = tracker.completedItems || [];
            const totalItems = tracker.totalLineItems || this.estimateTotalLineItems();
            
            const progress = totalItems > 0 
                ? Math.round((completedItems.length / totalItems) * 100)
                : 0;
            
            trades.push({
                name: tracker.tradeName || workflowTypeName,
                laborProgress: progress,
                materialsDelivered: this.estimateMaterialsDelivered(
                    { workflowType: tracker.workflowType }, 
                    progress
                ),
                completedItems: completedItems.length,
                totalItems: totalItems,
                isMainTrade: tracker.isMainWorkflow || index === 0,
                workflowType: tracker.workflowType,
                trackerId: tracker.id
            });
        });
        
        return trades;
    }

    /**
     * Get display name for workflow type
     */
    static getWorkflowTypeDisplayName(workflowType) {
        const displayNames = {
            'ROOFING': 'Roofing',
            'GUTTERS': 'Gutters',
            'INTERIOR_PAINT': 'Interior Paint',
            'WATER_LEAK': 'Water Leak',
            'MOLD': 'Mold',
            'DECKS': 'Decks',
            'REPAIR_EXTERIOR': 'Repair - Exterior',
            'REPAIR_INTERIOR': 'Repair - Interior',
            'WINDOWS': 'Windows',
            'SIDING': 'Siding',
            'FENCE': 'Fence',
            'KITCHEN_REMODEL': 'Kitchen Remodel',
            'BATHROOM_RENOVATION': 'Bathroom Renovation',
            'FLOORING': 'Flooring',
            'PAINTING': 'Painting',
            'ELECTRICAL_WORK': 'Electrical Work',
            'PLUMBING': 'Plumbing',
            'HVAC': 'HVAC',
            'LANDSCAPING': 'Landscaping',
            'OTHER': 'Other',
            'GENERAL': 'General'
        };
        
        return displayNames[workflowType] || workflowType;
    }
    
    /**
     * Get project types from project object
     */
    static getProjectTypes(project) {
        const types = [];
        
        // Primary project type
        if (project.projectType) {
            types.push(project.projectType);
        } else if (project.type) {
            types.push(project.type);
        }
        
        // Additional trades if specified
        if (project.trades && Array.isArray(project.trades)) {
            project.trades.forEach(trade => {
                if (trade.name && !types.includes(trade.name)) {
                    types.push(trade.name);
                }
            });
        }
        
        // Default to 'General' if no types found
        if (types.length === 0) {
            types.push('General');
        }
        
        return types;
    }
    
    /**
     * Calculate breakdown for multiple trades
     */
    static calculateMultipleTradeBreakdown(projectTypes, completedItems, totalLineItems, workflowStructure, project) {
        const trades = [];
        const itemsPerTrade = Math.ceil(totalLineItems / projectTypes.length);
        
        projectTypes.forEach((tradeType, index) => {
            // Assign line items to trades - evenly distribute across all trades
            const tradeStartIndex = index * itemsPerTrade;
            const tradeEndIndex = Math.min((index + 1) * itemsPerTrade, totalLineItems);
            const tradeTotal = tradeEndIndex - tradeStartIndex;
            
            // Count how many completed items would belong to this trade's range
            // Since we're distributing evenly, we need to map completed items to trade ranges
            let tradeCompletedCount = 0;
            
            // If we have actual completed items (including skipped), distribute them proportionally
            if (completedItems && completedItems.length > 0) {
                // Calculate what portion of total completed items this trade should have
                const tradePercentage = tradeTotal / totalLineItems;
                tradeCompletedCount = Math.round(completedItems.length * tradePercentage);
                
                // Ensure we don't exceed the trade's total items
                tradeCompletedCount = Math.min(tradeCompletedCount, tradeTotal);
            }
            
            const tradeProgress = tradeTotal > 0 
                ? Math.round((tradeCompletedCount / tradeTotal) * 100)
                : 0;
            
            trades.push({
                name: tradeType,
                laborProgress: tradeProgress,
                materialsDelivered: this.estimateMaterialsDelivered(project, tradeProgress),
                completedItems: tradeCompletedCount,
                totalItems: tradeTotal,
                isMainTrade: index === 0
            });
        });
        
        // Adjust completed items to ensure total matches
        const totalAssignedCompleted = trades.reduce((sum, t) => sum + t.completedItems, 0);
        const actualCompletedCount = completedItems ? completedItems.length : 0;
        
        // If there's a discrepancy, adjust the main trade
        if (totalAssignedCompleted !== actualCompletedCount && trades.length > 0) {
            const difference = actualCompletedCount - totalAssignedCompleted;
            trades[0].completedItems = Math.max(0, trades[0].completedItems + difference);
            trades[0].laborProgress = trades[0].totalItems > 0 
                ? Math.round((trades[0].completedItems / trades[0].totalItems) * 100)
                : 0;
        }
        
        return trades;
    }
    
    /**
     * Estimate materials delivery status based on progress
     */
    static estimateMaterialsDelivered(project, progress) {
        // Check if project has explicit materials delivery data
        if (project.materialsDeliveryStart || project.materialsDelivered !== undefined) {
            return project.materialsDelivered || Boolean(project.materialsDeliveryStart);
        }
        
        // Estimate based on progress - materials typically delivered when work is 20%+ complete
        return progress >= 20;
    }

    /**
     * DEPRECATED: Legacy method for backward compatibility
     * @deprecated Use calculateProjectProgress instead
     */
    static calculateProgress(project) {
        console.warn('WorkflowProgressService.calculateProgress is deprecated. Use calculateProjectProgress instead.');
        return this.calculateProjectProgress(project);
    }
}

export default WorkflowProgressService;