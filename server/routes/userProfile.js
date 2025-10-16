const express = require('express');
const { prisma } = require('../config/prisma');
const { authenticateToken } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

// GET /api/users/:userId/profile - Get user profile with gamification data
router.get('/:userId/profile', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatar: true,
      role: true
    }
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Get or create user profile
  let userProfile = await prisma.userProfile.findUnique({
    where: { userId },
    include: {
      user: {
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

  if (!userProfile) {
    userProfile = await prisma.userProfile.create({
      data: {
        userId,
        points: 0,
        level: 1,
        streak: 0
      },
      include: {
        user: {
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
  }

  // Get user badges
  const userBadges = await prisma.userBadge.findMany({
    where: { userId },
    include: {
      badge: true
    },
    orderBy: { createdAt: 'desc' }
  });

  // Get recent activity (last 10 activities)
  const recentActivity = await prisma.feedback.findMany({
    where: { authorId: userId },
    select: {
      id: true,
      title: true,
      type: true,
      createdAt: true,
      voteCount: true,
      commentCount: true
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  // Calculate level based on points
  const level = Math.floor(userProfile.points / 100) + 1;
  const nextLevelPoints = level * 100;
  const progressPercentage = ((userProfile.points % 100) / 100) * 100;

  const transformedProfile = {
    id: userProfile.id,
    userId: userProfile.userId,
    points: userProfile.points,
    level,
    nextLevelPoints,
    progressPercentage,
    streak: userProfile.streak,
    lastActivityDate: userProfile.lastActivityDate,
    user: {
      id: userProfile.user.id,
      name: `${userProfile.user.firstName} ${userProfile.user.lastName}`,
      avatar: userProfile.user.avatar,
      role: userProfile.user.role
    },
    badges: userBadges.map(ub => ({
      id: ub.badge.id,
      code: ub.badge.code,
      name: ub.badge.name,
      description: ub.badge.description,
      icon: ub.badge.icon,
      category: ub.badge.category,
      points: ub.badge.points,
      awardedAt: ub.createdAt
    })),
    recentActivity: recentActivity.map(activity => ({
      id: activity.id,
      title: activity.title,
      type: activity.type,
      points: 5, // Base points for creating feedback
      timestamp: activity.createdAt,
      description: `Submitted ${activity.type.toLowerCase()}`
    }))
  };

  res.json({
    success: true,
    data: transformedProfile
  });
}));

// GET /api/leaderboard/:timeframe - Get leaderboard
router.get('/leaderboard/:timeframe', asyncHandler(async (req, res) => {
  const { timeframe } = req.params;

  let dateFilter = {};
  const now = new Date();

  switch (timeframe) {
    case 'weekly':
      dateFilter = {
        gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      };
      break;
    case 'monthly':
      dateFilter = {
        gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      };
      break;
    case 'all':
    default:
      dateFilter = {};
      break;
  }

  const leaderboard = await prisma.userProfile.findMany({
    where: {
      lastActivityDate: dateFilter
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true
        }
      },
      userBadges: {
        include: {
          badge: true
        }
      }
    },
    orderBy: { points: 'desc' },
    take: 50
  });

  const transformedLeaderboard = leaderboard.map((profile, index) => ({
    id: profile.id,
    rank: index + 1,
    name: `${profile.user.firstName} ${profile.user.lastName}`,
    avatar: profile.user.avatar,
    points: profile.points,
    level: Math.floor(profile.points / 100) + 1,
    badges: profile.userBadges.length,
    streak: profile.streak,
    lastActivity: profile.lastActivityDate
  }));

  res.json({
    success: true,
    data: transformedLeaderboard
  });
}));

// GET /api/notifications/:userId - Get user notifications
router.get('/:userId/notifications', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const notifications = await prisma.notification.findMany({
    where: { recipientId: userId },
    orderBy: { createdAt: 'desc' },
    skip,
    take
  });

  const transformedNotifications = notifications.map(notification => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    read: notification.read,
    createdAt: notification.createdAt,
    data: notification.data
  }));

  res.json({
    success: true,
    data: transformedNotifications
  });
}));

// PATCH /api/notifications/:notificationId/read - Mark notification as read
router.patch('/notifications/:notificationId/read', authenticateToken, asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true }
  });

  res.json({
    success: true,
    message: 'Notification marked as read'
  });
}));

// PATCH /api/notifications/:userId/read-all - Mark all notifications as read
router.patch('/:userId/notifications/read-all', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.params;

  await prisma.notification.updateMany({
    where: { recipientId: userId },
    data: { read: true }
  });

  res.json({
    success: true,
    message: 'All notifications marked as read'
  });
}));

module.exports = router;
