const { prisma } = require('../config/prisma');
const WorkflowProgressionService = require('./WorkflowProgressionService');
const WorkflowCompletionService = require('./WorkflowCompletionService');

class WorkflowActionService {
	constructor() {}

	// Map human-readable phase names to enum values used by Prisma
	static normalizePhaseName(phaseName) {
		if (!phaseName) return null;
		const normalized = String(phaseName).trim().toUpperCase().replace(/\s+/g, '_');
		const mapping = {
			LEAD: 'LEAD',
			PROSPECT: 'PROSPECT',
			APPROVED: 'APPROVED',
			EXECUTION: 'EXECUTION',
			'2ND_SUPP': 'SECOND_SUPPLEMENT',
			'2ND_SUPPLEMENT': 'SECOND_SUPPLEMENT',
			SECOND_SUPPLEMENT: 'SECOND_SUPPLEMENT',
			COMPLETION: 'COMPLETION'
		};
		return mapping[normalized] || mapping[normalized.replace(':', '')] || null;
	}

	async getMainTracker(projectId) {
		return await prisma.projectWorkflowTracker.findFirst({
			where: { projectId, isMainWorkflow: true },
			select: { id: true, workflowType: true }
		});
	}

	/**
	 * Find the tracker that owns a specific line item by matching workflow template
	 */
	async getTrackerForLineItem(projectId, lineItemName) {
		// First get all trackers for the project
		const trackers = await prisma.projectWorkflowTracker.findMany({
			where: { projectId },
			select: { id: true, workflowType: true, customWorkflowId: true, isMainWorkflow: true }
		});

		if (trackers.length <= 1) {
			return trackers[0] || null;
		}

		// Try to find which tracker's workflow template contains this line item
		for (const tracker of trackers) {
			let lineItem;
			if (tracker.workflowType === 'CUSTOM' && tracker.customWorkflowId) {
				lineItem = await prisma.workflowLineItem.findFirst({
					where: {
						isActive: true,
						isCurrent: true,
						itemName: { equals: lineItemName, mode: 'insensitive' },
						section: { phase: { customWorkflowId: tracker.customWorkflowId } }
					}
				});
			} else {
				lineItem = await prisma.workflowLineItem.findFirst({
					where: {
						isActive: true,
						isCurrent: true,
						workflowType: tracker.workflowType,
						itemName: { equals: lineItemName, mode: 'insensitive' }
					}
				});
			}
			if (lineItem) return tracker;
		}

		// Fallback to main tracker
		return trackers.find(t => t.isMainWorkflow) || trackers[0];
	}

	async findLineItemByName(itemName, workflowType = 'ROOFING') {
		if (!itemName) return null;
		return await prisma.workflowLineItem.findFirst({
            where: {
				isActive: true,
				isCurrent: true,
				workflowType,
				itemName: { equals: itemName, mode: 'insensitive' }
			},
			include: {
				section: { include: { phase: true } }
			}
		});
	}

	// 1) Mark a line item complete and trigger progression/alerts
	async markLineItemComplete(projectId, lineItemName, userId = null, notes = null) {
		if (!projectId || !lineItemName) {
			return { success: false, message: 'projectId and lineItemName are required.' };
		}

		// Find the correct tracker for this line item (not just main)
		const tracker = await this.getTrackerForLineItem(projectId, lineItemName);
		if (!tracker) {
			return { success: false, message: 'No workflow tracker found for this project. Initialize the workflow first.' };
		}

		const lineItem = await this.findLineItemByName(lineItemName, tracker.workflowType || 'ROOFING');
		if (!lineItem) {
			return { success: false, message: `I couldn't find a workflow item named "${lineItemName}" for this project.` };
		}

        let result;
        try {
            result = await WorkflowProgressionService.completeLineItem(projectId, lineItem.id, userId, notes, global.io);
        } catch (e) {
            // Fallback to legacy completion service when DB functions are unavailable
            const legacy = await WorkflowCompletionService.completeLineItem(projectId, lineItem.id, userId, notes || undefined);
            const nextLegacy = legacy?.tracker?.currentLineItemId
                ? await prisma.workflowLineItem.findUnique({
                        where: { id: legacy.tracker.currentLineItemId },
                        include: { section: { include: { phase: true } } }
                    })
                : null;
            return {
                success: true,
                completedItem: legacy.completedItem,
                nextItem: nextLegacy
                    ? {
                        id: nextLegacy.id,
                        lineItemName: nextLegacy.itemName,
                        sectionName: nextLegacy.section?.displayName,
                        phaseName: nextLegacy.section?.phase?.phaseType
                    }
                    : null,
                message: nextLegacy
                    ? `The task "${legacy.completedItem.lineItemName}" is marked complete. Next: "${nextLegacy.itemName}" assigned to ${nextLegacy.responsibleRole}.`
                    : `The task "${legacy.completedItem.lineItemName}" is marked complete. That was the last item in this section or workflow.`
            };
        }

		const next = result?.tracker?.currentLineItemId
			? await prisma.workflowLineItem.findUnique({
					where: { id: result.tracker.currentLineItemId },
					include: { section: { include: { phase: true } } }
				})
			: null;

		return {
			success: true,
			completedItem: {
				id: lineItem.id,
				lineItemName: lineItem.itemName,
				sectionName: lineItem.section?.displayName,
				phaseName: lineItem.section?.phase?.phaseType
			},
			nextItem: next
				? {
					id: next.id,
					lineItemName: next.itemName,
					sectionName: next.section?.displayName,
					phaseName: next.section?.phase?.phaseType
				}
			: null,
			message: next
				? `The task "${lineItem.itemName}" is marked complete. Next: "${next.itemName}" assigned to ${next.responsibleRole}.`
				: `The task "${lineItem.itemName}" is marked complete. That was the last item in this section or workflow.`
		};
	}

	// 2) List incomplete items in a given phase (across all trackers)
    async getIncompleteItemsInPhase(projectId, phaseName) {
		// Get all trackers for this project
		const trackers = await prisma.projectWorkflowTracker.findMany({
			where: { projectId },
			select: { id: true, workflowType: true }
		});
		if (trackers.length === 0) return [];

		const phaseType = WorkflowActionService.normalizePhaseName(phaseName);
		if (!phaseType) return [];

		// Collect unique workflowTypes from all trackers
		const workflowTypes = [...new Set(trackers.map(t => t.workflowType))];
		const trackerIds = trackers.map(t => t.id);

		// Find phases matching any of the project's workflow types
		const phases = await prisma.workflowPhase.findMany({
			where: { phaseType, isActive: true, isCurrent: true, workflowType: { in: workflowTypes } },
			include: {
				sections: {
					where: { isActive: true, isCurrent: true },
					include: { lineItems: { where: { isActive: true, isCurrent: true } } },
					orderBy: { displayOrder: 'asc' }
				}
			}
		});
		if (phases.length === 0) return [];

		// Get completed items across ALL trackers
		const completed = await prisma.completedWorkflowItem.findMany({
			where: { trackerId: { in: trackerIds } },
			select: { lineItemId: true }
		});
		const completedIds = new Set(completed.map(c => c.lineItemId));

		const items = [];
		for (const phase of phases) {
			for (const section of phase.sections) {
				const sorted = [...section.lineItems].sort((a, b) => a.displayOrder - b.displayOrder);
				for (const item of sorted) {
					if (!completedIds.has(item.id)) {
						items.push({
							id: item.id,
							itemName: item.itemName,
							sectionName: section.displayName,
							phaseName: phase.phaseType,
							displayOrder: item.displayOrder
						});
					}
				}
			}
		}

		return items;
	}

	// 3) Find the current blocker in a phase (first incomplete item)
	async findBlockingTask(projectId, phaseName) {
		const items = await this.getIncompleteItemsInPhase(projectId, phaseName);
		return items.length > 0 ? items[0] : null;
	}

	// 4) Can we advance phase?
	async canAdvancePhase(projectId, phaseName) {
		const incomplete = await this.getIncompleteItemsInPhase(projectId, phaseName);
		const ready = incomplete.length === 0;
		return {
			ready,
			message: ready
				? `All tasks in the ${phaseName} phase are complete. You can advance.`
				: `There are ${incomplete.length} incomplete tasks in ${phaseName}. Blocker: "${incomplete[0].itemName}".`
		};
	}

	// 5) Reassign an alert for a specific task to a new user
	async reassignTask(lineItemName, newUserId, projectId) {
		if (!lineItemName || !newUserId || !projectId) {
			return { success: false, message: 'lineItemName, newUserId, and projectId are required.' };
		}

		// Update all active alerts for this project and this step name
		const updated = await prisma.workflowAlert.updateMany({
			where: {
				projectId,
                status: 'ACTIVE',
				OR: [
					{ stepName: lineItemName },
				]
			},
			data: { assignedToId: newUserId, acknowledged: false, isRead: false }
		});

		return {
			success: true,
			message: updated.count > 0
				? `Reassigned ${updated.count} alert(s) for "${lineItemName}".`
				: `No active alerts found for "${lineItemName}" to reassign.`
		};
	}
}

module.exports = WorkflowActionService;
