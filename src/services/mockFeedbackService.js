// Mock feedback service for development and testing
// This provides sample data when the backend API is not available

// Initialize feedback store from localStorage or use default data
const initializeFeedbackStore = () => {
  const stored = localStorage.getItem('mockFeedbackStore');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error parsing stored feedback data:', error);
    }
  }
  
  // Return default mock data if no stored data
  return [
  {
    id: '1',
    type: 'BUG',
    title: 'Dashboard loading slowly on mobile devices',
    description: 'The dashboard takes 5+ seconds to load on mobile devices, especially on slower connections.',
    status: 'OPEN',
    severity: 'HIGH',
    tags: ['mobile', 'performance', 'dashboard'],
    voteCount: 12,
    commentCount: 3,
    hasVoted: false,
    author: { name: 'Sarah Johnson', id: 'user1' },
    assignee: null,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    developerResponseCount: 0
  },
  {
    id: '2',
    type: 'IMPROVEMENT',
    title: 'Add bulk actions for project management',
    description: 'It would be great to select multiple projects and perform bulk actions like archiving, status updates, or assigning to team members.',
    status: 'IN_REVIEW',
    severity: null,
    tags: ['projects', 'bulk-actions', 'productivity'],
    voteCount: 8,
    commentCount: 5,
    hasVoted: true,
    author: { name: 'Mike Chen', id: 'user2' },
    assignee: { name: 'John Developer', id: 'dev1' },
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    developerResponseCount: 0
  },
  {
    id: '3',
    type: 'IDEA',
    title: 'AI-powered project timeline predictions',
    description: 'Use AI to predict project completion dates based on historical data, team performance, and external factors like weather.',
    status: 'PLANNED',
    severity: null,
    tags: ['ai', 'predictions', 'timeline', 'analytics'],
    voteCount: 15,
    commentCount: 7,
    hasVoted: false,
    author: { name: 'Alex Rivera', id: 'user3' },
    assignee: { name: 'AI Team', id: 'ai-team' },
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    developerResponseCount: 3
  },
  {
    id: '4',
    type: 'BUG',
    title: 'Calendar events not syncing with external calendars',
    description: 'Events created in the app are not appearing in Google Calendar or Outlook, even though sync is enabled.',
    status: 'IN_PROGRESS',
    severity: 'MEDIUM',
    tags: ['calendar', 'sync', 'integration'],
    voteCount: 6,
    commentCount: 2,
    hasVoted: false,
    author: { name: 'Emma Wilson', id: 'user4' },
    assignee: { name: 'Integration Team', id: 'integration-team' },
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    developerResponseCount: 0
  },
  {
    id: '5',
    type: 'IMPROVEMENT',
    title: 'Dark mode for better night work',
    description: 'Add a dark mode option for users who work late hours or prefer darker interfaces.',
    status: 'DONE',
    severity: null,
    tags: ['ui', 'dark-mode', 'accessibility'],
    voteCount: 23,
    commentCount: 12,
    hasVoted: true,
    author: { name: 'David Kim', id: 'user5' },
    assignee: { name: 'UI Team', id: 'ui-team' },
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    developerResponseCount: 4
  },
  {
    id: '6',
    type: 'BUG',
    title: 'Login form validation error',
    description: 'The login form shows "Invalid credentials" even when credentials are correct.',
    status: 'OPEN',
    severity: 'MEDIUM',
    tags: ['auth', 'login', 'validation'],
    voteCount: 4,
    commentCount: 1,
    hasVoted: false,
    author: { name: 'Current User', id: 'current-user' },
    assignee: null,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    developerResponseCount: 0
  },
  {
    id: '7',
    type: 'IDEA',
    title: 'Voice commands for project management',
    description: 'Add voice command support to create tasks, update status, and navigate the app hands-free.',
    status: 'PLANNED',
    severity: null,
    tags: ['voice', 'accessibility', 'productivity'],
    voteCount: 18,
    commentCount: 6,
    hasVoted: true,
    author: { name: 'Current User', id: 'current-user' },
    assignee: { name: 'AI Team', id: 'ai-team' },
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    developerResponseCount: 0
  },
  {
    id: '8',
    type: 'IMPROVEMENT',
    title: 'Better mobile navigation',
    description: 'The mobile navigation could be improved with a bottom tab bar instead of the current sidebar.',
    status: 'IN_REVIEW',
    severity: null,
    tags: ['mobile', 'navigation', 'ux'],
    voteCount: 7,
    commentCount: 3,
    hasVoted: false,
    author: { name: 'Current User', id: 'current-user' },
    assignee: { name: 'Mobile Team', id: 'mobile-team' },
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    developerResponseCount: 0
  }
  ];
};

// Initialize the feedback store
let mockFeedbackStore = initializeFeedbackStore();

// Helper function to save store to localStorage
const saveStoreToLocalStorage = () => {
  try {
    localStorage.setItem('mockFeedbackStore', JSON.stringify(mockFeedbackStore));
  } catch (error) {
    console.error('Error saving feedback data to localStorage:', error);
  }
};

export const mockFeedbackService = {
  getFeedback: async (params = {}) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const mockFeedback = mockFeedbackStore;

    // Apply filters
    let filtered = mockFeedback;
    
    console.log('Mock service - params:', params);
    console.log('Mock service - params.type:', params.type);
    console.log('Mock service - mockFeedback length:', mockFeedback.length);
    
    if (params.type && params.type !== 'all') {
      console.log('Filtering by type:', params.type);
      
      if (params.type === 'BUGS' || params.type === 'BUG') {
        filtered = filtered.filter(item => item.type === 'BUG');
      } else if (params.type === 'IMPROVEMENTS' || params.type === 'IMPROVEMENT') {
        filtered = filtered.filter(item => item.type === 'IMPROVEMENT');
      } else if (params.type === 'IDEAS' || params.type === 'IDEA') {
        filtered = filtered.filter(item => item.type === 'IDEA');
      } else if (params.type === 'MINE') {
        // Filter for current user's feedback
        filtered = filtered.filter(item => item.author.id === 'current-user');
      } else if (params.type === 'FOLLOWING') {
        // Filter for feedback the user is following (mock: show items with developer responses)
        filtered = filtered.filter(item => item.developerResponseCount > 0);
      }
    }
    
    if (params.status && params.status !== 'all') {
      filtered = filtered.filter(item => item.status === params.status);
    }
    
    if (params.severity && params.severity !== 'all') {
      filtered = filtered.filter(item => item.severity === params.severity);
    }
    
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    console.log('Mock service - filtered length:', filtered.length);
    console.log('Mock service - returning:', { success: true, data: filtered });
    
    return {
      success: true,
      data: filtered,
      total: filtered.length
    };
  },

  createFeedback: async (feedbackData) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newFeedback = {
      id: Date.now().toString(),
      ...feedbackData,
      status: 'OPEN',
      voteCount: 0,
      commentCount: 0,
      hasVoted: false,
      author: { name: 'Current User', id: 'current-user' },
      assignee: null,
      createdAt: new Date().toISOString(),
      developerResponseCount: 0
    };

    // Add the new feedback to the store
    mockFeedbackStore.unshift(newFeedback); // Add to beginning of array (newest first)
    
    // Save to localStorage for persistence
    saveStoreToLocalStorage();

    console.log('Mock service - created feedback:', newFeedback);
    console.log('Mock service - store now has', mockFeedbackStore.length, 'items');

    return {
      success: true,
      data: newFeedback
    };
  },

  vote: async (feedbackId, action) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Update the feedback item in the store
    const feedbackIndex = mockFeedbackStore.findIndex(f => f.id === feedbackId);
    if (feedbackIndex !== -1) {
      const feedback = mockFeedbackStore[feedbackIndex];
      
      if (action === 'upvote') {
        feedback.voteCount = (feedback.voteCount || 0) + 1;
        feedback.hasVoted = true;
      } else if (action === 'downvote') {
        feedback.voteCount = Math.max((feedback.voteCount || 0) - 1, 0);
        feedback.hasVoted = true;
      }
      
      // Update the feedback in the store
      mockFeedbackStore[feedbackIndex] = feedback;
      
      // Save to localStorage
      saveStoreToLocalStorage();
      
      console.log('Mock service - updated feedback after vote:', feedback);
    }
    
    return {
      success: true,
      data: { feedbackId, action }
    };
  },

  updateStatus: async (feedbackId, updates) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Update the feedback item in the store
    const feedbackIndex = mockFeedbackStore.findIndex(f => f.id === feedbackId);
    if (feedbackIndex !== -1) {
      const feedback = mockFeedbackStore[feedbackIndex];
      
      // Apply updates
      Object.assign(feedback, updates);
      
      // Update the feedback in the store
      mockFeedbackStore[feedbackIndex] = feedback;
      
      // Save to localStorage
      saveStoreToLocalStorage();
      
      console.log('Mock service - updated feedback status:', feedback);
    }
    
    return {
      success: true,
      data: { feedbackId, ...updates }
    };
  },



  getNotifications: async (userId) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return [
      {
        id: '1',
        type: 'comment',
        title: 'New comment on your feedback',
        message: 'John Developer commented on "Dashboard loading slowly"',
        read: false,
        createdAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: '2',
        type: 'vote',
        title: 'Your feedback received an upvote',
        message: 'Someone upvoted "Add bulk actions for project management"',
        read: false,
        createdAt: new Date(Date.now() - 7200000).toISOString()
      },
      {
        id: '3',
        type: 'status_change',
        title: 'Feedback status updated',
        message: 'Your feedback "AI-powered predictions" is now Planned',
        read: true,
        createdAt: new Date(Date.now() - 86400000).toISOString()
      }
    ];
  },

  markNotificationAsRead: async (notificationId) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return { success: true };
  },

  markAllNotificationsAsRead: async (userId) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return { success: true };
  },

  getComments: async (feedbackId) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Return different comments based on feedbackId to match developerResponseCount
    const commentsByFeedbackId = {
      '1': [
        {
          id: '1-1',
          body: 'Thanks for reporting this! I can reproduce the issue on mobile devices. Looking into it now.',
          author: { name: 'John Developer', id: 'dev1' },
          isDeveloper: true,
          isPinned: true,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          parentId: null
        }
      ],
      '2': [
        {
          id: '2-1',
          body: 'Great suggestion! I\'ve added this to our roadmap for Q2.',
          author: { name: 'John Developer', id: 'dev1' },
          isDeveloper: true,
          isPinned: false,
          createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          parentId: null
        },
        {
          id: '2-2',
          body: 'This would definitely improve our workflow. I\'ll start working on the implementation.',
          author: { name: 'Mike Chen', id: 'dev2' },
          isDeveloper: true,
          isPinned: false,
          createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          parentId: null
        }
      ],
      '3': [
        {
          id: '3-1',
          body: 'I love this idea! This would make the interface much more intuitive.',
          author: { name: 'Sarah Johnson', id: 'user1' },
          isDeveloper: false,
          isPinned: false,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          parentId: null
        }
      ]
    };
    
    return commentsByFeedbackId[feedbackId] || [];
  },

  addComment: async (feedbackId, commentData) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newComment = {
      id: Date.now().toString(),
      body: commentData.body,
      author: { name: 'Current User', id: 'current-user' },
      isDeveloper: commentData.isDeveloper || false,
      isPinned: false,
      createdAt: new Date().toISOString(),
      parentId: commentData.parentId || null
    };

    // Update the feedback item in the store
    const feedbackIndex = mockFeedbackStore.findIndex(f => f.id === feedbackId);
    if (feedbackIndex !== -1) {
      const feedback = mockFeedbackStore[feedbackIndex];
      feedback.commentCount = (feedback.commentCount || 0) + 1;
      
      // Increment developer response count if it's a developer comment
      if (commentData.isDeveloper) {
        feedback.developerResponseCount = (feedback.developerResponseCount || 0) + 1;
      }
      
      // Update the feedback in the store
      mockFeedbackStore[feedbackIndex] = feedback;
      
      // Save to localStorage
      saveStoreToLocalStorage();
      
      console.log('Mock service - updated feedback after comment:', feedback);
    }

    return newComment;
  }
};
