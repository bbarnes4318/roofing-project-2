import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class FeedbackService {
  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // Feedback CRUD operations
  async getFeedback(params = {}) {
    try {
      const response = await this.api.get('/feedback', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching feedback:', error);
      throw error;
    }
  }

  async getFeedbackById(id) {
    try {
      const response = await this.api.get(`/feedback/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching feedback by ID:', error);
      throw error;
    }
  }

  async createFeedback(feedbackData) {
    try {
      const response = await this.api.post('/feedback', feedbackData);
      return response.data;
    } catch (error) {
      console.error('Error creating feedback:', error);
      throw error;
    }
  }

  async updateFeedback(id, updates) {
    try {
      const response = await this.api.patch(`/feedback/${id}`, updates);
      return response.data;
    } catch (error) {
      console.error('Error updating feedback:', error);
      throw error;
    }
  }

  async deleteFeedback(id) {
    try {
      const response = await this.api.delete(`/feedback/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting feedback:', error);
      throw error;
    }
  }

  // Comments
  async getComments(feedbackId) {
    try {
      const response = await this.api.get(`/feedback/${feedbackId}/comments`);
      return response.data;
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw error;
    }
  }

  async addComment(feedbackId, commentData) {
    try {
      const response = await this.api.post(`/feedback/${feedbackId}/comments`, commentData);
      return response.data;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  async updateComment(commentId, updates) {
    try {
      const response = await this.api.patch(`/comments/${commentId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  }

  async deleteComment(commentId) {
    try {
      const response = await this.api.delete(`/comments/${commentId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }

  // Voting
  async vote(feedbackId, action) {
    try {
      const response = await this.api.post(`/feedback/${feedbackId}/vote`, { action });
      return response.data;
    } catch (error) {
      console.error('Error voting:', error);
      throw error;
    }
  }

  // Status and assignment
  async updateStatus(feedbackId, updates) {
    try {
      const response = await this.api.patch(`/feedback/${feedbackId}/status`, updates);
      return response.data;
    } catch (error) {
      console.error('Error updating status:', error);
      throw error;
    }
  }

  // File uploads
  async uploadFile(file, type = 'attachment') {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await this.api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  // User profile and gamification
  async getUserProfile(userId) {
    try {
      const response = await this.api.get(`/users/${userId}/profile`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  async getLeaderboard(timeframe = 'weekly') {
    try {
      const response = await this.api.get(`/leaderboard/${timeframe}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    }
  }

  async getBadges() {
    try {
      const response = await this.api.get('/badges');
      return response.data;
    } catch (error) {
      console.error('Error fetching badges:', error);
      throw error;
    }
  }

  // Notifications
  async getNotifications(userId) {
    try {
      const response = await this.api.get(`/users/${userId}/notifications`);
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId) {
    try {
      const response = await this.api.patch(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllNotificationsAsRead(userId) {
    try {
      const response = await this.api.patch(`/users/${userId}/notifications/read-all`);
      return response.data;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Subscription management
  async subscribeToFeedback(feedbackId) {
    try {
      const response = await this.api.post(`/feedback/${feedbackId}/subscribe`);
      return response.data;
    } catch (error) {
      console.error('Error subscribing to feedback:', error);
      throw error;
    }
  }

  async unsubscribeFromFeedback(feedbackId) {
    try {
      const response = await this.api.delete(`/feedback/${feedbackId}/subscribe`);
      return response.data;
    } catch (error) {
      console.error('Error unsubscribing from feedback:', error);
      throw error;
    }
  }

  // Analytics and reporting
  async getFeedbackAnalytics(params = {}) {
    try {
      const response = await this.api.get('/feedback/analytics', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching feedback analytics:', error);
      throw error;
    }
  }

  async getFeedbackStats() {
    try {
      const response = await this.api.get('/feedback/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching feedback stats:', error);
      throw error;
    }
  }

  // Search
  async searchFeedback(query, filters = {}) {
    try {
      const response = await this.api.get('/feedback/search', {
        params: { q: query, ...filters }
      });
      return response.data;
    } catch (error) {
      console.error('Error searching feedback:', error);
      throw error;
    }
  }

  // Tags
  async getTags() {
    try {
      const response = await this.api.get('/tags');
      return response.data;
    } catch (error) {
      console.error('Error fetching tags:', error);
      throw error;
    }
  }

  async createTag(tagData) {
    try {
      const response = await this.api.post('/tags', tagData);
      return response.data;
    } catch (error) {
      console.error('Error creating tag:', error);
      throw error;
    }
  }

  // Duplicate detection
  async findDuplicates(feedbackId) {
    try {
      const response = await this.api.get(`/feedback/${feedbackId}/duplicates`);
      return response.data;
    } catch (error) {
      console.error('Error finding duplicates:', error);
      throw error;
    }
  }

  async mergeFeedback(sourceId, targetId) {
    try {
      const response = await this.api.post(`/feedback/${sourceId}/merge`, { targetId });
      return response.data;
    } catch (error) {
      console.error('Error merging feedback:', error);
      throw error;
    }
  }

  // Real-time updates (WebSocket connection)
  connectWebSocket(userId) {
    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:5000';
    const ws = new WebSocket(`${wsUrl}/ws?userId=${userId}`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleWebSocketMessage(data);
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt to reconnect after 5 seconds
      setTimeout(() => this.connectWebSocket(userId), 5000);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    return ws;
  }

  handleWebSocketMessage(data) {
    // Handle different types of real-time updates
    switch (data.type) {
      case 'feedback_created':
        this.emit('feedback:created', data.payload);
        break;
      case 'feedback_updated':
        this.emit('feedback:updated', data.payload);
        break;
      case 'comment_added':
        this.emit('comment:added', data.payload);
        break;
      case 'vote_changed':
        this.emit('vote:changed', data.payload);
        break;
      case 'status_changed':
        this.emit('status:changed', data.payload);
        break;
      case 'notification':
        this.emit('notification:new', data.payload);
        break;
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  }

  // Event emitter for real-time updates
  emit(event, data) {
    // This would integrate with your state management system
    // For now, we'll just log the events
    console.log(`Event: ${event}`, data);
  }
}

// Create and export a singleton instance
const feedbackService = new FeedbackService();
export default feedbackService;
