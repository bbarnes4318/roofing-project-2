# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
AI-powered project management application for roofing contractors that automates the entire project lifecycle through a structured workflow system, handling tasks, communication, and alerts.

## Development Commands

### Frontend (React)
```bash
# Install dependencies
npm install

# Run development server (port 3000)
npm start

# Build for production
npm build

# Run tests
npm test
```

### Backend (Express/Prisma)
```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Run development server with nodemon (port 5000)
npm run dev

# Run production server
npm start

# Database operations
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Run migrations
npm run db:seed      # Seed database with initial data
npm run db:studio    # Open Prisma Studio GUI

# Utility scripts
npm run seed         # Run seedData.js
npm run backfill-workflows  # Backfill workflow data

# Run tests
npm test
```

## Core Technology Stack
- **Frontend**: React 18 with Tailwind CSS (using .jsx files)
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL on Digital Ocean (ONLY - no MongoDB)
- **ORM**: Prisma (`server/prisma/schema.prisma` is the single source of truth)
- **Real-time**: Socket.io for live updates
- **Authentication**: JWT-based (currently uses mock auth, real endpoints exist but frontend bypasses login)
- **API Client**: Axios for HTTP requests
- **Query Management**: TanStack React Query for data fetching and caching

## Critical Architecture: Workflow Hierarchy

The entire application logic is built on a three-tier workflow structure:

1. **Phases**: Top-level project stages (LEAD, APPROVED, EXECUTION, etc.)
2. **Sections**: Groups of related tasks within a phase (e.g., Initial Inspection, Contract & Permitting)
3. **Line Items**: Individual actionable tasks that trigger all automation

### Workflow Automation Flow
When a line item is checked off:
1. Backend updates PostgreSQL database
2. System progresses to next active line item
3. Alerts generate for newly active item
4. UI updates with visual indicators (strikethroughs)
5. All related fields update application-wide

## Database Schema Models
Key Prisma models (30+ total):
- **User**: System users with roles and permissions
- **Customer**: Client information
- **Project**: Core project entity
- **ProjectWorkflow**: Workflow instances for projects
- **WorkflowPhase/Section/LineItem**: Three-tier workflow structure
- **WorkflowAlert**: Alert system tied to line items
- **Task**: Individual tasks with dependencies
- **CompletedWorkflowItem**: Tracks completed workflow items

## API Architecture

### Response Format
All APIs maintain consistent RESTful response:
```javascript
{
  success: boolean,
  data: any,
  message: string
}
```

### Key API Routes
- `/api/auth/*` - Authentication endpoints
- `/api/projects/*` - Project CRUD operations
- `/api/workflow/*` - Workflow automation endpoints
- `/api/alerts/*` - Alert management
- `/api/tasks/*` - Task operations
- `/api/customers/*` - Customer management
- `/api/users/*` - User management
- `/api/roles/*` - Role assignment

### WebSocket Events
Real-time updates via Socket.io:
- `workflow:updated` - Workflow state changes
- `alert:created` - New alert notifications
- `task:completed` - Task completion events
- `project:updated` - Project modifications

## Project Structure
```
/
├── src/                        # React frontend
│   ├── components/
│   │   ├── pages/             # Page components
│   │   ├── common/            # Reusable components
│   │   └── ui/                # UI components
│   ├── services/
│   │   ├── api.js             # Axios API client
│   │   ├── workflowService.js # Workflow business logic
│   │   └── socket.js          # Socket.io client
│   ├── hooks/                 # Custom React hooks
│   └── App.jsx                # Main app with routing
│
├── server/                    # Express backend
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema (source of truth)
│   │   └── migrations/        # Database migrations
│   ├── routes/                # API route handlers
│   ├── services/              # Business logic services
│   │   ├── WorkflowProgressionService.js
│   │   ├── AlertGenerationService.js
│   │   └── ProjectInitializationService.js
│   ├── middleware/            # Express middleware
│   └── server.js              # Express server setup
│
└── api/                       # Vercel serverless function
    └── index.js               # Serverless API handler
```

## Environment Variables
Required in `.env`:
```
DATABASE_URL=postgresql://...     # Digital Ocean PostgreSQL
JWT_SECRET=...                     # JWT authentication
PORT=5000                         # Backend port
REACT_APP_API_URL=http://localhost:5000/api
```

## Known Issues & Migration Status

### Current Dysfunctions
1. **Workflow Automation**: Line item completion doesn't always trigger progression
2. **Alert Generation**: New alerts not firing for active line items
3. **UI Updates**: Visual indicators (strikethroughs) not updating consistently
4. **Data Compatibility**: Some APIs still transform between MongoDB (_id) and Prisma (id) formats

### Migration Notes
- PostgreSQL is the ONLY database (purge all MongoDB references)
- Some endpoints may return mock data - connect to live PostgreSQL
- Frontend bypasses real authentication flow
- Goal: Standardize on Prisma's `id` field format

## Testing Workflow Functionality
To verify workflow automation:
1. Complete a line item via checkbox
2. Verify database update in Prisma Studio
3. Check if next line item becomes active
4. Confirm alert generation for new active item
5. Validate UI strikethrough appears

## Performance Considerations
- Database has performance indexes on frequently queried fields
- Use React Query for client-side caching
- Socket.io for real-time updates (avoid polling)
- Compression middleware enabled on backend

## Security Notes
- JWT tokens for authentication
- Rate limiting implemented on API endpoints
- XSS protection via xss-clean middleware
- Helmet.js for security headers
- Input validation with express-validator