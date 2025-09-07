const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { asyncHandler, sendSuccess } = require('../middleware/errorHandler');

const prisma = new PrismaClient();
const router = express.Router();

// @desc    Get all calendar events
// @route   GET /api/calendar-events
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  const { startDate, endDate, eventType, projectId, organizerId } = req.query;
  let where = {};
  
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
      },
      {
        AND: [
          { startTime: { lte: new Date(startDate) } },
          { endTime: { gte: new Date(endDate) } }
        ]
      }
    ];
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
    attendees
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

  // Create event
  const event = await prisma.calendarEvent.create({
    data: {
      title,
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
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

  // Prepare update data
  const updateData = {
    title,
    description,
    startTime: startTime ? new Date(startTime) : undefined,
    endTime: endTime ? new Date(endTime) : undefined,
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

module.exports = router; 