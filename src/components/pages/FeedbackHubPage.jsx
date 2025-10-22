import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedbackService } from '../../services/api';
import { mockFeedbackService } from '../../services/mockFeedbackService';
import FeedbackForm from '../feedback/FeedbackForm';
import FeedbackCard from '../feedback/FeedbackCard';
import FeedbackFilters from '../feedback/FeedbackFilters';
import NotificationBell from '../feedback/NotificationBell';
import FeedbackDrawer from '../feedback/FeedbackDrawer';
import { Search, MessageSquare, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

const FeedbackHubPage = ({ colorMode, currentUser }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    severity: 'all',
    dateRange: 'all',
    sortBy: 'newest'
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch feedback data
  const { data: feedbackData, isLoading, error } = useQuery({
    queryKey: ['feedback', activeTab, filters, searchQuery],
    queryFn: async () => {
      // Use real API database
      const params = { ...filters, search: searchQuery };
      if (activeTab !== 'all') {
        // Map tab names to correct API type values
        const typeMapping = {
          'bugs': 'BUG',
          'improvements': 'IMPROVEMENT', 
          'ideas': 'IDEA',
          'mine': 'MINE',
          'following': 'FOLLOWING'
        };
        params.type = typeMapping[activeTab] || activeTab.toUpperCase();
      }
      const response = await feedbackService.getFeedback(params);
      console.log('API Response for', activeTab, ':', response.data);
      return response.data;
    }
  });


  // Fetch notifications
  const { data: notifications } = useQuery({
    queryKey: ['notifications', currentUser?.id],
    queryFn: async () => {
      try {
        return await feedbackService.getNotifications(currentUser?.id);
      } catch (error) {
        console.log('Using mock notifications service');
        return await mockFeedbackService.getNotifications(currentUser?.id);
      }
    },
    enabled: !!currentUser?.id
  });

  // Handle feedback submission
  const submitFeedbackMutation = useMutation({
    mutationFn: async (data) => {
      // Use real API database
      const response = await feedbackService.createFeedback(data);
      console.log('Feedback created via API:', response.data);
      return response.data;
    },
    onSuccess: (data) => {
      console.log('Feedback submitted successfully:', data);
      toast.success('Feedback submitted successfully!');
      queryClient.invalidateQueries(['feedback']);
    },
    onError: (error) => {
      console.error('Failed to submit feedback:', error);
      toast.error('Failed to submit feedback');
    }
  });

  // Handle voting
  const voteMutation = useMutation({
    mutationFn: async ({ feedbackId, action }) => {
      // Use real API database
      const response = await feedbackService.vote(feedbackId, action);
      console.log('Vote recorded via API:', response.data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['feedback']);
    }
  });

  // Handle status change (developer only)
  const statusChangeMutation = useMutation({
    mutationFn: async ({ feedbackId, status, assigneeId, tags }) => {
      // Use real API database
      const response = await feedbackService.updateStatus(feedbackId, { status, assigneeId, tags });
      console.log('Status updated via API:', response.data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['feedback']);
      toast.success('Status updated successfully');
    }
  });

  const handleFeedbackClick = (feedback) => {
    setSelectedFeedback(feedback);
    setShowDrawer(true);
  };

  const handleVote = (feedbackId, action) => {
    voteMutation.mutate({ feedbackId, action });
  };

  const handleStatusChange = (feedbackId, updates) => {
    statusChangeMutation.mutate({
      feedbackId,
      ...updates
    });
  };

  
  const filteredFeedback = Array.isArray(feedbackData?.data) ? feedbackData.data : [];
  const unreadNotifications = Array.isArray(notifications) ? notifications.filter(n => !n.read) : [];
  
  console.log('=== FEEDBACK DEBUG ===');
  console.log('Current activeTab:', activeTab);
  console.log('feedbackData:', feedbackData);
  console.log('feedbackData type:', typeof feedbackData);
  console.log('feedbackData.data:', feedbackData?.data);
  console.log('feedbackData.data type:', typeof feedbackData?.data);
  console.log('filteredFeedback length:', filteredFeedback.length);
  console.log('filteredFeedback:', filteredFeedback);
  console.log('isLoading:', isLoading);
  console.log('error:', error);
  console.log('=== END DEBUG ===');
  
  // API Configuration Debug
  console.log('=== API CONFIGURATION ===');
  console.log('API Base URL:', window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : `${window.location.protocol}//${window.location.host}/api`);
  console.log('Current User:', currentUser?.id);
  console.log('=== END API CONFIG ===');

  return (
    <div className={`min-h-screen ${colorMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {/* Compact Header */}
      <div className={`border-b ${colorMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <NotificationBell 
                notifications={unreadNotifications} 
                colorMode={colorMode}
              />
              
              {/* Tabs - moved inline with notification bell */}
              <div className="flex items-center space-x-1">
                {['all', 'bugs', 'improvements', 'ideas', 'mine', 'following'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? colorMode
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-500 text-white'
                        : colorMode
                        ? 'text-gray-300 hover:text-white hover:bg-slate-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            <button
              onClick={() => setShowFeedbackForm(true)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                colorMode
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              Submit Feedback
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Simple Layout */}
      <div className="max-w-4xl mx-auto px-4 py-4">
            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search feedback..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    colorMode 
                      ? 'bg-slate-800 border-slate-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* Feedback List */}
            <div className="space-y-3">
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className={`animate-pulse ${colorMode ? 'bg-slate-800' : 'bg-white'} rounded-lg p-4`}>
                      <div className="flex items-center space-x-3 mb-3">
                        <div className={`h-8 w-8 rounded-lg ${colorMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
                        <div className="flex-1">
                          <div className={`h-4 w-3/4 rounded ${colorMode ? 'bg-slate-700' : 'bg-gray-200'} mb-2`}></div>
                          <div className={`h-3 w-1/2 rounded ${colorMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
                        </div>
                      </div>
                      <div className={`h-3 w-full rounded ${colorMode ? 'bg-slate-700' : 'bg-gray-200'} mb-2`}></div>
                      <div className={`h-3 w-2/3 rounded ${colorMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
                    </div>
                  ))}
                </div>
              ) : filteredFeedback.length === 0 ? (
                <div className={`text-center py-8 ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <MessageSquare className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No feedback found</h3>
                  <p>Try adjusting your filters or search terms.</p>
                </div>
              ) : (
                filteredFeedback.map((feedback) => (
                  <FeedbackCard
                    key={feedback.id}
                    feedback={feedback}
                    onClick={() => handleFeedbackClick(feedback)}
                    colorMode={colorMode}
                  />
                ))
              )}
            </div>
      </div>


      {/* Feedback Detail Drawer */}
      {showDrawer && selectedFeedback && (
        <FeedbackDrawer
          feedback={selectedFeedback}
          onClose={() => setShowDrawer(false)}
          onVote={handleVote}
          onStatusChange={handleStatusChange}
          colorMode={colorMode}
          currentUser={currentUser}
        />
      )}

      {/* Feedback Form Modal */}
      {showFeedbackForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-lg ${
            colorMode ? 'bg-slate-800' : 'bg-white'
          }`}>
            {/* Header */}
            <div className={`flex items-center justify-between p-6 border-b ${colorMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <h2 className={`text-2xl font-bold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                Submit Feedback
              </h2>
              <button
                onClick={() => setShowFeedbackForm(false)}
                className={`p-2 rounded-lg ${colorMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {/* Form Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <FeedbackForm
                onSubmit={async (data) => {
                  await submitFeedbackMutation.mutateAsync(data);
                  setShowFeedbackForm(false);
                }}
                onClose={() => setShowFeedbackForm(false)}
                colorMode={colorMode}
                currentUser={currentUser}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackHubPage;