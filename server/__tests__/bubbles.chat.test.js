const express = require('express');
const request = require('supertest');

// Mock auth to inject a user
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, _res, next) => { req.user = { id: 'test-user', firstName: 'Test', lastName: 'User' }; next(); }
}));

// Mock OpenAIService to emit a tool call for completing a line item
jest.mock('../services/OpenAIService', () => ({
  generateResponse: async (_message, { systemPrompt }) => ({
    content: JSON.stringify({ tool: 'mark_line_item_complete_and_notify', parameters: { lineItemName: 'Take site photos' } })
  }),
  generateSingleResponse: async (prompt) => ({ content: typeof prompt === 'string' ? 'Done.' : 'Done.' })
}));

// Mock prisma for user lookup
jest.mock('../config/prisma', () => ({
  prisma: {
    project: { findUnique: jest.fn(async ({ where }) => ({ id: where.id, projectName: 'Test Project', progress: 0 })) },
    user: { findUnique: jest.fn(async () => ({ id: 'some-user-id' })) }
  }
}));

// Spy on WorkflowActionService
jest.mock('../services/WorkflowActionService');
const WorkflowActionService = require('../services/WorkflowActionService');
WorkflowActionService.mockImplementation(() => ({
  markLineItemComplete: jest.fn(async (projectId, lineItemName) => ({ success: true, message: `Completed ${lineItemName} for ${projectId}` }))
}));

const bubblesRouter = require('../routes/bubbles');

describe('Bubbles chat route', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/bubbles', bubblesRouter);

  it('completes a task via tool call', async () => {
    const res = await request(app)
      .post('/api/bubbles/chat')
      .send({ message: 'Check off Take site photos', projectId: 'proj-1' })
      .expect(200);

    expect(res.body?.success).toBe(true);
    expect(res.body?.data?.response?.content).toBeTruthy();
  });
});