const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class WorkflowActionService {

    /**
     * Marks a line item as complete and finds the next one in the sequence to alert.
     */
    async completeLineItemAndGetNext(lineItemId, projectId, userId) {
        const currentItem = await prisma.workflowLineItem.findUnique({
            where: { id: lineItemId },
            include: { section: { include: { phase: true } } }
        });

        if (!currentItem) {
            return { success: false, message: `Line item with ID ${lineItemId} not found.` };
        }

        // Use an upsert to avoid duplicate completion records
        await prisma.completedWorkflowItem.upsert({
            where: {
                projectId_lineItemId: {
                    projectId: projectId,
                    lineItemId: lineItemId,
                },
            },
            update: { completedBy: userId, completedAt: new Date() },
            create: {
                lineItemId: lineItemId,
                projectId: projectId,
                completedBy: userId,
                notes: 'Completed via Bubbles AI'
            }
        });
        
        const nextItem = await prisma.workflowLineItem.findFirst({
            where: {
                sectionId: currentItem.sectionId,
                sequence: { gt: currentItem.sequence }
            },
            orderBy: { sequence: 'asc' }
        });

        if (nextItem) {
            await this.triggerAlert(projectId, `Task ready: "${nextItem.name}"`, nextItem.id, userId);
            return { success: true, message: `Completed "${currentItem.name}". The next task is "${nextItem.name}".`, nextItem };
        } else {
            return { success: true, message: `Completed "${currentItem.name}". This was the last item in the section.`, nextItem: null };
        }
    }

    /**
     * Finds all incomplete line items for a given project phase.
     */
    async getIncompleteItemsInPhase(projectId, phaseName) {
        const completedItems = await prisma.completedWorkflowItem.findMany({
            where: { projectId },
            select: { lineItemId: true }
        });
        const completedItemIds = completedItems.map(item => item.lineItemId);

        const incompleteItems = await prisma.workflowLineItem.findMany({
            where: {
                id: { notIn: completedItemIds },
                section: {
                    phase: {
                        name: { equals: phaseName, mode: 'insensitive' },
                        workflow: { projectId }
                    }
                }
            },
            orderBy: { section: { sequence: 'asc' }, sequence: 'asc' },
            select: { name: true, sequence: true, section: { select: { name: true } } }
        });
        
        return incompleteItems;
    }
    
    /**
     * Identifies the first incomplete line item in a phase, which is the current blocker.
     */
    async findBlockingTask(projectId, phaseName) {
        const incompleteItems = await this.getIncompleteItemsInPhase(projectId, phaseName);
        if (incompleteItems.length > 0) {
            return incompleteItems[0]; // The first one in the sequence is the blocker
        }
        return null;
    }

    /**
     * Reassigns an alert for a specific task to a new user.
     */
    async reassignTask(lineItemId, newUserId, projectId) {
        const user = await prisma.user.findUnique({ where: { id: newUserId } });
        if (!user) {
            return { success: false, message: `User with ID ${newUserId} not found.` };
        }

        // Find the line item to get its name
        const lineItem = await prisma.workflowLineItem.findUnique({ where: { id: lineItemId } });
        if (!lineItem) {
            return { success: false, message: `Line item with ID ${lineItemId} not found.` };
        }

        // Delete old alerts for this item and create a new one
        await prisma.workflowAlert.deleteMany({ where: { lineItemId: lineItemId, projectId: projectId } });
        
        await this.triggerAlert(projectId, `Task reassigned to you: "${lineItem.name}"`, lineItemId, newUserId);

        return { success: true, message: `Task "${lineItem.name}" has been reassigned to ${user.firstName} ${user.lastName}.` };
    }

    /**
     * Checks if all line items in a phase are complete.
     */
    async canAdvancePhase(projectId, phaseName) {
        const incompleteItems = await this.getIncompleteItemsInPhase(projectId, phaseName);
        const isComplete = incompleteItems.length === 0;
        let message = isComplete 
            ? `Yes, all tasks in the ${phaseName} phase are complete. You are ready to advance.`
            : `No, there are still ${incompleteItems.length} incomplete tasks in the ${phaseName} phase. The current blocker is "${incompleteItems[0].name}".`;
        return { ready: isComplete, message: message };
    }

    /**
     * Helper function to create and send an alert.
     */
    async triggerAlert(projectId, message, lineItemId, assignedTo) {
        // In a real app, this would also trigger a push notification or email
        return await prisma.workflowAlert.create({
            data: {
                projectId: projectId,
                message: message,
                lineItemId: lineItemId,
                assignedTo: assignedTo,
                createdBy: 'system',
                status: 'ACTIVE',
                alertType: 'AUTOMATIC'
            }
        });
    }
}

module.exports = new WorkflowActionService();
