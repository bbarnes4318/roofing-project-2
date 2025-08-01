# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Constitution & Engineering Standards
This document provides the essential, non-negotiable context for working on this application. Adhere to these principles for all tasks.

## 1. Development Commands

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

# Run tests
npm test
```

## 2. Core Technology Stack
- **Frontend**: React 18 (using .jsx files and react-scripts) with Tailwind CSS.
- **Backend**: Node.js with Express.js.
- **Database**: Digital Ocean PostgreSQL.
- **ORM**: Prisma. The single source of truth for all database interactions is `server/prisma/schema.prisma`.
- **Real-time**: Socket.io for live updates.
- **Deployment**: Vercel (frontend + serverless API).

## 3. The Database Mandate (CRITICAL)
PostgreSQL is the ONLY database. All data operations, queries, and logic must target the Digital Ocean PostgreSQL instance.

All traces of MongoDB must be purged. This includes connection strings, client libraries (like mongoose), environment variables, and any API logic that was designed for a NoSQL structure. This is a primary objective of any refactoring task.

## 4. The Core Architectural Pattern: Workflow Hierarchy
The entire application's logic revolves around a specific three-tier workflow structure. Always model your logic and data flow according to this hierarchy:

- **Phases**: The highest-level containers (e.g., LEAD, APPROVED, EXECUTION).
- **Sections**: Groups of tasks within a Phase (e.g., Initial Inspection, Contract & Permitting).
- **Line Items**: The individual, actionable tasks within a Section. These are the primary drivers of all automation.

## 5. Project Structure & Key File Map
```
/
├── src/                  # React frontend
│   ├── components/
│   │   ├── pages/        # Page components (Dashboard, Projects, etc.)
│   │   ├── common/       # Reusable components
│   │   └── ui/           # UI components
│   ├── services/
│   │   └── api.js        # API client with axios
│   └── App.jsx           # Main app component with routing
│
├── server/               # Express backend
│   ├── prisma/
│   │   └── schema.prisma # Database schema (Primary Source of Truth)
│   ├── routes/           # API route handlers (e.g., workflow.js, alerts.js)
│   ├── services/         # Business logic services
│   └── server.js         # Express server setup
│
└── api/                  # Vercel serverless function
    └── index.js          # Serverless API handler
```

## 6. Guiding Principles for All Code Edits
- **Data Flow is King**: The correct data flow is PostgreSQL -> Backend API -> Frontend UI. The UI must always be a reflection of the database state. Do not rely on temporary frontend state for core workflow logic.

- **Backend-Driven Automation**: All workflow automation (progressing to the next item, triggering alerts) must be handled by the backend logic in response to a database update. A frontend "check" event should trigger an API call that updates the database, which in turn triggers the subsequent logic.

- **Alerts Originate from Line Items**: The alert system is granular. An alert is tied to a specific line item and must be sent to the user group assigned to that specific line item.

- **Visuals Reflect State**: UI changes like strikethroughs are not just cosmetic. They must be rendered conditionally based on the isCompleted status of the corresponding item fetched from the database.

- **API Design**: Maintain a consistent RESTful response format: `{ success: boolean, data: any, message: string }`.

## 7. Important Implementation Details
- **Authentication**: The app currently uses mock authentication. Real auth endpoints exist but the frontend bypasses the login flow.

- **Data Compatibility**: Be aware that some API layers might still contain data transformation logic to support both MongoDB-style (_id) and Prisma (id) fields during the migration. The goal is to standardize on Prisma's id.

- **Mock Data**: Some endpoints may still return mock data. The primary task is to connect these to the live PostgreSQL database.


Project Briefing: Roofing Workflow Application

1. High-Level Summary
This is an AI-powered project management application for roofing contractors. Its core purpose is to automate the entire project lifecycle, from lead to completion, through a structured workflow. It handles tasks, communication, and alerts.

2. Core Technologies
Frontend: React with Tailwind CSS

Backend: Node.js with Express

Database: PostgreSQL on Digital Ocean (ONLY). The project has migrated away from MongoDB, and all operations must be pure PostgreSQL via the Prisma ORM.

3. Critical Architecture: The Workflow Hierarchy
The entire application logic is built on a non-negotiable, three-tier structure:

Phases: Top-level stages of a project (e.g., LEAD, EXECUTION).

Sections: Groups of related tasks within a phase (e.g., Contract & Permitting).

Line Items: The individual, actionable checklist items within a section. These are the triggers for all automation.

4. Current State & Primary Objective
The application is currently broken on some places. The connection between the frontend, backend, and the new PostgreSQL database is not always functioning correctly.

The primary objective is to fix the application so that it works as intended.

5. Key Dysfunctions to Address:
Workflow Automation is Broken: When a user checks off a "Line Item," the system does not automatically progress to the next item throughout the entire application. For example, when a line item is checked off, then it should save in system and every relevant field throughout the entire application should be updated - 100% of the time the 'line item' field should be updated everywhere. If the line items completes the section then the new section should also be updated and same goes for the phase if it is completed the new phase should update everywhere. This is not working. 

Alerts Are Not Firing: New alerts are not being generated for the newly active Line Item.

UI is Not Updating: Visual indicators (like strikethroughs on completed items) are not appearing.

6. Definition of Success
The application is considered fixed when a user can complete a Line Item, and the system automatically and seamlessly:

Updates the UI with a visual strikethrough.

Progresses the workflow to the next Line Item.

Generates a targeted alert for the new Line Item.

Persists all these changes correctly in the PostgreSQL database.

Displays a fully functional dashboard with all required sections functioning as intended.