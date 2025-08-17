# Dashboard Component Field Mapping Report

## Dashboard Sections Overview

The dashboard has 4 main sections identified by `data-section` attributes:

1. **Project Phases Section** (`data-section="project-phases"`)
2. **Project Messages Section** (`data-section="project-messages"`)  
3. **Current Alerts Section** (`data-section="current-alerts"`)
4. **Project Cubes Section** (`data-section="project-cubes"`)

---

## 1. Project Phases Section
**Location:** `DashboardPage.jsx:1715`  
**Component:** Built into DashboardPage  
**Data Source:** Projects API + Workflow States

### Connected Fields:
- **Project Data:**
  - `project.id` - Project identifier
  - `project.name` - Project name
  - `project.projectNumber` - Project number
  - `project.phase` - Current project phase
  - `project.status` - Project status
  - `project.progress` - Completion percentage

- **Workflow States (from useWorkflowStates hook):**
  - `getPhaseForProject(project)` - Current phase name
  - `getPhaseColorForProject(project)` - Phase color
  - `getPhaseInitialForProject(project)` - Phase initial letter
  - `getProgressForProject(project)` - Progress percentage

- **API Endpoint:** `/api/projects`
- **Hook:** `useProjects()`

---

## 2. Project Messages Section  
**Location:** `DashboardPage.jsx:2349`  
**Component:** `ProjectMessagesCard`  
**Data Source:** Activities/Messages + Projects API

### Connected Fields:

#### Activity/Message Object:
- `activity.id` - Unique message ID
- `activity.projectId` - Associated project ID
- `activity.projectName` - Project name
- `activity.projectNumber` - Project number
- `activity.type` - Message type (project_update, material_delivery, etc.)
- `activity.subject` - Message subject
- `activity.description` - Message content
- `activity.user` - Message author
- `activity.timestamp` - Message timestamp (ISO string)
- `activity.priority` - Priority level (low, medium, high)
- `activity.metadata` - Additional metadata object
  - `metadata.projectPhase` - Project phase
  - `metadata.projectValue` - Project value
  - `metadata.assignedTo` - Assigned user

#### Project Data (merged):
- `project.id` - Project identifier
- `project.name` - Project name
- `project.customer` - Customer information

### ProjectMessagesCard Component Fields:
- **Props:**
  - `activity` - The message/activity object
  - `onProjectSelect` - Selection handler
  - `projects` - Projects array
  - `colorMode` - Color theme
  - `useRealData` - Whether to use real API data

- **Real Data Integration:**
  - Uses `useProjectMessages(projectId)` hook
  - `projectMessagesData.data` - Array of real messages
  - `messagesLoading` - Loading state
  - `messagesError` - Error state

- **API Endpoints:** 
  - `/api/project-messages` (requires auth)
  - Generated from projects if no real data

---

## 3. Current Alerts Section
**Location:** `DashboardPage.jsx:2686`  
**Component:** Built into DashboardPage  
**Data Source:** Alerts API

### Connected Fields:

#### Alert Object (from API):
- `alert._id` - MongoDB-style ID  
- `alert.id` - Prisma ID (CUID)
- `alert.type` - Alert type (WORKFLOW_TASK, OVERDUE, etc.)
- `alert.title` - Alert title
- `alert.message` - Alert description
- `alert.stepName` - Workflow step name
- `alert.priority` - Priority level (Medium, High, etc.)
- `alert.status` - Alert status (ACTIVE, PENDING, etc.) ✅ **Fixed**
- `alert.projectId` - Associated project ID ✅ **Fixed**
- `alert.isRead` - Read status boolean
- `alert.read` - Duplicate read flag
- `alert.createdAt` - Creation timestamp
- `alert.dueDate` - Due date
- `alert.lineItemId` - Associated line item ID
- `alert.section` - Workflow section
- `alert.lineItem` - Line item name

#### Related Project Data:
- `alert.relatedProject._id` - Project ID
- `alert.relatedProject.projectName` - Project name
- `alert.relatedProject.projectNumber` - Project number
- `alert.relatedProject.name` - Customer name

#### Metadata Object:
- `alert.metadata.stepName` - Step name
- `alert.metadata.cleanTaskName` - Clean task name
- `alert.metadata.projectId` - Project ID
- `alert.metadata.projectName` - Project name
- `alert.metadata.projectNumber` - Project number
- `alert.metadata.customerName` - Customer name
- `alert.metadata.phase` - Project phase
- `alert.metadata.section` - Workflow section
- `alert.metadata.lineItem` - Line item name
- `alert.metadata.lineItemId` - Line item ID

- **API Endpoint:** `/api/alerts`
- **Hook:** `useWorkflowAlerts()`

---

## 4. Project Cubes Section
**Location:** `DashboardPage.jsx:3267`  
**Component:** `ProjectCubes`  
**Data Source:** Projects API + Workflow States

### Connected Fields:

#### Project Object:
- `project.id` - Project identifier
- `project.name` - Project name
- `project.projectNumber` - Project number
- `project.customer` - Customer object
  - `customer.primaryName` - Customer name
  - `customer.email` - Customer email
  - `customer.phone` - Customer phone
  - `customer.address` - Customer address
- `project.estimateValue` - Project value
- `project.status` - Project status
- `project.phase` - Current phase
- `project.progress` - Progress percentage

#### Workflow State Integration:
Uses `useWorkflowStates(projects)` hook:
- `getWorkflowState(project)` - Complete workflow state
- `getPhaseForProject(project)` - Current phase
- `getPhaseColorForProject(project)` - Phase color
- `getPhaseInitialForProject(project)` - Phase initial
- `getProgressForProject(project)` - Progress percentage

#### Component Props:
- `projects` - Array of project objects
- `onProjectSelect` - Project selection handler
- `colorMode` - Color theme setting

#### State Management:
- `expandedCustomers` - Customer info expansion state
- `expandedProgress` - Progress section expansion state
- `currentPage` - Pagination state
- `projectsPerPage` - Items per page (6)

- **API Endpoint:** `/api/projects`
- **Hook:** `useProjects()`

---

## API Endpoints Summary

| Section | Endpoint | Auth Required | Status |
|---------|----------|---------------|---------|
| Project Phases | `/api/projects` | No | ✅ Working |
| Project Messages | `/api/project-messages` | Yes | ⚠️ Auth Required |
| Current Alerts | `/api/alerts` | No | ✅ Working |
| Project Cubes | `/api/projects` | No | ✅ Working |

---

## Key Hooks Used

1. **`useProjects()`** - Fetches all projects data
2. **`useWorkflowAlerts()`** - Fetches alerts data  
3. **`useProjectMessages(projectId)`** - Fetches messages for specific project
4. **`useWorkflowStates(projects)`** - Manages workflow state calculations
5. **`useQueryClient()`** - React Query client for cache management

---

## Data Flow

1. **Dashboard loads** → Calls `useProjects()` and `useWorkflowAlerts()`
2. **Projects data** → Shared across Project Phases, Project Cubes sections
3. **Alerts data** → Powers Current Alerts section with workflow notifications
4. **Messages data** → Generated from activities or fetched via `useProjectMessages()`
5. **Workflow states** → Calculated from projects using `useWorkflowStates()` hook

---

## Recently Fixed Issues ✅

1. **Missing `status` field** in alerts API response - Fixed in `server/routes/alerts.js:343`
2. **Missing `projectId` field** in alerts API response - Fixed in `server/routes/alerts.js:344`  
3. **Database field alignment** - Updated schema from ODS file
4. **Alert regeneration** - 17 new alerts created for active projects

---

*Generated: 2025-08-17*