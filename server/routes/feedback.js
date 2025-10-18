const express = require('express');
const { prisma } = require('../config/prisma');
const { authenticateToken } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

// Debug database connection
console.log('🔍 FEEDBACK ROUTE DEBUG:');
console.log('🔍 DATABASE_URL present:', !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
  const maskedUrl = process.env.DATABASE_URL.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@');
  console.log('🔍 DATABASE_URL:', maskedUrl);
}

// GET /api/feedback - List feedback with filters
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const {
    type,
    status,
    severity,
    authorId,
    assigneeId,
    search,
    sortBy = 'newest',
    page = 1,
    limit = 20
  } = req.query;

  const where = {};
  
  if (type && type !== 'all') {
    if (type === 'MINE') {
      // Filter for current user's feedback
      where.authorId = req.user.id;
    } else if (type === 'FOLLOWING') {
      // Filter for feedback with at least one developer comment
      where.comments = { some: { isDeveloper: true } };
    } else {
      where.type = type.toUpperCase();
    }
  }
  
  if (status && status !== 'all') {
    where.status = status.toUpperCase();
  }
  
  if (severity && severity !== 'all') {
    where.severity = severity.toUpperCase();
  }
  
  if (authorId) {
    where.authorId = authorId;
  }
  
  if (assigneeId) {
    where.assigneeId = assigneeId;
  }
  
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { tags: { has: search } }
    ];
  }

  const orderBy = {};
  switch (sortBy) {
    case 'newest':
      orderBy.createdAt = 'desc';
      break;
    case 'oldest':
      orderBy.createdAt = 'asc';
      break;
    case 'most_voted':
      orderBy.voteCount = 'desc';
      break;
    case 'most_commented':
      orderBy.commentCount = 'desc';
      break;
    default:
      orderBy.createdAt = 'desc';
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const [feedback, total] = await Promise.all([
    prisma.feedback.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true
          }
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true
          }
        },
        comments: {
          select: {
            isDeveloper: true
          }
        }
      }
    }),
    (async () => {
      console.log('🔍 FEEDBACK DEBUG: About to query feedback table');
      console.log('🔍 FEEDBACK DEBUG: where clause:', JSON.stringify(where, null, 2));
      try {
        return await prisma.feedback.count({ where });
      } catch (error) {
        console.error('🔍 FEEDBACK DEBUG: Error in feedback.count:', error);
        throw error;
      }
    })()
  ]);

  // Transform the data to match frontend expectations
  const transformedFeedback = feedback.map(item => {
    // Calculate actual developer response count from comments - ensure it's 0 if no comments
    const actualDeveloperResponseCount = item.comments ? item.comments.filter(comment => comment.isDeveloper).length : 0;
    
    return {
      id: item.id,
      type: item.type,
      title: item.title,
      description: item.description,
      status: item.status,
      severity: item.severity,
      tags: item.tags,
      voteCount: item.voteCount,
      commentCount: item.commentCount || 0,
      developerResponseCount: actualDeveloperResponseCount,
      attachments: item.attachments,
      url: item.url,
      environment: item.environment,
      author: {
        id: item.author.id,
        name: `${item.author.firstName} ${item.author.lastName}`,
        avatar: item.author.avatar,
        role: item.author.role
      },
      assignee: item.assignee ? {
        id: item.assignee.id,
        name: `${item.assignee.firstName} ${item.assignee.lastName}`,
        avatar: item.assignee.avatar,
        role: item.assignee.role
      } : null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      hasVoted: false // Will be set based on user's votes
    };
  });

  res.json({
    success: true,
    data: transformedFeedback,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / parseInt(limit))
  });
}));

// GET /api/feedback/:id - Get single feedback item
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true
        }
      },
      assignee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true
        }
      },
      votes: {
        where: { userId },
        select: { action: true }
      },
      comments: {
        select: {
          isDeveloper: true
        }
      },
      _count: {
        select: {
          votes: true,
          comments: true
        }
      }
    }
  });

  if (!feedback) {
    return res.status(404).json({
      success: false,
      message: 'Feedback not found'
    });
  }

  // Calculate actual developer response count from comments - ensure it's 0 if no comments
  const actualDeveloperResponseCount = feedback.comments ? feedback.comments.filter(comment => comment.isDeveloper).length : 0;

  const transformedFeedback = {
    id: feedback.id,
    type: feedback.type,
    title: feedback.title,
    description: feedback.description,
    status: feedback.status,
    severity: feedback.severity,
    tags: feedback.tags,
    voteCount: feedback.voteCount,
    commentCount: feedback.commentCount,
    developerResponseCount: actualDeveloperResponseCount,
    attachments: feedback.attachments,
    url: feedback.url,
    environment: feedback.environment,
    author: {
      id: feedback.author.id,
      name: `${feedback.author.firstName} ${feedback.author.lastName}`,
      avatar: feedback.author.avatar,
      role: feedback.author.role
    },
    assignee: feedback.assignee ? {
      id: feedback.assignee.id,
      name: `${feedback.assignee.firstName} ${feedback.assignee.lastName}`,
      avatar: feedback.assignee.avatar,
      role: feedback.assignee.role
    } : null,
    createdAt: feedback.createdAt,
    updatedAt: feedback.updatedAt,
    hasVoted: feedback.votes.length > 0
  };

  res.json({
    success: true,
    data: transformedFeedback
  });
}));

// POST /api/feedback - Create new feedback
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const { type, title, description, severity, tags = [], attachments, url, environment } = req.body;
  const userId = req.user.id;

  if (!type || !title || !description) {
    return res.status(400).json({
      success: false,
      message: 'Type, title, and description are required'
    });
  }

  const feedback = await prisma.feedback.create({
    data: {
      type: type.toUpperCase(),
      title,
      description,
      severity: severity ? severity.toUpperCase() : null,
      tags,
      attachments,
      url,
      environment,
      authorId: userId
    },
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true
        }
      }
    }
  });

  // Award points for creating feedback
  await prisma.userProfile.upsert({
    where: { userId },
    update: { 
      points: { increment: 5 },
      lastActivityDate: new Date()
    },
    create: {
      userId,
      points: 5,
      level: 1,
      lastActivityDate: new Date()
    }
  });

  const transformedFeedback = {
    id: feedback.id,
    type: feedback.type,
    title: feedback.title,
    description: feedback.description,
    status: feedback.status,
    severity: feedback.severity,
    tags: feedback.tags,
    voteCount: 0,
    commentCount: 0,
    developerResponseCount: 0,
    attachments: feedback.attachments,
    url: feedback.url,
    environment: feedback.environment,
    author: {
      id: feedback.author.id,
      name: `${feedback.author.firstName} ${feedback.author.lastName}`,
      avatar: feedback.author.avatar,
      role: feedback.author.role
    },
    assignee: null,
    createdAt: feedback.createdAt,
    updatedAt: feedback.updatedAt,
    hasVoted: false
  };

  res.status(201).json({
    success: true,
    data: transformedFeedback
  });
}));

// PATCH /api/feedback/:id - Update feedback
router.patch('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, severity, assigneeId, tags } = req.body;
  const userId = req.user.id;
  const role = req.user.role;

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    include: { author: true }
  });

  if (!feedback) {
    return res.status(404).json({
      success: false,
      message: 'Feedback not found'
    });
  }

  // Check permissions
  const isAuthor = feedback.authorId === userId;
  const isDeveloper = role === 'DEVELOPER' || role === 'ADMIN';

  if (!isAuthor && !isDeveloper) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this feedback'
    });
  }

  const updateData = {};
  if (status) updateData.status = status.toUpperCase();
  if (severity) updateData.severity = severity.toUpperCase();
  if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
  if (tags) updateData.tags = tags;

  const updatedFeedback = await prisma.feedback.update({
    where: { id },
    data: updateData,
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true
        }
      },
      assignee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true
        }
      }
    }
  });

  res.json({
    success: true,
    data: updatedFeedback
  });
}));

// DELETE /api/feedback/:id - Delete feedback
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const role = req.user.role;

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    include: { author: true }
  });

  if (!feedback) {
    return res.status(404).json({
      success: false,
      message: 'Feedback not found'
    });
  }

  // Check permissions
  const isAuthor = feedback.authorId === userId;
  const isAdmin = role === 'ADMIN';

  if (!isAuthor && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this feedback'
    });
  }

  await prisma.feedback.delete({
    where: { id }
  });

  res.json({
    success: true,
    message: 'Feedback deleted successfully'
  });
}));

// POST /api/feedback/:id/vote - Vote on feedback
router.post('/:id/vote', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  const userId = req.user.id;

  if (!action || !['upvote', 'downvote'].includes(action)) {
    return res.status(400).json({
      success: false,
      message: 'Valid action (upvote/downvote) is required'
    });
  }

  const feedback = await prisma.feedback.findUnique({
    where: { id }
  });

  if (!feedback) {
    return res.status(404).json({
      success: false,
      message: 'Feedback not found'
    });
  }

  // Check if user already voted
  const existingVote = await prisma.vote.findUnique({
    where: {
      userId_feedbackId: {
        userId,
        feedbackId: id
      }
    }
  });

  const voteAction = action === 'upvote' ? 'UPVOTE' : 'DOWNVOTE';
  const voteValue = action === 'upvote' ? 1 : -1;

  if (existingVote) {
    if (existingVote.action === voteAction) {
      // Remove vote
      await prisma.vote.delete({
        where: {
          userId_feedbackId: {
            userId,
            feedbackId: id
          }
        }
      });

      await prisma.feedback.update({
        where: { id },
        data: {
          voteCount: { decrement: voteValue }
        }
      });
    } else {
      // Update vote
      await prisma.vote.update({
        where: {
          userId_feedbackId: {
            userId,
            feedbackId: id
          }
        },
        data: { action: voteAction }
      });

      await prisma.feedback.update({
        where: { id },
        data: {
          voteCount: { increment: voteValue * 2 }
        }
      });
    }
  } else {
    // Create new vote
    await prisma.vote.create({
      data: {
        userId,
        feedbackId: id,
        action: voteAction
      }
    });

    await prisma.feedback.update({
      where: { id },
      data: {
        voteCount: { increment: voteValue }
      }
    });
  }

  res.json({
    success: true,
    message: 'Vote recorded successfully'
  });
}));

// PATCH /api/feedback/:id/status - Update feedback status (developer only)
router.patch('/:id/status', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, assigneeId, tags } = req.body;
  const userId = req.user.id;
  const role = req.user.role;

  // Check if user is developer or admin
  if (role !== 'DEVELOPER' && role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Only developers can update feedback status'
    });
  }

  const updateData = {};
  if (status) updateData.status = status.toUpperCase();
  if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
  if (tags) updateData.tags = tags;

  const updatedFeedback = await prisma.feedback.update({
    where: { id },
    data: updateData,
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true
        }
      },
      assignee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true
        }
      }
    }
  });

  res.json({
    success: true,
    data: updatedFeedback
  });
}));

module.exports = router;