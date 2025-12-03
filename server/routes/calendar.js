const express = require('express');
const { prisma } = require('../config/prisma');
const { asyncHandler, sendSuccess } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all calendar routes
router.use(authenticateToken);

// @desc    Get all calendar events
// @route   GET /api/calendar-events
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  console.log('📅 CALENDAR: GET /api/calendar-events - Request received');
  const { startDate, endDate, eventType, projectId, organizerId, view } = req.query;
  let where = {};
  
  // View Logic: Personal vs Team
  if (view === 'personal') {
    // Personal View: Events where user is attendee OR organizer
    where.OR = [
      { organizerId: req.user.id },
      { attendees: { some: { userId: req.user.id } } }
    ];
  }

  if (startDate && endDate) {
    const dateFilter = {
      OR: [
        {
          startTime: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        },
        {
          endTime: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        },
        {
          AND: [
            { startTime: { lte: new Date(startDate) } },
            { endTime: { gte: new Date(endDate) } }
          ]
        }
      ]
    };

    if (where.OR) {
      // If we already have an OR clause (from personal view), we need to combine them carefully
      where.AND = [
        { OR: where.OR },
        dateFilter
      ];
      delete where.OR; // Remove the top-level OR
    } else {
      where.OR = dateFilter.OR;
    }
  }
  
  if (eventType) {
    where.eventType = eventType.toUpperCase();
  }
  
  if (projectId) {
    where.projectId = projectId;
  }
  
  if (organizerId) {
    where.organizerId = organizerId;
  }
  
  const events = await prisma.calendarEvent.findMany({
    where,
    include: {
      organizer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      },
      project: {
        select: {
          id: true,
          projectNumber: true,
          projectName: true,
          status: true
        }
      },
      attendees: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true
            }
          }
        }
      }
    },
    orderBy: { startTime: 'asc' }
  });
  
  res.json({
    success: true,
    data: { events, count: events.length },
    message: 'Calendar events retrieved successfully'
  });
}));

// @desc    Get single calendar event
// @route   GET /api/calendar-events/:id
// @access  Private
router.get('/:id', asyncHandler(async (req, res, next) => {
  const event = await prisma.calendarEvent.findUnique({
    where: { id: req.params.id },
    include: {
      organizer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      },
      project: {
        select: {
          id: true,
          projectNumber: true,
          projectName: true,
          status: true
        }
      },
      attendees: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true
            }
          }
        }
      },
      childEvents: {
        include: {
          attendees: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          }
        }
      }
    }
  });
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Calendar event not found'
    });
  }
  
  res.json({
    success: true,
    data: { event },
    message: 'Calendar event retrieved successfully'
  });
}));

// @desc    Create calendar event
// @route   POST /api/calendar-events
// @access  Private
router.post('/', asyncHandler(async (req, res) => {
  console.log('📅 CALENDAR: POST /api/calendar-events - Request received');
  const {
    title,
    description,
    startTime,
    endTime,
    location,
    isAllDay,
    eventType,
    status,
    isRecurring,
    recurrenceRule,
    projectId,
    organizerId,
    attendees,
    timing,
    followUpTiming
  } = req.body;

  // Verify organizer exists
  const organizer = await prisma.user.findUnique({
    where: { id: organizerId }
  });

  if (!organizer) {
    return res.status(404).json({
      success: false,
      message: 'Organizer not found'
    });
  }

  // Verify project exists if provided
  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
  }

  // Validate and parse dates
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  
  // Check if dates are valid
  if (isNaN(startDate.getTime())) {
    return res.status(400).json({
      success: false,
      message: 'Invalid startTime provided'
    });
  }
  
  if (isNaN(endDate.getTime())) {
    return res.status(400).json({
      success: false,
      message: 'Invalid endTime provided'
    });
  }
  
  // Ensure endTime is after startTime
  if (endDate <= startDate) {
    return res.status(400).json({
      success: false,
      message: 'endTime must be after startTime'
    });
  }

  // Create event
  const event = await prisma.calendarEvent.create({
    data: {
      title: title && title.trim() ? title.trim() : 'Untitled Task',
      description,
      startTime: startDate,
      endTime: endDate,
      location,
      isAllDay: isAllDay || false,
      eventType: eventType ? eventType.toUpperCase() : 'MEETING',
      status: status ? status.toUpperCase() : 'CONFIRMED',
      isRecurring: isRecurring || false,
      recurrenceRule,
      projectId,
      organizerId,
      attendees: attendees ? {
        create: attendees.map(attendee => ({
          userId: attendee.userId,
          status: attendee.status ? attendee.status.toUpperCase() : 'REQUIRED',
          response: attendee.response ? attendee.response.toUpperCase() : 'NO_RESPONSE'
        }))
      } : undefined
    },
    include: {
      organizer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      },
      project: {
        select: {
          id: true,
          projectNumber: true,
          projectName: true,
          status: true
        }
      },
      attendees: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true
            }
          }
        }
      }
    }
  });
  
  // Create follow-up if timing data is provided and user has follow-up settings enabled
  if (timing && (eventType === 'DEADLINE' || eventType === 'REMINDER')) {
    try {
      const FollowUpService = require('../services/followUpService');
      
      // Get the assigned user (first attendee or organizer)
      const assignedUserId = attendees && attendees.length > 0 ? attendees[0].userId : organizerId;
      
      // Check if user has follow-up settings enabled
      const userSettings = await prisma.followUpSettings.findUnique({
        where: { userId: assignedUserId }
      });

      if (userSettings && userSettings.isEnabled) {
        // Use custom follow-up timing if provided, otherwise use user's default settings
        const followUpDays = followUpTiming ? followUpTiming.days : userSettings.taskFollowUpDays;
        const followUpHours = followUpTiming ? followUpTiming.hours : userSettings.taskFollowUpHours;
        const followUpMinutes = followUpTiming ? followUpTiming.minutes : userSettings.taskFollowUpMinutes;
        
        await FollowUpService.createFollowUp({
          originalItemId: event.id,
          originalItemType: eventType === 'DEADLINE' ? 'TASK' : 'REMINDER',
          projectId: event.projectId,
          assignedToId: assignedUserId,
          followUpDays,
          followUpHours,
          followUpMinutes,
          followUpMessage: userSettings.followUpMessage,
          metadata: {
            eventTitle: event.title,
            eventDescription: event.description,
            eventType: event.eventType,
            eventStartTime: event.startTime
          }
        });
      }
    } catch (error) {
      console.error('Error creating follow-up for calendar event:', error);
      // Don't fail the event creation if follow-up creation fails
    }
  }

  // Send email notifications to attendees
  if (attendees && attendees.length > 0) {
    try {
      const EmailService = require('../services/EmailService');
      const attendeeIds = attendees.map(a => a.userId);
      
      // Fetch attendee details to get emails
      const attendeeUsers = await prisma.user.findMany({
        where: { id: { in: attendeeIds } },
        select: { id: true, email: true, firstName: true }
      });

      // Send email to each attendee
      const emailPromises = attendeeUsers.map(user => {
        if (!user.email) return Promise.resolve();

        const emailContent = `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #2563eb;">New Calendar Event Assigned</h2>
            <p>Hello ${user.firstName || 'User'},</p>
            <p>You have been added to a new calendar event:</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">${title}</h3>
              <p><strong>Date:</strong> ${startDate.toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${startDate.toLocaleTimeString()} - ${endDate.toLocaleTimeString()}</p>
              ${location ? `<p><strong>Location:</strong> ${location}</p>` : ''}
              ${description ? `<p><strong>Description:</strong><br>${description}</p>` : ''}
            </div>
            <p>Please check your calendar for more details.</p>
          </div>
        `;

        return EmailService.sendEmail({
          to: user.email,
          subject: `New Event: ${title}`,
          html: emailContent,
          tags: { type: 'calendar_invite', eventId: event.id }
        });
      });

      await Promise.all(emailPromises);
      console.log(`📧 Sent calendar notifications to ${attendeeUsers.length} attendees`);

    } catch (error) {
      console.error('❌ Error sending calendar notifications:', error);
      // Don't fail the request if email sending fails
    }
  }
  
  res.status(201).json({
    success: true,
    data: { event },
    message: 'Calendar event created successfully'
  });
}));

// @desc    Update calendar event
// @route   PUT /api/calendar-events/:id
// @access  Private
router.put('/:id', asyncHandler(async (req, res, next) => {
  const eventId = req.params.id;
  const {
    title,
    description,
    startTime,
    endTime,
    location,
    isAllDay,
    eventType,
    status,
    isRecurring,
    recurrenceRule,
    projectId,
    attendees
  } = req.body;

  // Check if event exists
  const existingEvent = await prisma.calendarEvent.findUnique({
    where: { id: eventId }
  });

  if (!existingEvent) {
    return res.status(404).json({
      success: false,
      message: 'Calendar event not found'
    });
  }

  // Verify project exists if provided
  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
  }

  // Validate dates if provided
  let startDate, endDate;
  
  if (startTime) {
    startDate = new Date(startTime);
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startTime provided'
      });
    }
  }
  
  if (endTime) {
    endDate = new Date(endTime);
    if (isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid endTime provided'
      });
    }
  }
  
  // If both dates are provided, ensure endTime is after startTime
  if (startDate && endDate && endDate <= startDate) {
    return res.status(400).json({
      success: false,
      message: 'endTime must be after startTime'
    });
  }

  // Prepare update data
  const updateData = {
    title,
    description,
    startTime: startDate,
    endTime: endDate,
    location,
    isAllDay,
    eventType: eventType ? eventType.toUpperCase() : undefined,
    status: status ? status.toUpperCase() : undefined,
    isRecurring,
    recurrenceRule,
    projectId
  };

  // Remove undefined values
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) {
      delete updateData[key];
    }
  });

  // Update event
  const event = await prisma.calendarEvent.update({
    where: { id: eventId },
    data: updateData,
    include: {
      organizer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      },
      project: {
        select: {
          id: true,
          projectNumber: true,
          projectName: true,
          status: true
        }
      },
      attendees: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true
            }
          }
        }
      }
    }
  });
  
  res.json({
    success: true,
    data: { event },
    message: 'Calendar event updated successfully'
  });
}));

// @desc    Delete ALL calendar events (bulk delete for clearing mock data)
// @route   DELETE /api/calendar
// @access  Private
router.delete('/', asyncHandler(async (req, res, next) => {
  const result = await prisma.calendarEvent.deleteMany({});

  res.json({
    success: true,
    message: `All calendar events deleted successfully (${result.count} events removed)`,
    data: { count: result.count }
  });
}));

// @desc    Delete calendar event
// @route   DELETE /api/calendar-events/:id
// @access  Private
router.delete('/:id', asyncHandler(async (req, res, next) => {
  const event = await prisma.calendarEvent.findUnique({
    where: { id: req.params.id }
  });
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Calendar event not found'
    });
  }
  
  await prisma.calendarEvent.delete({
    where: { id: req.params.id }
  });
  
  res.json({
    success: true,
    message: 'Calendar event deleted successfully'
  });
}));

// @desc    Get events by project
// @route   GET /api/calendar-events/project/:projectId
// @access  Private
router.get('/project/:projectId', asyncHandler(async (req, res, next) => {
  const { projectId } = req.params;
  const { startDate, endDate, eventType } = req.query;

  let where = { projectId };

  if (startDate && endDate) {
    where.OR = [
      {
        startTime: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      {
        endTime: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      }
    ];
  }

  if (eventType) {
    where.eventType = eventType.toUpperCase();
  }

  const events = await prisma.calendarEvent.findMany({
    where,
    include: {
      organizer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      },
      attendees: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true
            }
          }
        }
      }
    },
    orderBy: { startTime: 'asc' }
  });

  res.json({
    success: true,
    data: { events },
    message: 'Project calendar events retrieved successfully'
  });
}));

// @desc    Get calendar events by project number (for AI assistant)
// @route   GET /api/calendar/project-number/:projectNumber
// @access  Private
router.get('/project-number/:projectNumber', asyncHandler(async (req, res, next) => {
  const { projectNumber } = req.params;
  const { 
    start,
    end,
    eventType,
    organizerId,
    limit = 50
  } = req.query;

  // First find the project by project number
  const project = await prisma.project.findFirst({
    where: { projectNumber: projectNumber },
    select: {
      id: true,
      projectNumber: true,
      projectName: true,
      status: true,
      progress: true
    }
  });

  if (!project) {
    throw new AppError('Project not found', 404);
  }

  const projectId = project.id;
  
  // Build filter conditions
  let where = { projectId };
  
  if (eventType) {
    where.eventType = eventType.toUpperCase();
  }
  
  if (organizerId) {
    where.organizerId = organizerId;
  }
  
  if (start && end) {
    where.AND = [
      { startTime: { gte: new Date(start) } },
      { endTime: { lte: new Date(end) } }
    ];
  } else if (start) {
    where.startTime = { gte: new Date(start) };
  } else if (end) {
    where.endTime = { lte: new Date(end) };
  }
  
  const events = await prisma.calendarEvent.findMany({
    where,
    include: {
      organizer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      },
      project: {
        select: {
          id: true,
          projectNumber: true,
          projectName: true,
          status: true
        }
      },
      attendees: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true
            }
          }
        }
      }
    },
    orderBy: { startTime: 'asc' },
    take: parseInt(limit)
  });

  const response = {
    project: {
      id: project.id,
      projectNumber: project.projectNumber,
      projectName: project.projectName,
      status: project.status,
      progress: project.progress
    },
    events
  };

  res.json({
    success: true,
    data: response,
    message: `Found ${events.length} calendar events for project #${projectNumber}`
  });
}));

// @desc    Get comments for a calendar event (reminder)
// @route   GET /api/calendar-events/:id/comments
// @access  Private
router.get('/:id/comments', asyncHandler(async (req, res) => {
  const eventId = req.params.id;
  
  // Check if event exists
  const event = await prisma.calendarEvent.findUnique({
    where: { id: eventId }
  });
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Calendar event not found'
    });
  }
  
  // Get all comments for this event
  const comments = await prisma.calendarEventComment.findMany({
    where: { eventId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  res.json({
    success: true,
    data: comments,
    message: 'Comments retrieved successfully'
  });
}));

// @desc    Add a comment to a calendar event (reminder)
// @route   POST /api/calendar-events/:id/comments
// @access  Private
router.post('/:id/comments', asyncHandler(async (req, res) => {
  const eventId = req.params.id;
  const { content } = req.body;
  const userId = req.user?.id || req.body.userId; // Get from auth middleware or request body
  
  // Validate input
  if (!content || !content.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Comment content is required'
    });
  }
  
  // Check if event exists
  const event = await prisma.calendarEvent.findUnique({
    where: { id: eventId }
  });
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Calendar event not found'
    });
  }
  
  // Create the comment
  const comment = await prisma.calendarEventComment.create({
    data: {
      content: content.trim(),
      eventId,
      userId
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      }
    }
  });
  
  res.status(201).json({
    success: true,
    data: comment,
    message: 'Comment added successfully'
  });
}));

// @desc    Update a comment on a calendar event
// @route   PUT /api/calendar-events/:eventId/comments/:commentId
// @access  Private
router.put('/:eventId/comments/:commentId', asyncHandler(async (req, res) => {
  const { eventId, commentId } = req.params;
  const { content } = req.body;
  const userId = req.user?.id;
  
  // Validate input
  if (!content || !content.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Comment content is required'
    });
  }
  
  // Check if comment exists and belongs to the user
  const existingComment = await prisma.calendarEventComment.findFirst({
    where: {
      id: commentId,
      eventId,
      userId
    }
  });
  
  if (!existingComment) {
    return res.status(404).json({
      success: false,
      message: 'Comment not found or you do not have permission to edit it'
    });
  }
  
  // Update the comment
  const comment = await prisma.calendarEventComment.update({
    where: { id: commentId },
    data: { content: content.trim() },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      }
    }
  });
  
  res.json({
    success: true,
    data: comment,
    message: 'Comment updated successfully'
  });
}));

// @desc    Delete a comment from a calendar event
// @route   DELETE /api/calendar-events/:eventId/comments/:commentId
// @access  Private
router.delete('/:eventId/comments/:commentId', asyncHandler(async (req, res) => {
  const { eventId, commentId } = req.params;
  const userId = req.user?.id;
  
  // Check if comment exists and belongs to the user
  const existingComment = await prisma.calendarEventComment.findFirst({
    where: {
      id: commentId,
      eventId,
      userId
    }
  });
  
  if (!existingComment) {
    return res.status(404).json({
      success: false,
      message: 'Comment not found or you do not have permission to delete it'
    });
  }
  
  // Delete the comment
  await prisma.calendarEventComment.delete({
    where: { id: commentId }
  });
  
  res.json({
    success: true,
    message: 'Comment deleted successfully'
  });
}));

module.exports = router;