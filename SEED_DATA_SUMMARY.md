# Database Seed Data Summary

## Overview
This document provides a comprehensive summary of the seed data created for the Kenstruction roofing project management application. The seed data includes realistic, complete data for all models in the PostgreSQL database, preserving the exact project phases, workflow steps, and line items as defined in the schema.

## Seed Data Structure

### 1. Users (5 records)
**Roles Created:**
- PROJECT_MANAGER (1): John Smith - Experienced project manager with 8 years in residential roofing
- FOREMAN (2): Maria Garcia and Robert Brown - Skilled foremen with safety and leadership expertise
- WORKER (1): David Johnson - Dedicated roofing specialist with 4 years experience
- MANAGER (1): Sarah Williams - Office administrator handling project coordination

**Fields Populated:**
- Complete profile information (name, email, phone, position, department, bio)
- Role-based permissions and security settings
- Professional information (skills, certifications, experience)
- Address and emergency contact details
- Notification preferences and account settings
- All users have password: `password123` (hashed with bcrypt)

### 2. Customers (15 records)
**Customer Types:**
- Single homeowners (8 customers)
- Couples/families (7 customers)

**Fields Populated:**
- Primary and secondary contact information (where applicable)
- Primary contact selection (PRIMARY for all customers)
- Realistic Colorado addresses (used as project names)
- Detailed notes about each customer's specific needs and preferences
- All customers located in Colorado cities (Denver, Boulder, Aurora, Littleton, etc.)

### 3. Projects (15 records)
**Project Types:**
- ROOF_REPLACEMENT (12 projects)
- SIDING_INSTALLATION (2 projects)
- WINDOW_REPLACEMENT (1 project)

**Fields Populated:**
- 5-digit project numbers (10000-99999)
- Project names using customer addresses
- Realistic financial data ($15k-$50k budgets)
- Timeline data (30-90 day durations)
- Project status distribution (PENDING, IN_PROGRESS, COMPLETED)
- Priority levels (LOW, MEDIUM, HIGH)
- Complete project manager assignments and contact information

### 4. Project Workflows (15 records)
**Workflow Configuration:**
- All workflows linked to their respective projects
- Workflow type: ROOFING
- Status: IN_PROGRESS
- Progress tracking with currentStepIndex and overallProgress
- Alert settings enabled with IN_APP and EMAIL methods
- Team assignments including project managers, foremen, and workers

### 5. Workflow Steps (435 records - 29 steps per project)
**Phase Distribution:**
- **LEAD Phase (4 steps):** Initial Contact, Lead Qualification, Appointment Scheduling, Lead Documentation
- **PROSPECT Phase (5 steps):** Site Visit, Project Assessment, Estimate Preparation, Proposal Development, Customer Presentation
- **PROSPECT NON-INSURANCE Phase (2 steps):** Write Estimate, Agreement Signing
- **APPROVED Phase (5 steps):** Contract Signing, Permit Application, Material Ordering, Crew Assignment, Pre-Construction Meeting
- **EXECUTION Phase (6 steps):** Site Preparation, Material Delivery, Roof Removal, Deck Inspection, Underlayment Installation, Shingle Installation
- **SUPPLEMENT Phase (3 steps):** Supplemental Work Identification, Change Order Processing, Additional Work Completion
- **COMPLETION Phase (4 steps):** Final Inspection, Customer Walkthrough, Project Documentation, Project Closeout

**Step Details:**
- Each step has realistic descriptions and responsible roles
- Scheduled start/end dates based on workflow timeline
- Completion status based on current step index
- Dependencies between steps (sequential progression)
- Alert configurations and notes

### 6. Workflow Subtasks (1,620 records - 4 subtasks per step)
**Subtask Structure:**
- Each workflow step has 4 detailed subtasks
- Subtasks are specific to their parent step and phase
- Realistic completion status (70% completion rate for completed steps)
- Detailed descriptions of each subtask activity
- Notes indicating completion status

**Example Subtasks by Phase:**
- **LEAD:** Receive initial inquiry, Verify contact details, Log lead in system
- **PROSPECT:** Conduct roof inspection, Take measurements, Document site conditions
- **EXECUTION:** Set up safety barriers, Prepare work area, Install materials
- **COMPLETION:** Conduct quality inspection, Take final photos, Complete documentation

### 7. Tasks (75-105 records - 3-7 tasks per project)
**Task Categories:**
- PLANNING, DESIGN, CONSTRUCTION, INSPECTION, DOCUMENTATION, COMMUNICATION, OTHER

**Task Details:**
- Realistic task titles (Site inspection, Material ordering, Safety setup, etc.)
- Assigned to various team members
- Due dates within project timeline
- Status distribution (TO_DO, IN_PROGRESS, DONE)
- Priority levels and estimated/actual hours
- Tags and notes for each task

### 8. Documents (30-75 records - 2-5 documents per project)
**Document Types:**
- BLUEPRINT, PERMIT, INVOICE, PHOTO, CONTRACT, REPORT, SPECIFICATION, CORRESPONDENCE, OTHER

**Document Details:**
- Realistic file names and URLs
- File sizes (500KB-2.5MB)
- Download counts and timestamps
- Tags and descriptions
- Uploaded by various team members

### 9. Notifications (5-15 records - 1-3 notifications per user)
**Notification Types:**
- TASK_ASSIGNED, TASK_COMPLETED, PROJECT_UPDATE, WORKFLOW_ALERT, SYSTEM_MESSAGE, REMINDER

**Notification Details:**
- Realistic titles and messages
- Action URLs linking to projects
- Read/unread status
- Action data with project information

## Data Relationships

### Primary Relationships:
1. **Customer → Project:** Each customer has exactly one project
2. **Project → Workflow:** Each project has exactly one workflow
3. **Workflow → WorkflowSteps:** Each workflow has 29 steps across 7 phases
4. **WorkflowStep → WorkflowSubTask:** Each step has 4 subtasks
5. **Project → Tasks:** Each project has 3-7 tasks
6. **Project → Documents:** Each project has 2-5 documents
7. **User → Assigned Tasks:** Users are assigned to various tasks
8. **User → Notifications:** Users receive relevant notifications

### Foreign Key Integrity:
- All relationships maintain referential integrity
- Cascade deletes properly configured
- Unique constraints respected (project numbers, user emails, etc.)

## Running the Seed Data

### Prerequisites:
1. PostgreSQL database running and accessible
2. Environment variables configured (DATABASE_URL)
3. Prisma client generated

### Commands:
```bash
# Navigate to server directory
cd server

# Install dependencies (if not already done)
npm install

# Generate Prisma client
npm run db:generate

# Run the seed script
npm run db:seed
```

### Expected Output:
```
🌱 Starting database seeding...
🧹 Clearing existing data...
✅ All data cleared successfully
👥 Creating users...
✅ Created 5 users
🏠 Creating customers...
✅ Created 15 customers
🏗️ Creating projects...
✅ Created 15 projects
📋 Creating project workflows...
✅ Created 15 workflows
📋 Creating workflow steps and subtasks...
✅ Created 405 workflow steps
📝 Creating tasks...
✅ Created 90 tasks
📄 Creating documents...
✅ Created 45 documents
🔔 Creating notifications...
✅ Created 15 notifications
🎉 Database seeding completed successfully!
```

## Data Validation

### Schema Compliance:
- All required fields populated
- Enum values match schema definitions
- Data types match schema specifications
- Unique constraints respected
- Foreign key relationships valid

### Frontend Compatibility:
- Project phases match UI color scheme
- Phase names consistent with frontend expectations
- Workflow step names align with application workflow
- User roles and permissions match frontend requirements

### Business Logic:
- Realistic project timelines and costs
- Appropriate task assignments based on user roles
- Logical workflow progression through phases
- Meaningful customer information and project details

## Phase Colors (Preserved from Frontend)
- **LEAD:** Blue (#0D6EFD)
- **PROSPECT:** Teal (#0B7285)
- **APPROVED:** Purple (#6F42C1)
- **EXECUTION:** Orange (#BA4E00)
- **SUPPLEMENT:** Pink (#E91E63)
- **COMPLETION:** Green (#198754)

## Summary Statistics
- **Total Records Created:** ~2,300+ records across all models
- **Users:** 5 (various roles)
- **Customers:** 15 (Colorado-based)
- **Projects:** 15 (residential roofing focus)
- **Workflows:** 15 (one per project)
- **Workflow Steps:** 405 (27 per project)
- **Workflow Subtasks:** 1,620 (4 per step)
- **Tasks:** 75-105 (3-7 per project)
- **Documents:** 30-75 (2-5 per project)
- **Notifications:** 5-15 (1-3 per user)

## Notes
- All data is realistic and appropriate for a residential roofing company
- Project phases and workflow steps are preserved exactly as defined in the schema
- Data relationships ensure proper application functionality
- Seed data provides a comprehensive foundation for testing and development
- All passwords are set to 'password123' for easy testing access 