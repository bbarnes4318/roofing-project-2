import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

/**
 * Custom hook for managing project messages
 */
export const useProjectMessages = (projectId, options = {}) => {
  const {
    page = 1,
    limit = 20,
    includeReplies = true,
    messageType,
    author,
    search
  } = options;

  return useQuery({
    queryKey: ['projectMessages', projectId, { page, limit, includeReplies, messageType, author, search }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        includeReplies: includeReplies.toString()
      });

      if (messageType) params.append('messageType', messageType);
      if (author) params.append('author', author);
      if (search) params.append('search', search);

      const response = await api.get(`/project-messages/${projectId}?${params}`);
      return response.data;
    },
    enabled: !!projectId,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false
  });
};

/**
 * Hook for creating new project messages
 */
export const useCreateProjectMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, content, subject, priority = 'MEDIUM', parentMessageId }) => {
      const response = await api.post(`/project-messages/${projectId}`, {
        content,
        subject,
        priority,
        parentMessageId
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch project messages
      queryClient.invalidateQueries(['projectMessages', variables.projectId]);
      
      // Also invalidate the activities query to refresh dashboard
      queryClient.invalidateQueries(['activities']);
    }
  });
};

/**
 * Hook for marking messages as read
 */
export const useMarkMessageAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId) => {
      const response = await api.patch(`/project-messages/${messageId}/read`);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate project messages to update read status
      queryClient.invalidateQueries(['projectMessages']);
    }
  });
};

/**
 * Hook for getting message thread
 */
export const useMessageThread = (messageId) => {
  return useQuery({
    queryKey: ['messageThread', messageId],
    queryFn: async () => {
      const response = await api.get(`/project-messages/thread/${messageId}`);
      return response.data;
    },
    enabled: !!messageId,
    staleTime: 60000 // 1 minute
  });
};

/**
 * Hook for generating demo messages (admin only)
 */
export const useGenerateDemoMessages = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId) => {
      const response = await api.post(`/project-messages/${projectId}/generate-demo`);
      return response.data;
    },
    onSuccess: (data, projectId) => {
      // Invalidate project messages to show new demo messages
      queryClient.invalidateQueries(['projectMessages', projectId]);
      queryClient.invalidateQueries(['activities']);
    }
  });
};

/**
 * Hook for project message statistics
 */
export const useProjectMessageStats = (projectId, days = 30) => {
  return useQuery({
    queryKey: ['projectMessageStats', projectId, days],
    queryFn: async () => {
      const response = await api.get(`/project-messages/${projectId}/stats?days=${days}`);
      return response.data;
    },
    enabled: !!projectId,
    staleTime: 300000 // 5 minutes
  });
};

/**
 * Transform project messages for dashboard display
 */
export const transformProjectMessagesForDashboard = (messages = []) => {
  return messages.map(message => ({
    id: message.id,
    projectId: message.projectId,
    projectNumber: message.projectNumber,
    subject: message.subject,
    content: message.content,
    user: message.authorName,
    timestamp: message.createdAt,
    conversation: message.replies ? [
      {
        id: message.id,
        user: message.authorName,
        comment: message.content,
        timestamp: message.createdAt
      },
      ...message.replies.map(reply => ({
        id: reply.id,
        user: reply.authorName,
        comment: reply.content,
        timestamp: reply.createdAt
      }))
    ] : [{
      id: message.id,
      user: message.authorName,
      comment: message.content,
      timestamp: message.createdAt
    }],
    // Additional fields for compatibility
    messageType: message.messageType,
    priority: message.priority,
    phase: message.phase,
    section: message.section,
    lineItem: message.lineItem,
    isSystemGenerated: message.isSystemGenerated,
    isWorkflowMessage: message.isWorkflowMessage,
    readBy: message.readBy,
    metadata: message.metadata
  }));
};