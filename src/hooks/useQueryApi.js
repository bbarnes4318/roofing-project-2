import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { 
  projectsService, 
  tasksService, 
  customersService, 
  activitiesService,
  notificationsService,
  documentsService,
  calendarService,
  authService,
  messagesService,
  projectMessagesService,
  aiService,
  healthService,
  workflowAlertsService,
  workflowService
} from '../services/api';

// Query Keys - Centralized key management
export const queryKeys = {
  // Projects
  projects: ['projects'],
  project: (id) => ['projects', id],
  projectStats: ['projects', 'stats'],
  
  // Tasks
  tasks: ['tasks'],
  task: (id) => ['tasks', id],
  tasksByProject: (projectId) => ['tasks', 'project', projectId],
  tasksByUser: (userId) => ['tasks', 'user', userId],
  
  // Customers
  customers: ['customers'],
  customer: (id) => ['customers', id],
  
  // Activities
  activities: ['activities'],
  recentActivities: (limit) => ['activities', 'recent', limit],
  activitiesByProject: (projectId) => ['activities', 'project', projectId],
  
  // Notifications
  notifications: ['notifications'],
  unreadNotificationsCount: ['notifications', 'unread-count'],
  
  // Documents
  documents: ['documents'],
  documentsByProject: (projectId) => ['documents', 'project', projectId],
  
  // Calendar
  calendarEvents: ['calendar', 'events'],
  
  // Workflow Alerts
  workflowAlerts: ['workflow-alerts'],
  workflowAlertsByUser: (userId) => ['workflow-alerts', 'user', userId],
  workflowAlertsByProject: (projectId) => ['workflow-alerts', 'project', projectId],
  workflowAlertsSummary: ['workflow-alerts', 'summary'],
  
  // Workflow
  workflow: (projectId) => ['workflow', 'project', projectId],

  // Project Messages
  projectMessages: (projectId, params) => ['project-messages', projectId, params],
  projectMessageThread: (messageId) => ['project-messages', 'thread', messageId],
  
  // Search
  search: (query, type = 'general') => ['search', type, query],
};

/**
 * PROJECTS HOOKS
 */
/**
 * PROJECT MESSAGES HOOKS (Per-project chat)
 */

export const useProjectMessages = (projectId, params = { page: 1, limit: 20, includeReplies: 'true' }) => {
  return useQuery({
    queryKey: queryKeys.projectMessages(projectId, params),
    queryFn: () => projectMessagesService.getByProject(projectId, params),
    select: (data) => data?.data || data || [],
    enabled: !!projectId,
    staleTime: 30 * 1000,
  });
};

export const useCreateProjectMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, content, subject, priority, parentMessageId }) =>
      projectMessagesService.create(projectId, { content, subject, priority, parentMessageId }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectMessages(variables.projectId, undefined) });
    },
  });
};

export const useProjectMessageThread = (messageId) => {
  return useQuery({
    queryKey: queryKeys.projectMessageThread(messageId),
    queryFn: () => projectMessagesService.getThread(messageId),
    select: (data) => data?.data || data,
    enabled: !!messageId,
  });
};

// Get all projects with optional parameters
export const useProjects = (params = {}) => {
  return useQuery({
    queryKey: [...queryKeys.projects, params],
    queryFn: () => projectsService.getAll(params),
    select: (data) => {
      // Handle both paginated and direct array responses
      if (data && data.data && Array.isArray(data.data)) {
        return data.data;
      }
      return data?.data || data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for projects (frequently updated)
    retry: false,
    refetchOnWindowFocus: false,
  });
};

// Get single project by ID
export const useProject = (projectId) => {
  return useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: () => projectsService.getById(projectId),
    select: (data) => data?.data || data,
    enabled: !!projectId, // Only run if projectId exists
  });
};

// Get project statistics
export const useProjectStats = () => {
  return useQuery({
    queryKey: queryKeys.projectStats,
    queryFn: () => projectsService.getStats(),
    select: (data) => data?.data || data,
    staleTime: 5 * 60 * 1000, // 5 minutes for stats
  });
};

// Infinite query for projects (pagination)
export const useInfiniteProjects = (params = {}) => {
  return useInfiniteQuery({
    queryKey: [...queryKeys.projects, 'infinite', params],
    queryFn: ({ pageParam = 1 }) => 
      projectsService.getAll({ ...params, page: pageParam }),
    getNextPageParam: (lastPage, pages) => {
      if (lastPage?.hasMore) {
        return pages.length + 1;
      }
      return undefined;
    },
    select: (data) => ({
      pages: data.pages.map(page => page?.data || page || []),
      pageParams: data.pageParams,
    }),
  });
};

/**
 * TASKS HOOKS
 */

export const useTasks = (params = {}) => {
  return useQuery({
    queryKey: [...queryKeys.tasks, params],
    queryFn: () => tasksService.getAll(params),
    select: (data) => data?.data || data || [],
  });
};

export const useTask = (taskId) => {
  return useQuery({
    queryKey: queryKeys.task(taskId),
    queryFn: () => tasksService.getById(taskId),
    select: (data) => data?.data || data,
    enabled: !!taskId,
  });
};

export const useTasksByProject = (projectId) => {
  return useQuery({
    queryKey: queryKeys.tasksByProject(projectId),
    queryFn: () => tasksService.getByProject(projectId),
    select: (data) => data?.data || data || [],
    enabled: !!projectId,
  });
};

export const useTasksByUser = (userId) => {
  return useQuery({
    queryKey: queryKeys.tasksByUser(userId),
    queryFn: () => tasksService.getAssignedToUser(userId),
    select: (data) => data?.data || data || [],
    enabled: !!userId,
  });
};

/**
 * CUSTOMERS HOOKS
 */

export const useCustomers = (params = {}) => {
  return useQuery({
    queryKey: [...queryKeys.customers, params],
    queryFn: () => customersService.getAll(params),
    select: (data) => data?.data || data || [],
  });
};

export const useCustomer = (customerId) => {
  return useQuery({
    queryKey: queryKeys.customer(customerId),
    queryFn: () => customersService.getById(customerId),
    select: (data) => data?.data || data,
    enabled: !!customerId,
  });
};

/**
 * ACTIVITIES HOOKS
 */

export const useActivities = (params = {}) => {
  return useQuery({
    queryKey: [...queryKeys.activities, params],
    queryFn: () => activitiesService.getAll(params),
    select: (data) => data?.data || data || [],
  });
};

export const useRecentActivities = (limit = 10) => {
  return useQuery({
    queryKey: queryKeys.recentActivities(limit),
    queryFn: () => activitiesService.getRecent(limit),
    select: (data) => data?.data || data || [],
    staleTime: 1 * 60 * 1000, // 1 minute for recent activities
  });
};

export const useActivitiesByProject = (projectId) => {
  return useQuery({
    queryKey: queryKeys.activitiesByProject(projectId),
    queryFn: () => activitiesService.getByProject(projectId),
    select: (data) => data?.data || data || [],
    enabled: !!projectId,
  });
};

/**
 * NOTIFICATIONS HOOKS
 */

export const useNotifications = (params = {}) => {
  return useQuery({
    queryKey: [...queryKeys.notifications, params],
    queryFn: () => notificationsService.getAll(params),
    select: (data) => data?.data || data || [],
  });
};

export const useUnreadNotificationsCount = () => {
  return useQuery({
    queryKey: queryKeys.unreadNotificationsCount,
    queryFn: () => notificationsService.getUnreadCount(),
    select: (data) => data?.data?.count || data?.count || 0,
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
};

/**
 * DOCUMENTS HOOKS
 */

export const useDocuments = (params = {}) => {
  return useQuery({
    queryKey: [...queryKeys.documents, params],
    queryFn: () => documentsService.getAll(params),
    select: (data) => data?.data || data || [],
  });
};

export const useDocumentsByProject = (projectId) => {
  return useQuery({
    queryKey: queryKeys.documentsByProject(projectId),
    queryFn: () => documentsService.getByProject(projectId),
    select: (data) => data?.data || data || [],
    enabled: !!projectId,
  });
};

/**
 * CALENDAR HOOKS
 */

export const useCalendarEvents = (params = {}) => {
  return useQuery({
    queryKey: [...queryKeys.calendarEvents, params],
    queryFn: () => calendarService.getAll(params),
    select: (data) => data?.data || data || [],
  });
};

/**
 * WORKFLOW ALERTS HOOKS
 */

export const useWorkflowAlerts = (params = {}) => {
  return useQuery({
    queryKey: [...queryKeys.workflowAlerts, params],
    queryFn: () => workflowAlertsService.getAll(params),
    select: (data) => data?.data || data || [],
    staleTime: 1 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
};

export const useWorkflowAlertsByUser = (userId) => {
  return useQuery({
    queryKey: queryKeys.workflowAlertsByUser(userId),
    queryFn: () => workflowAlertsService.getByUser(userId),
    select: (data) => data?.data || data || [],
    enabled: !!userId,
  });
};

export const useWorkflowAlertsByProject = (projectId) => {
  return useQuery({
    queryKey: queryKeys.workflowAlertsByProject(projectId),
    queryFn: () => workflowAlertsService.getByProject(projectId),
    select: (data) => data?.data || data || [],
    enabled: !!projectId,
  });
};

export const useWorkflowAlertsSummary = () => {
  return useQuery({
    queryKey: queryKeys.workflowAlertsSummary,
    queryFn: () => workflowAlertsService.getSummary(),
    select: (data) => data?.data || data || {},
    staleTime: 2 * 60 * 1000, // 2 minutes for summary
  });
};

/**
 * WORKFLOW HOOKS
 */

export const useWorkflow = (projectId) => {
  return useQuery({
    queryKey: queryKeys.workflow(projectId),
    queryFn: () => workflowService.getByProject(projectId),
    select: (data) => data?.data || data,
    enabled: !!projectId,
  });
};

/**
 * MUTATION HOOKS
 */

// Project mutations
export const useCreateProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (projectData) => projectsService.create(projectData),
    onSuccess: (data) => {
      // Invalidate and refetch projects
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      queryClient.invalidateQueries({ queryKey: queryKeys.projectStats });
      
      // Optionally add the new project to the cache
      if (data?.data) {
        queryClient.setQueryData(queryKeys.project(data.data.id), data);
      }
    },
    onError: (error) => {
      console.error('Failed to create project:', error);
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, projectData }) => 
      projectsService.update(projectId, projectData),
    onSuccess: (data, variables) => {
      // Update specific project in cache
      queryClient.setQueryData(queryKeys.project(variables.projectId), data);
      
      // Invalidate projects list to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      queryClient.invalidateQueries({ queryKey: queryKeys.projectStats });
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (projectId) => projectsService.delete(projectId),
    onSuccess: (data, projectId) => {
      // Remove project from cache
      queryClient.removeQueries({ queryKey: queryKeys.project(projectId) });
      
      // Invalidate projects list
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      queryClient.invalidateQueries({ queryKey: queryKeys.projectStats });
    },
  });
};

// Task mutations
export const useCreateTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (taskData) => tasksService.create(taskData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
      
      // If task belongs to a project, invalidate project tasks
      if (data?.data?.projectId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.tasksByProject(data.data.projectId) 
        });
      }
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ taskId, taskData }) => tasksService.update(taskId, taskData),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.task(variables.taskId), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
      
      if (data?.data?.projectId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.tasksByProject(data.data.projectId) 
        });
      }
    },
  });
};

export const useUpdateTaskStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ taskId, status }) => tasksService.updateStatus(taskId, status),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.task(variables.taskId), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
      
      if (data?.data?.projectId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.tasksByProject(data.data.projectId) 
        });
      }
    },
  });
};

// Customer mutations
export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (customerData) => customersService.create(customerData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers });
      
      if (data?.data) {
        queryClient.setQueryData(queryKeys.customer(data.data.id), data);
      }
    },
  });
};

// Document mutations
export const useUploadDocument = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (formData) => documentsService.upload(formData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents });
      
      // If document belongs to a project, invalidate project documents
      if (data?.data?.projectId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.documentsByProject(data.data.projectId) 
        });
      }
    },
  });
};

// Calendar mutations
export const useCreateCalendarEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (eventData) => calendarService.create(eventData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendarEvents });
    },
  });
};

// Workflow Alert mutations
export const useAcknowledgeAlert = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (alertId) => workflowAlertsService.acknowledge(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowAlerts });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowAlertsSummary });
    },
  });
};

export const useDismissAlert = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (alertId) => workflowAlertsService.dismiss(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowAlerts });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowAlertsSummary });
    },
  });
};

export const useCompleteWorkflowStep = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ alertId, workflowId, stepId, notes }) => 
      workflowAlertsService.completeStep(alertId, workflowId, stepId, notes),
    onSuccess: (data, variables) => {
      // Invalidate workflow alerts
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowAlerts });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowAlertsSummary });
      
      // Invalidate workflow for the specific project
      if (variables.projectId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.workflow(variables.projectId) 
        });
      }
    },
  });
};

// Workflow mutations
export const useCompleteWorkflowSubTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, stepId, subTaskId }) => 
      workflowService.completeSubTask(projectId, stepId, subTaskId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.workflow(variables.projectId) 
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowAlerts });
    },
  });
};

export const useAssignTeamMember = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, stepId, userId }) => 
      workflowService.assignTeamMember(projectId, stepId, userId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.workflow(variables.projectId) 
      });
    },
  });
};

/**
 * SEARCH HOOKS
 */

export const useProjectSearch = (query) => {
  return useQuery({
    queryKey: queryKeys.search(query, 'projects'),
    queryFn: () => projectsService.search(query),
    select: (data) => data?.data || data || [],
    enabled: !!query && query.length >= 2,
    staleTime: 30 * 1000, // 30 seconds for search results
  });
};

export const useCustomerSearch = (query) => {
  return useQuery({
    queryKey: queryKeys.search(query, 'customers'),
    queryFn: () => customersService.search(query),
    select: (data) => data?.data || data || [],
    enabled: !!query && query.length >= 2,
    staleTime: 30 * 1000,
  });
};

/**
 * UTILITY HOOKS
 */

// Hook to invalidate all queries related to a project
export const useInvalidateProjectData = () => {
  const queryClient = useQueryClient();
  
  return (projectId) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.tasksByProject(projectId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.activitiesByProject(projectId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.documentsByProject(projectId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.workflowAlertsByProject(projectId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.workflow(projectId) });
  };
};

// Hook to prefetch related data
export const usePrefetchProjectData = () => {
  const queryClient = useQueryClient();
  
  return (projectId) => {
    // Prefetch project details
    queryClient.prefetchQuery({
      queryKey: queryKeys.project(projectId),
      queryFn: () => projectsService.getById(projectId),
      staleTime: 2 * 60 * 1000,
    });
    
    // Prefetch project tasks
    queryClient.prefetchQuery({
      queryKey: queryKeys.tasksByProject(projectId),
      queryFn: () => tasksService.getByProject(projectId),
      staleTime: 2 * 60 * 1000,
    });
    
    // Prefetch project activities
    queryClient.prefetchQuery({
      queryKey: queryKeys.activitiesByProject(projectId),
      queryFn: () => activitiesService.getByProject(projectId),
      staleTime: 1 * 60 * 1000,
    });
  };
};