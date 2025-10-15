const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/feedback/:feedbackId/comments - Get comments for feedback
router.get('/:feedbackId/comments', asyncHandler(async (req, res) => {
  const { feedbackId } = req.params;

  const comments = await prisma.comment.findMany({
    where: { feedbackId },
    orderBy: [
      { isPinned: 'desc' },
      { createdAt: 'asc' }
    ],
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
      children: {
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
        },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  // Transform the data to match frontend expectations
  const transformedComments = comments.map(comment => ({
    id: comment.id,
    body: comment.body,
    isDeveloper: comment.isDeveloper,
    isPinned: comment.isPinned,
    author: {
      id: comment.author.id,
      name: `${comment.author.firstName} ${comment.author.lastName}`,
      avatar: comment.author.avatar,
      role: comment.author.role
    },
    createdAt: comment.createdAt,
    parentId: comment.parentId,
    children: comment.children.map(child => ({
      id: child.id,
      body: child.body,
      isDeveloper: child.isDeveloper,
      isPinned: child.isPinned,
      author: {
        id: child.author.id,
        name: `${child.author.firstName} ${child.author.lastName}`,
        avatar: child.author.avatar,
        role: child.author.role
      },
      createdAt: child.createdAt,
      parentId: child.parentId
    }))
  }));

  res.json({
    success: true,
    data: transformedComments
  });
}));

// POST /api/feedback/:feedbackId/comments - Add comment to feedback
router.post('/:feedbackId/comments', authenticateToken, asyncHandler(async (req, res) => {
  const { feedbackId } = req.params;
  const { body, parentId } = req.body;
  const userId = req.user.id;
  const role = req.user.role;

  if (!body || !body.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Comment body is required'
    });
  }

  // Check if feedback exists
  const feedback = await prisma.feedback.findUnique({
    where: { id: feedbackId }
  });

  if (!feedback) {
    return res.status(404).json({
      success: false,
      message: 'Feedback not found'
    });
  }

  // Check if parent comment exists (for threaded comments)
  if (parentId) {
    const parentComment = await prisma.comment.findUnique({
      where: { id: parentId }
    });

    if (!parentComment) {
      return res.status(404).json({
        success: false,
        message: 'Parent comment not found'
      });
    }
  }

  const isDeveloper = role === 'DEVELOPER' || role === 'ADMIN';

  const comment = await prisma.comment.create({
    data: {
      body: body.trim(),
      isDeveloper,
      feedbackId,
      parentId: parentId || null,
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

  // Update comment count on feedback
  await prisma.feedback.update({
    where: { id: feedbackId },
    data: {
      commentCount: { increment: 1 },
      developerResponseCount: isDeveloper ? { increment: 1 } : undefined
    }
  });

  // Award points for commenting
  await prisma.userProfile.upsert({
    where: { userId },
    update: { 
      points: { increment: 2 },
      lastActivityDate: new Date()
    },
    create: {
      userId,
      points: 2,
      level: 1,
      lastActivityDate: new Date()
    }
  });

  const transformedComment = {
    id: comment.id,
    body: comment.body,
    isDeveloper: comment.isDeveloper,
    isPinned: comment.isPinned,
    author: {
      id: comment.author.id,
      name: `${comment.author.firstName} ${comment.author.lastName}`,
      avatar: comment.author.avatar,
      role: comment.author.role
    },
    createdAt: comment.createdAt,
    parentId: comment.parentId
  };

  res.status(201).json({
    success: true,
    data: transformedComment
  });
}));

// PATCH /api/feedback/:feedbackId/comments/:commentId - Update comment
router.patch('/:feedbackId/comments/:commentId', authenticateToken, asyncHandler(async (req, res) => {
  const { feedbackId, commentId } = req.params;
  const { body, isPinned } = req.body;
  const { userId, role } = req.user;

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { author: true }
  });

  if (!comment) {
    return res.status(404).json({
      success: false,
      message: 'Comment not found'
    });
  }

  // Check permissions
  const isAuthor = comment.authorId === userId;
  const isDeveloper = role === 'DEVELOPER' || role === 'ADMIN';

  if (!isAuthor && !isDeveloper) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this comment'
    });
  }

  const updateData = {};
  if (body !== undefined) updateData.body = body.trim();
  if (isPinned !== undefined && isDeveloper) updateData.isPinned = isPinned;

  const updatedComment = await prisma.comment.update({
    where: { id: commentId },
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
      }
    }
  });

  const transformedComment = {
    id: updatedComment.id,
    body: updatedComment.body,
    isDeveloper: updatedComment.isDeveloper,
    isPinned: updatedComment.isPinned,
    author: {
      id: updatedComment.author.id,
      name: `${updatedComment.author.firstName} ${updatedComment.author.lastName}`,
      avatar: updatedComment.author.avatar,
      role: updatedComment.author.role
    },
    createdAt: updatedComment.createdAt,
    parentId: updatedComment.parentId
  };

  res.json({
    success: true,
    data: transformedComment
  });
}));

// DELETE /api/feedback/:feedbackId/comments/:commentId - Delete comment
router.delete('/:feedbackId/comments/:commentId', authenticateToken, asyncHandler(async (req, res) => {
  const { feedbackId, commentId } = req.params;
  const { userId, role } = req.user;

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { author: true }
  });

  if (!comment) {
    return res.status(404).json({
      success: false,
      message: 'Comment not found'
    });
  }

  // Check permissions
  const isAuthor = comment.authorId === userId;
  const isAdmin = role === 'ADMIN';

  if (!isAuthor && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this comment'
    });
  }

  await prisma.comment.delete({
    where: { id: commentId }
  });

  // Update comment count on feedback
  await prisma.feedback.update({
    where: { id: feedbackId },
    data: {
      commentCount: { decrement: 1 },
      developerResponseCount: comment.isDeveloper ? { decrement: 1 } : undefined
    }
  });

  res.json({
    success: true,
    message: 'Comment deleted successfully'
  });
}));

module.exports = router;
