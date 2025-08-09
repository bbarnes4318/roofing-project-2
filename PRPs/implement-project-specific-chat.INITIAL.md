# PR Plan: Implement Project-Specific Chat (Initial)

## Summary
Introduce a real-time, project-scoped chat experience that centralizes discussions per project. Leverage existing message models and Socket.IO infrastructure to provide live updates, typing indicators, unread counts, and a consistent UI across Dashboard, Project Detail, and My Messages.

## Context (Current State)
- Backend already exposes message-related routes and imports `messageRoutes` and `projectMessageRoutes`.
- Project detail view and dashboard already show message-like activity; however, there is no single, cohesive project chat thread with real-time UX and consistent navigation.
- Socket.IO is initialized and used for alerts and workflow events (`io`, rooms like `project_{id}`).

## Goals
- Provide a dedicated per-project chat thread (single timeline) with:
  - Real-time delivery via Socket.IO (project room).
  - Basic features: send text, attachments (if available), typing indicator, unread badges.
  - Server-side pagination and read-state.
  - Seamless navigation between “My Messages”, Dashboard, and Project Detail.
  - Permissions: authenticated users; (optional) restrict to assigned team.

## Non-Goals (Initial)
- Full Slack-like channels, reactions, or threads-of-threads.
- Complex ACL beyond basic role checks and project membership.
- E2E encryption.

## High-Level Design
1. Data model (reuse where possible)
   - Use existing `projectMessages` table/model for messages tied to a `projectId`.
   - Ensure indexes: `(projectId, createdAt DESC)` and `(assignedToId)` if needed for unread counts.
   - Message shape: { id, projectId, authorId, subject (optional), content, attachments?, createdAt, readAt? }.

2. API
   - GET `/api/project-messages/:projectId?cursor=<id>&limit=50` → paginated history.
   - POST `/api/project-messages` { projectId, content, attachments? } → create message.
   - POST `/api/project-messages/:id/read` → mark read (current user).
   - GET `/api/messages/unread-count` → aggregate unread per project for badges.
   - Reuse/extend existing routes if already implemented; otherwise add minimal endpoints.

3. Real-Time
   - On POST create: server emits `project_message:new` to room `project_<projectId>`.
   - Client joins/leaves `project_<projectId>` when viewing Project Detail chat.
   - Optional: typing indicator via `project_message:typing` ephemeral events.

4. Frontend
   - New reusable component: `ProjectChat` (composer + virtualized list).
   - Integrations:
     - Project Detail: “Messages” tab becomes `ProjectChat`.
     - Dashboard “My Messages”: show recent messages across projects with deep link to the project chat.
     - Activity cards deep-link to `ProjectChat` within `ProjectDetailPage`.
   - Features:
     - Infinite scroll up for history (React Query + cursor).
     - Optimistic send; auto-scroll on new message if pinned to bottom.
     - Unread dot when navigating away; mark read on viewport.

5. Permissions & Security
   - Auth required.
   - Option A (initial): allow all authenticated users; Option B: restrict to project team/role.
   - Validate `projectId` and content size; sanitize text (xss-clean).

6. Observability
   - Server logs on message create/emit.
   - Basic metrics: messages per project/day (optional later).

## API Contract (Initial)
POST `/api/project-messages`
Request: { projectId: string, content: string, attachments?: Array<{ url: string, name: string, size: number, type: string }> }
Response: { success: boolean, data: Message }

GET `/api/project-messages/:projectId?cursor=<messageId>&limit=50`
Response: { success: boolean, data: Message[], nextCursor?: string }

POST `/api/project-messages/:id/read`
Response: { success: boolean }

Socket events
- Server → Client: `project_message:new` { projectId, message }
- Client → Server: `project_message:typing` { projectId, isTyping }

## UI/UX Plan
- `ProjectChat` component:
  - Header: project info, phase badge, unread count.
  - List: virtualized, timestamp groups, author avatar/role.
  - Composer: multi-line input, send on Ctrl+Enter, attach button (stub ok).
- Dark/light mode parity.

## Rollout Plan
1. Backend: confirm/extend endpoints and room emits (behind feature flag `PROJECT_CHAT_ENABLED`).
2. Frontend: add `ProjectChat`; integrate in `ProjectDetailPage` Messages tab.
3. Wire Socket.IO join/leave in page mount/unmount.
4. Add unread count to sidebar “My Messages”.
5. QA with seed data across at least 3 projects; verify real-time across 2 browsers.

## Testing & Acceptance
- Unit: service to format messages, reducers, query hooks.
- Integration: API create/read, pagination, read-state.
- E2E (happy path):
  - User A opens Project 10001 chat; User B sends message → A receives within 1s.
  - Pagination loads older messages when scrolling up.
  - Navigating away and back preserves read/unread correctly.

## Risks / Mitigations
- Socket room not joined → ensure join on mount and on projectId change.
- Large histories → paginate and virtualize list.
- Attachment handling → start with links; add uploads later.

## Open Questions
- Do we restrict chat to project team only in v1?
- Attachment storage (Cloudinary/S3) timeline?
- Retention policy for messages?

## Tasks (Initial)
- [ ] Backend: verify/extend project message endpoints; add read-state.
- [ ] Backend: emit `project_message:new` on create.
- [ ] Frontend: `ProjectChat` (list + composer), react-query hooks.
- [ ] Frontend: integrate into `ProjectDetailPage` and “My Messages”.
- [ ] Socket join/leave lifecycle, typing indicator (optional).
- [ ] Add basic unread count API and sidebar badge.

## FEATURE:
Implement a new "Project Messages" tab within the individual project pages. This tab must be a direct visual replica of the main dashboard's "My Project Messages" section but will display a filtered view of messages relevant only to the current user for that specific project.

## PROBLEM CONTEXT:
Users need a way to see messages pertaining to them within the context of a single project, without the noise of all messages from the main dashboard. We need to reuse our existing messaging UI to ensure visual consistency but feed it with a new, highly filtered data source.

## CORE REQUIREMENTS:
1.  **Visual Replication:** The new message section inside a project must look and feel identical to the main dashboard's message section. The same React component must be reused.
2.  **Data Filtering:** The crucial difference is the data. The new tab must **only** show messages where the currently logged-in user is a direct recipient or part of the target group for that specific project.
3.  **Context-Aware:** The component must be aware of the project it is in and use the `projectId` to fetch the correct, filtered messages.

## TASK - EXECUTION BLUEPRINT:
You are to execute a precise, three-phase process to implement this filtered messaging feature.

### --- PHASE 1: BACKEND API ENHANCEMENT ---

Your first step is to create a new, specialized API endpoint to provide the filtered data.

1.  **Create a New API Endpoint:**
    * **Action:** In `server/routes/projectMessages.js`, create a new `GET` endpoint. A good route would be `/api/messages/user/:projectId`.
    * **Logic:** This endpoint must accept a `projectId` from the URL parameters. It must also identify the `userId` of the currently authenticated user from the request session or token.
    * **Database Query:** The database query for this endpoint must be highly specific. It should fetch messages where the `projectId` matches AND the recipient list for the message includes the current user's `userId`.
    * **Validation:** Test this new endpoint directly with a tool like `curl`. Confirm that it correctly returns only the messages for a specific user within a specific project.

### --- PHASE 2: FRONTEND COMPONENT REUSABILITY & INTEGRATION ---

Reuse the existing UI component and place it correctly within the project page.

1.  **Identify and Reuse the Component:**
    * **Action:** Locate the React component that renders the message list on the main dashboard. It is likely named something like `src/components/dashboard/ProjectMessages.jsx` or `src/components/ui/MessagesList.jsx`.
    * **Validation:** Confirm that this component is designed to be reusable and accepts `messages` as a prop.

2.  **Integrate the Component:**
    * **Action:** Go to the main project detail page component (e.g., `src/pages/ProjectDetailView.jsx`). Add a new tab labeled "Project Messages."
    * **Task:** Place the reused message component inside this new tab.

### --- PHASE 3: DATA PIPELINE AND FINAL VALIDATION ---

Connect the new UI to the new backend endpoint.

1.  **Implement Data Fetching:**
    * **Action:** Within the "Project Messages" tab, create a new data-fetching function. This function must call the new `/api/messages/user/:projectId` endpoint you created in Phase 1. It needs to pass the current `projectId`.
    * **State Management:** The fetched messages should be stored in a local component state. This state will then be passed as a prop to the reused message component.

2.  **Final End-to-End Validation:**
    * **Action:** To test, create two messages in a project: one sent specifically to "User A" and another sent to "User B".
    * **Success Criterion:**
        * When logged in as **User A** and viewing the project, they must **only** see the message sent to them.
        * When logged in as **User B** and viewing the same project, they must **only** see the message sent to them.
        * The main dashboard's "My Project Messages" section should continue to show messages as it did before, without being affected by this change.