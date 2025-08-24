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

		const tracker = await this.getMainTracker(projectId);
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

	// 2) List incomplete items in a given phase
    async getIncompleteItemsInPhase(projectId, phaseName) {
		const tracker = await this.getMainTracker(projectId);
		if (!tracker) return [];

		const phaseType = WorkflowActionService.normalizePhaseName(phaseName);
		if (!phaseType) return [];

		const phase = await prisma.workflowPhase.findFirst({
			where: { phaseType, isActive: true, isCurrent: true, workflowType: tracker.workflowType || 'ROOFING' },
			include: {
				sections: {
					where: { isActive: true, isCurrent: true },
					include: { lineItems: { where: { isActive: true, isCurrent: true } } },
					orderBy: { displayOrder: 'asc' }
				}
			}
		});
		if (!phase) return [];

		const completed = await prisma.completedWorkflowItem.findMany({
			where: { trackerId: tracker.id },
			select: { lineItemId: true }
		});
		const completedIds = new Set(completed.map(c => c.lineItemId));

		const items = [];
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
