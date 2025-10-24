import React, { useState, useEffect } from 'react';

const FollowUpTracking = ({ colorMode }) => {
  const [tracking, setTracking] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFollowUpData();
  }, []);

  const loadFollowUpData = async () => {
    try {
      const [trackingResponse, statsResponse] = await Promise.all([
        fetch('/api/follow-up/tracking', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }),
        fetch('/api/follow-up/stats', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
      ]);

      const [trackingData, statsData] = await Promise.all([
        trackingResponse.json(),
        statsResponse.json()
      ]);

      if (trackingData.success) {
        setTracking(trackingData.data.tracking);
      }
      if (statsData.success) {
        setStats(statsData.data);
      }
    } catch (error) {
      console.error('Error loading follow-up data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelFollowUp = async (followUpId, reason) => {
    try {
      const response = await fetch(`/api/follow-up/tracking/${followUpId}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reason })
      });

      const data = await response.json();
      if (data.success) {
        loadFollowUpData(); // Reload data
      }
    } catch (error) {
      console.error('Error cancelling follow-up:', error);
    }
  };

  const handleCompleteFollowUp = async (followUpId) => {
    try {
      const response = await fetch(`/api/follow-up/tracking/${followUpId}/complete`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        loadFollowUpData(); // Reload data
      }
    } catch (error) {
      console.error('Error completing follow-up:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-100';
      case 'SENT':
        return 'text-blue-600 bg-blue-100';
      case 'COMPLETED':
        return 'text-green-600 bg-green-100';
      case 'CANCELLED':
        return 'text-gray-600 bg-gray-100';
      case 'FAILED':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <div className={`p-2 rounded border ${colorMode ? 'bg-[#181f3a] border-[#3b82f6]' : 'bg-white border-gray-200'}`}>
          <div className={`text-xs font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Total</div>
          <div className={`text-lg font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{stats.total || 0}</div>
        </div>
        <div className={`p-2 rounded border ${colorMode ? 'bg-[#181f3a] border-[#3b82f6]' : 'bg-white border-gray-200'}`}>
          <div className={`text-xs font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Pending</div>
          <div className={`text-lg font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{stats.pending || 0}</div>
        </div>
        <div className={`p-2 rounded border ${colorMode ? 'bg-[#181f3a] border-[#3b82f6]' : 'bg-white border-gray-200'}`}>
          <div className={`text-xs font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Completed</div>
          <div className={`text-lg font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{stats.completed || 0}</div>
        </div>
        <div className={`p-2 rounded border ${colorMode ? 'bg-[#181f3a] border-[#3b82f6]' : 'bg-white border-gray-200'}`}>
          <div className={`text-xs font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Cancelled</div>
          <div className={`text-lg font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{stats.cancelled || 0}</div>
        </div>
        <div className={`p-2 rounded border ${colorMode ? 'bg-[#181f3a] border-[#3b82f6]' : 'bg-white border-gray-200'}`}>
          <div className={`text-xs font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Overdue</div>
          <div className={`text-lg font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{stats.overdue || 0}</div>
        </div>
      </div>

      {/* Follow-up List */}
      <div className="space-y-2">
        {tracking.length === 0 ? (
          <div className={`text-center py-8 ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
            No follow-ups found
          </div>
        ) : (
          tracking.map((followUp) => (
            <div
              key={followUp.id}
              className={`p-4 rounded border ${colorMode ? 'bg-[#181f3a] border-[#3b82f6]' : 'bg-white border-gray-200'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(followUp.status)}`}>
                      {followUp.status}
                    </span>
                    <span className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {followUp.originalItemType}
                    </span>
                  </div>
                  <div className={`text-sm ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                    Project: {followUp.project.projectName} (#{followUp.project.projectNumber})
                  </div>
                  <div className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Scheduled for: {formatDate(followUp.scheduledFor)}
                  </div>
                  {followUp.metadata && (
                    <div className={`text-xs mt-1 ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {followUp.originalItemType === 'TASK' && (
                        <>
                          <div>Task: {followUp.metadata.taskTitle}</div>
                          <div>Priority: {followUp.metadata.taskPriority}</div>
                          {followUp.metadata.taskDueDate && (
                            <div>Due: {new Date(followUp.metadata.taskDueDate).toLocaleDateString()}</div>
                          )}
                        </>
                      )}
                      {followUp.originalItemType === 'WORKFLOW_ALERT' && (
                        <>
                          <div>Alert: {followUp.metadata.alertTitle}</div>
                          <div>Priority: {followUp.metadata.alertPriority}</div>
                          {followUp.metadata.stepName && (
                            <div>Step: {followUp.metadata.stepName}</div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  {followUp.followUpMessage && (
                    <div className={`text-xs mt-1 ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      Follow-up Message: {followUp.followUpMessage}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {followUp.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleCompleteFollowUp(followUp.id)}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => handleCancelFollowUp(followUp.id, 'User cancelled')}
                        className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {followUp.status === 'SENT' && (
                    <button
                      onClick={() => handleCompleteFollowUp(followUp.id)}
                      className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                    >
                      Mark Complete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FollowUpTracking;
