-- Add performance indexes for frequently queried fields

-- Projects table indexes
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_project_type ON projects("projectType");
CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(priority);
CREATE INDEX IF NOT EXISTS idx_projects_archived ON projects(archived);
CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_project_manager_id ON projects(project_manager_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects("createdAt");
CREATE INDEX IF NOT EXISTS idx_projects_project_number ON projects("projectNumber");
CREATE INDEX IF NOT EXISTS idx_projects_status_archived ON projects(status, archived);
CREATE INDEX IF NOT EXISTS idx_projects_search ON projects USING gin(to_tsvector('english', "projectName" || ' ' || COALESCE(description, '')));

-- Customers table indexes
CREATE INDEX IF NOT EXISTS idx_customers_primary_name ON customers("primaryName");
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers("createdAt");
CREATE INDEX IF NOT EXISTS idx_customers_search ON customers USING gin(to_tsvector('english', "primaryName" || ' ' || COALESCE(address, '') || ' ' || COALESCE("primaryEmail", '')));

-- Tasks table indexes
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks("dueDate");
CREATE INDEX IF NOT EXISTS idx_tasks_status_assigned ON tasks(status, assigned_to);

-- Documents table indexes
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents("fileType");
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents("createdAt");

-- Messages table indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages("createdAt");

-- Notifications table indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications("isRead");
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications("createdAt");
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read ON notifications(recipient_id, "isRead");

-- WorkflowStep indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow_id ON "WorkflowStep"(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_is_completed ON "WorkflowStep"("isCompleted");
CREATE INDEX IF NOT EXISTS idx_workflow_steps_phase ON "WorkflowStep"(phase);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow_completed ON "WorkflowStep"(workflow_id, "isCompleted");

-- ProjectWorkflow indexes
CREATE INDEX IF NOT EXISTS idx_project_workflow_project_id ON "ProjectWorkflow"(project_id);
CREATE INDEX IF NOT EXISTS idx_project_workflow_is_active ON "ProjectWorkflow"("isActive");

-- Composite indexes for common join queries
CREATE INDEX IF NOT EXISTS idx_project_team_project_user ON project_team_members(project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_alert_project_status ON "WorkflowAlert"(project_id, status);

-- Analyze tables for query optimizer
ANALYZE projects;
ANALYZE customers;
ANALYZE tasks;
ANALYZE documents;
ANALYZE messages;
ANALYZE notifications;
ANALYZE "WorkflowStep";
ANALYZE "ProjectWorkflow";
ANALYZE "WorkflowAlert";