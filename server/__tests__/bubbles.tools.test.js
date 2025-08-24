const express = require('express');
const request = require('supertest');

// Mock auth to inject a user
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, _res, next) => { req.user = { id: 'test-user', firstName: 'Test', lastName: 'User' }; next(); }
}));

// Mock OpenAIService; we'll set return values inside each test
jest.mock('../services/OpenAIService', () => ({
  generateResponse: jest.fn(),
  generateSingleResponse: jest.fn(async () => ({ content: 'Done.' }))
}));

// Mock prisma for project and user lookup
jest.mock('../config/prisma', () => ({
  prisma: {
    project: { findUnique: jest.fn(async ({ where }) => ({ id: where.id, projectName: 'Test Project', status: 'ACTIVE', progress: 0 })) },
    user: { findUnique: jest.fn(async ({ where }) => (where.email ? { id: 'assignee-user-id', email: where.email } : { id: where.id })) }
  }
}));

// Mock WorkflowActionService class
jest.mock('../services/WorkflowActionService', () => {
  return jest.fn().mockImplementation(() => ({
    markLineItemComplete: jest.fn(async (projectId, lineItemName) => ({ success: true, message: `Completed ${lineItemName} for ${projectId}` })),
    getIncompleteItemsInPhase: jest.fn(async (_projectId, phaseName) => ([{ itemName: 'Upload site photos', sectionName: 'Photos', phaseName }])),
    findBlockingTask: jest.fn(async (_projectId, phaseName) => ({ itemName: 'Customer signature on estimate', phaseName })),
    canAdvancePhase: jest.fn(async (_projectId, phaseName) => ({ ready: false, message: `There are 1 incomplete tasks in ${phaseName}. Blocker: "Upload site photos".` })),
    reassignTask: jest.fn(async (lineItemName, newUserId, projectId) => ({ success: true, message: `Reassigned alert for "${lineItemName}" to ${newUserId} on ${projectId}.` }))
  }));
});

const bubblesRouter = require('../routes/bubbles');

describe('Bubbles tool-call routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/bubbles', bubblesRouter);

  const OpenAIService = require('../services/OpenAIService');

  test('mark_line_item_complete_and_notify', async () => {
    const toolCall = { tool: 'mark_line_item_complete_and_notify', parameters: { lineItemName: 'Take site photos' } };
    OpenAIService.generateResponse.mockResolvedValueOnce({ content: JSON.stringify(toolCall) });
    const res = await request(app)
      .post('/api/bubbles/chat')
      .send({ message: 'complete it', projectId: 'proj-1' })
      .expect(200);
    const content = res.body?.data?.response?.content || res.body?.response?.content;
    expect(typeof content).toBe('string');
  });

  test('get_incomplete_items_in_phase', async () => {
    const toolCall = { tool: 'get_incomplete_items_in_phase', parameters: { phaseName: 'Prospect' } };
    OpenAIService.generateResponse.mockResolvedValueOnce({ content: JSON.stringify(toolCall) });
    const res = await request(app)
      .post('/api/bubbles/chat')
      .send({ message: 'what is left', projectId: 'proj-1' })
      .expect(200);
    const content = res.body?.data?.response?.content || res.body?.response?.content;
    expect(typeof content).toBe('string');
  });

  test('find_blocking_task', async () => {
    const toolCall = { tool: 'find_blocking_task', parameters: { phaseName: 'Prospect' } };
    OpenAIService.generateResponse.mockResolvedValueOnce({ content: JSON.stringify(toolCall) });
    const res = await request(app)
      .post('/api/bubbles/chat')
      .send({ message: 'what is blocking', projectId: 'proj-1' })
      .expect(200);
    const content = res.body?.data?.response?.content || res.body?.response?.content;
    expect(typeof content).toBe('string');
  });

  test('check_phase_readiness', async () => {
    const toolCall = { tool: 'check_phase_readiness', parameters: { phaseName: 'Prospect' } };
    OpenAIService.generateResponse.mockResolvedValueOnce({ content: JSON.stringify(toolCall) });
    const res = await request(app)
      .post('/api/bubbles/chat')
      .send({ message: 'can we advance', projectId: 'proj-1' })
      .expect(200);
    const content = res.body?.data?.response?.content || res.body?.response?.content;
    expect(typeof content).toBe('string');
  });

  test('reassign_task', async () => {
    const toolCall = { tool: 'reassign_task', parameters: { lineItemName: 'Inspection', newUserEmail: 'john@example.com' } };
    OpenAIService.generateResponse.mockResolvedValueOnce({ content: JSON.stringify(toolCall) });
    const res = await request(app)
      .post('/api/bubbles/chat')
      .send({ message: 'reassign', projectId: 'proj-1' })
      .expect(200);
    const content = res.body?.data?.response?.content || res.body?.response?.content;
    expect(typeof content).toBe('string');
  });

  test('answer_company_question', async () => {
    const toolCall = { tool: 'answer_company_question', parameters: { question: 'What are the phases?' } };
    OpenAIService.generateResponse.mockResolvedValueOnce({ content: JSON.stringify(toolCall) });
    const res = await request(app)
      .post('/api/bubbles/chat')
      .send({ message: 'kb question', projectId: 'proj-1' })
      .expect(200);
    const content = res.body?.data?.response?.content || res.body?.response?.content;
    expect(typeof content).toBe('string');
  });
});


