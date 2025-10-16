const express = require('express');
const { prisma } = require('../config/prisma');
const { authenticateToken } = require('../middleware/auth');
const { 
    asyncHandler, 
    sendSuccess, 
    sendError,
    AppError 
} = require('../middleware/errorHandler');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// @desc    Save a voice transcript
// @route   POST /api/voice-transcripts
// @access  Private
router.post('/', asyncHandler(async (req, res, next) => {
    try {
        const { 
            sessionId,
            projectId,
            summary,
            fullTranscript,
            metadata 
        } = req.body;

        if (!sessionId || !fullTranscript) {
            return next(new AppError('Session ID and transcript are required', 400));
        }

        // Extract user ID from token
        const userId = req.user?.id || req.user?.userId;

        // Create or update the transcript
        const transcript = await prisma.voiceTranscript.upsert({
            where: { sessionId },
            update: {
                projectId,
                userId,
                callDate: metadata?.callDate ? new Date(metadata.callDate) : new Date(),
                startTime: metadata?.startTime ? new Date(metadata.startTime) : new Date(),
                endTime: metadata?.endTime ? new Date(metadata.endTime) : new Date(),
                duration: metadata?.duration || 'Unknown',
                participantCount: metadata?.participantCount || 1,
                executiveSummary: summary?.executiveSummary,
                projectStatus: summary?.projectStatus,
                keyDecisions: summary?.keyDecisions || [],
                actionItems: summary?.actionItems || [],
                materials: summary?.materialsAndSpecifications || summary?.materialsList || [],
                schedule: summary?.scheduleAndTimeline || {},
                risks: summary?.risksAndIssues || summary?.risks || [],
                budget: summary?.budgetAndCosts || {},
                technicalDetails: summary?.technicalDetails || [],
                clientConcerns: summary?.clientConcerns || [],
                nextSteps: summary?.nextSteps || [],
                communicationItems: summary?.communicationItems || [],
                fullTranscript: fullTranscript,
                aiModel: summary?.metadata?.aiModel || metadata?.aiModel,
                aiProcessedAt: summary?.metadata?.aiModel ? new Date() : null,
                isAiEnhanced: !!summary?.metadata?.aiModel
            },
            create: {
                sessionId,
                projectId,
                userId,
                callDate: metadata?.callDate ? new Date(metadata.callDate) : new Date(),
                startTime: metadata?.startTime ? new Date(metadata.startTime) : new Date(),
                endTime: metadata?.endTime ? new Date(metadata.endTime) : new Date(),
                duration: metadata?.duration || 'Unknown',
                participantCount: metadata?.participantCount || 1,
                executiveSummary: summary?.executiveSummary,
                projectStatus: summary?.projectStatus,
                keyDecisions: summary?.keyDecisions || [],
                actionItems: summary?.actionItems || [],
                materials: summary?.materialsAndSpecifications || summary?.materialsList || [],
                schedule: summary?.scheduleAndTimeline || {},
                risks: summary?.risksAndIssues || summary?.risks || [],
                budget: summary?.budgetAndCosts || {},
                technicalDetails: summary?.technicalDetails || [],
                clientConcerns: summary?.clientConcerns || [],
                nextSteps: summary?.nextSteps || [],
                communicationItems: summary?.communicationItems || [],
                fullTranscript: fullTranscript,
                aiModel: summary?.metadata?.aiModel || metadata?.aiModel,
                aiProcessedAt: summary?.metadata?.aiModel ? new Date() : null,
                isAiEnhanced: !!summary?.metadata?.aiModel
            },
            include: {
                project: {
                    select: {
                        id: true,
                        projectName: true,
                        projectNumber: true
                    }
                },
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });

        sendSuccess(res, 201, { transcript }, 'Transcript saved successfully');

    } catch (error) {
        console.error('Error saving transcript:', error);
        return next(new AppError('Failed to save transcript', 500));
    }
}));

// @desc    Get all voice transcripts for a user
// @route   GET /api/voice-transcripts
// @access  Private
router.get('/', asyncHandler(async (req, res, next) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const { projectId, limit = 20, offset = 0 } = req.query;

        const where = {
            OR: [
                { userId },
                { project: { projectManagerId: userId } },
                { project: { teamMembers: { some: { userId } } } }
            ]
        };

        if (projectId) {
            where.projectId = projectId;
        }

        const [transcripts, total] = await Promise.all([
            prisma.voiceTranscript.findMany({
                where,
                take: parseInt(limit),
                skip: parseInt(offset),
                orderBy: { createdAt: 'desc' },
                include: {
                    project: {
                        select: {
                            id: true,
                            projectName: true,
                            projectNumber: true,
                            customer: {
                                select: {
                                    primaryName: true,
                                    address: true
                                }
                            }
                        }
                    },
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            }),
            prisma.voiceTranscript.count({ where })
        ]);

        sendSuccess(res, 200, { 
            transcripts,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: (parseInt(offset) + parseInt(limit)) < total
            }
        }, 'Transcripts retrieved successfully');

    } catch (error) {
        console.error('Error fetching transcripts:', error);
        return next(new AppError('Failed to fetch transcripts', 500));
    }
}));

// @desc    Get a specific voice transcript
// @route   GET /api/voice-transcripts/:id
// @access  Private
router.get('/:id', asyncHandler(async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id || req.user?.userId;

        const transcript = await prisma.voiceTranscript.findUnique({
            where: { id },
            include: {
                project: {
                    include: {
                        customer: true,
                        projectManager: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true
                            }
                        }
                    }
                },
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });

        if (!transcript) {
            return next(new AppError('Transcript not found', 404));
        }

        // Check if user has access to this transcript
        const hasAccess = transcript.userId === userId ||
                         transcript.project?.projectManagerId === userId ||
                         (await prisma.projectTeamMember.findFirst({
                             where: {
                                 projectId: transcript.projectId,
                                 userId
                             }
                         }));

        if (!hasAccess) {
            return next(new AppError('You do not have access to this transcript', 403));
        }

        sendSuccess(res, 200, { transcript }, 'Transcript retrieved successfully');

    } catch (error) {
        console.error('Error fetching transcript:', error);
        return next(new AppError('Failed to fetch transcript', 500));
    }
}));

// @desc    Update transcript with generated files info
// @route   PATCH /api/voice-transcripts/:id/files
// @access  Private
router.patch('/:id/files', asyncHandler(async (req, res, next) => {
    try {
        const { id } = req.params;
        const { generatedFiles } = req.body;

        const transcript = await prisma.voiceTranscript.update({
            where: { id },
            data: {
                generatedFiles,
                updatedAt: new Date()
            }
        });

        sendSuccess(res, 200, { transcript }, 'Transcript updated with file info');

    } catch (error) {
        console.error('Error updating transcript:', error);
        return next(new AppError('Failed to update transcript', 500));
    }
}));

// @desc    Delete a voice transcript
// @route   DELETE /api/voice-transcripts/:id
// @access  Private
router.delete('/:id', asyncHandler(async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id || req.user?.userId;

        const transcript = await prisma.voiceTranscript.findUnique({
            where: { id },
            select: {
                userId: true,
                project: {
                    select: {
                        projectManagerId: true
                    }
                }
            }
        });

        if (!transcript) {
            return next(new AppError('Transcript not found', 404));
        }

        // Only owner or project manager can delete
        if (transcript.userId !== userId && transcript.project?.projectManagerId !== userId) {
            return next(new AppError('You do not have permission to delete this transcript', 403));
        }

        await prisma.voiceTranscript.delete({
            where: { id }
        });

        sendSuccess(res, 200, null, 'Transcript deleted successfully');

    } catch (error) {
        console.error('Error deleting transcript:', error);
        return next(new AppError('Failed to delete transcript', 500));
    }
}));

// @desc    Get transcript statistics
// @route   GET /api/voice-transcripts/stats/summary
// @access  Private
router.get('/stats/summary', asyncHandler(async (req, res, next) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const { projectId } = req.query;

        const where = {
            OR: [
                { userId },
                { project: { projectManagerId: userId } },
                { project: { teamMembers: { some: { userId } } } }
            ]
        };

        if (projectId) {
            where.projectId = projectId;
        }

        const stats = await prisma.voiceTranscript.aggregate({
            where,
            _count: {
                _all: true
            },
            _sum: {
                participantCount: true
            }
        });

        // Get recent transcripts
        const recentTranscripts = await prisma.voiceTranscript.findMany({
            where,
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                sessionId: true,
                callDate: true,
                duration: true,
                project: {
                    select: {
                        projectName: true
                    }
                }
            }
        });

        // Count AI-enhanced transcripts
        const aiEnhancedCount = await prisma.voiceTranscript.count({
            where: {
                ...where,
                isAiEnhanced: true
            }
        });

        sendSuccess(res, 200, {
            totalTranscripts: stats._count._all || 0,
            totalParticipants: stats._sum.participantCount || 0,
            aiEnhancedCount,
            recentTranscripts
        }, 'Statistics retrieved successfully');

    } catch (error) {
        console.error('Error fetching statistics:', error);
        return next(new AppError('Failed to fetch statistics', 500));
    }
}));

module.exports = router;