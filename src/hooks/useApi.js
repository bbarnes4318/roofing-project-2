import { useState, useEffect, useCallback } from 'react';
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
  aiService,
  healthService,
  workflowAlertsService,
  workflowService
} from '../services/api';

// Generic hook for API calls with loading and error states
export const useApiCall = (apiFunction, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (...args) => {
    try {
      console.log('🔍 API: Starting API call...', apiFunction.name);
      setLoading(true);
      setError(null);
      const result = await apiFunction(...args);
      console.log('✅ API: API call successful:', result);
      // Handle paginated responses by extracting the data array
      if (result && result.data && Array.isArray(result.data)) {
        setData(result.data);
      } else if (result && result.data) {
        setData(result.data);
      } else {
        setData(result);
      }
    } catch (err) {
      console.error('❌ API: API call failed:', err);
      console.error('❌ API: Error details:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
      setError(err.response?.data?.message || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};

// Projects hooks
export const useProjects = (params = {}) => {
  return useApiCall(() => projectsService.getAll(params), [JSON.stringify(params)]);
};

export const useProject = (projectId) => {
  return useApiCall(() => projectsService.getById(projectId), [projectId]);
};

export const useProjectStats = () => {
  return useApiCall(() => projectsService.getStats());
};

// Tasks hooks
export const useTasks = (params = {}) => {
  return useApiCall(() => tasksService.getAll(params), [JSON.stringify(params)]);
};

export const useTask = (taskId) => {
  return useApiCall(() => tasksService.getById(taskId), [taskId]);
};

export const useTasksByProject = (projectId) => {
  return useApiCall(() => tasksService.getByProject(projectId), [projectId]);
};

export const useTasksAssignedToUser = (assignedTo) => {
  return useApiCall(() => tasksService.getAssignedToUser(assignedTo), [assignedTo]);
};

// Customers hooks
export const useCustomers = (params = {}) => {
  return useApiCall(() => customersService.getAll(params), [JSON.stringify(params)]);
};

export const useCustomer = (customerId) => {
  return useApiCall(() => customersService.getById(customerId), [customerId]);
};

// Activities hooks
export const useActivities = (params = {}) => {
  return useApiCall(() => activitiesService.getAll(params), [JSON.stringify(params)]);
};

export const useRecentActivities = (limit = 10) => {
  return useApiCall(() => activitiesService.getRecent(limit), [limit]);
};

export const useActivitiesByProject = (projectId) => {
  return useApiCall(() => activitiesService.getByProject(projectId), [projectId]);
};

// Notifications hooks
export const useNotifications = (params = {}) => {
  return useApiCall(() => notificationsService.getAll(params), [JSON.stringify(params)]);
};

export const useUnreadNotificationsCount = () => {
  return useApiCall(() => notificationsService.getUnreadCount());
};

// Documents hooks
export const useDocuments = (params = {}) => {
  return useApiCall(() => documentsService.getAll(params), [JSON.stringify(params)]);
};

export const useDocumentsByProject = (projectId) => {
  return useApiCall(() => documentsService.getByProject(projectId), [projectId]);
};

// Calendar hooks
export const useCalendarEvents = (params = {}) => {
  return useApiCall(() => calendarService.getAll(params), [JSON.stringify(params)]);
};

// Mutation hooks (for create, update, delete operations)
export const useCreateProject = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createProject = useCallback(async (projectData) => {
    try {
      setLoading(true);
      setError(null);
      const result = await projectsService.create(projectData);
      return result;
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create project');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createProject, loading, error };
};

export const useUpdateProject = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateProject = useCallback(async (projectId, projectData) => {
    try {
      setLoading(true);
      setError(null);
      const result = await projectsService.update(projectId, projectData);
      return result;
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update project');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { updateProject, loading, error };
};

export const useDeleteProject = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const deleteProject = useCallback(async (projectId) => {
    try {
      setLoading(true);
      setError(null);
      const result = await projectsService.delete(projectId);
      return result;
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete project');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { deleteProject, loading, error };
};

export const useCreateTask = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createTask = useCallback(async (taskData) => {
    try {
      setLoading(true);
      setError(null);
      const result = await tasksService.create(taskData);
      return result;
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create task');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createTask, loading, error };
};

export const useUpdateTask = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateTask = useCallback(async (taskId, taskData) => {
    try {
      setLoading(true);
      setError(null);
      const result = await tasksService.update(taskId, taskData);
      return result;
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update task');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { updateTask, loading, error };
};

export const useUpdateTaskStatus = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateTaskStatus = useCallback(async (taskId, status) => {
    try {
      setLoading(true);
      setError(null);
      const result = await tasksService.updateStatus(taskId, status);
      return result;
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update task status');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { updateTaskStatus, loading, error };
};

export const useCreateCustomer = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createCustomer = useCallback(async (customerData) => {
    try {
      setLoading(true);
      setError(null);
      const result = await customersService.create(customerData);
      return result;
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create customer');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createCustomer, loading, error };
};

export const useUploadDocument = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const uploadDocument = useCallback(async (formData) => {
    try {
      setLoading(true);
      setError(null);
      setProgress(0);
      
      const result = await documentsService.upload(formData);
      setProgress(100);
      return result;
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to upload document');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { uploadDocument, loading, error, progress };
};

export const useCreateCalendarEvent = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createEvent = useCallback(async (eventData) => {
    try {
      setLoading(true);
      setError(null);
      const result = await calendarService.create(eventData);
      return result;
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create event');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createEvent, loading, error };
};

// Search hooks
export const useSearch = (searchFunction) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const search = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await searchFunction(query.trim());
      setResults(result.data || result);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Search failed');
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  }, [searchFunction]);

  return { results, loading, error, search };
};

export const useProjectSearch = () => {
  return useSearch(projectsService.search);
};

export const useCustomerSearch = () => {
  return useSearch(customersService.search);
};

// Workflow Alerts Hook
export const useWorkflowAlerts = (params = {}) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await workflowAlertsService.getAll(params);
      setAlerts(response.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [JSON.stringify(params)]);

  const acknowledgeAlert = async (alertId) => {
    try {
      await workflowAlertsService.acknowledge(alertId);
      // Update local state
      setAlerts(prev => prev.map(alert => 
        alert._id === alertId ? { ...alert, acknowledged: true } : alert
      ));
    } catch (err) {
      console.error('Error acknowledging alert:', err);
      throw err;
    }
  };

  const dismissAlert = async (alertId) => {
    try {
      await workflowAlertsService.dismiss(alertId);
      // Remove from local state
      setAlerts(prev => prev.filter(alert => alert._id !== alertId));
    } catch (err) {
      console.error('Error dismissing alert:', err);
      throw err;
    }
  };

  const completeStep = async (alertId, projectId, lineItemId, notes = '') => {
    try {
      await workflowAlertsService.completeStep(alertId, projectId, lineItemId, notes);
      // Remove from local state since step is completed
      setAlerts(prev => prev.filter(alert => alert._id !== alertId));
    } catch (err) {
      console.error('Error completing step:', err);
      throw err;
    }
  };

  const assignAlert = async (alertId, assignedToUserId) => {
    try {
      await workflowAlertsService.assignAlert(alertId, assignedToUserId);
      // Remove from local state since alert is reassigned
      setAlerts(prev => prev.filter(alert => alert._id !== alertId));
    } catch (err) {
      console.error('Error assigning alert:', err);
      throw err;
    }
  };

  return {
    alerts,
    loading,
    error,
    refresh: fetchAlerts,
    acknowledgeAlert,
    dismissAlert,
    completeStep,
    assignAlert
  };
};

// Workflow Alerts by User Hook
export const useWorkflowAlertsByUser = (userId) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const fetchAlerts = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await workflowAlertsService.getByUser(userId);
        setAlerts(response.data || []);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching user workflow alerts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, [userId]);

  return { alerts, loading, error };
};

// Workflow Alerts by Project Hook
export const useWorkflowAlertsByProject = (projectId) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!projectId) return;

    const fetchAlerts = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await workflowAlertsService.getByProject(projectId);
        setAlerts(response.data || []);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching project workflow alerts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, [projectId]);

  return { alerts, loading, error };
};

// Workflow Alerts Summary Hook
export const useWorkflowAlertsSummary = () => {
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await workflowAlertsService.getSummary();
        setSummary(response.data || {});
      } catch (err) {
        setError(err.message);
        console.error('Error fetching workflow alerts summary:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  return { summary, loading, error };
};

// Workflow Management Hook
export const useWorkflow = (projectId) => {
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWorkflow = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await workflowService.getByProject(projectId);
      setWorkflow(response.data || null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching workflow:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflow();
  }, [projectId]);

  const completeStep = async (lineItemId) => {
    try {
      await workflowService.completeStep(projectId, lineItemId);
      await fetchWorkflow(); // Refresh workflow data
    } catch (err) {
      console.error('Error completing step:', err);
      throw err;
    }
  };

  const completeSubTask = async (stepId, subTaskId) => {
    try {
      await workflowService.completeSubTask(projectId, stepId, subTaskId);
      await fetchWorkflow(); // Refresh workflow data
    } catch (err) {
      console.error('Error completing sub-task:', err);
      throw err;
    }
  };

  const assignTeamMember = async (stepId, userId) => {
    try {
      await workflowService.assignTeamMember(projectId, stepId, userId);
      await fetchWorkflow(); // Refresh workflow data
    } catch (err) {
      console.error('Error assigning team member:', err);
      throw err;
    }
  };

  return {
    workflow,
    loading,
    error,
    refresh: fetchWorkflow,
    completeStep,
    completeSubTask,
    assignTeamMember
  };
};

export default useApiCall; 