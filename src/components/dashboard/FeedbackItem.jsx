import React, { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp, AlertCircle, Lightbulb, Bug, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { feedbackService } from '../../services/api';
import { toast } from 'react-hot-toast';

const FeedbackItem = ({ 
  item, 
  projects = [], 
  colorMode = false, 
  onProjectSelect, 
  availableUsers = [], 
  currentUser, 
  onDelete, 
  isDeleting = false 
}) => {
  const [replies, setReplies] = useState([]);
  const [newReply, setNewReply] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);

  // Load replies when component mounts or when showReplies changes
  useEffect(() => {
    if (showReplies && replies.length === 0) {
      loadReplies();
    }
  }, [showReplies]);

  const loadReplies = async () => {
    setIsLoadingReplies(true);
    try {
      const response = await feedbackService.getComments(item.id);
      setReplies(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load replies:', error);
      toast.error('Failed to load replies');
    } finally {
      setIsLoadingReplies(false);
    }
  };

  const handleSubmitReply = async () => {
    if (!newReply.trim()) return;

    setIsSubmittingReply(true);
    try {
      const response = await feedbackService.addComment(item.id, {
        body: newReply,
        isDeveloper: currentUser?.role === 'DEVELOPER' || currentUser?.role === 'ADMIN',
        parentId: null
      });
      
      const reply = response.data;
      setReplies(prev => [reply, ...prev]);
      setNewReply('');
      toast.success('Reply posted successfully!');
    } catch (error) {
      console.error('Failed to submit reply:', error);
      toast.error('Failed to post reply. Please try again.');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'BUG':
        return <Bug className="h-4 w-4" />;
      case 'FEATURE':
        return <Lightbulb className="h-4 w-4" />;
      case 'IDEA':
        return <Lightbulb className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'BUG':
        return 'text-red-600 bg-red-100';
      case 'FEATURE':
        return 'text-[#EF946C] bg-[#FDF2E9]';
      case 'IDEA':
        return 'text-[#EF946C] bg-[#FDF2E9]';
      default:
        return 'text-[#EF946C] bg-[#FDF2E9]';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'LOW':
        return 'text-green-600 bg-green-100';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-100';
      case 'HIGH':
        return 'text-orange-600 bg-orange-100';
      case 'CRITICAL':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Just now';
    }
  };

  const project = projects.find(p => p.id === item.projectId);
  const author = availableUsers.find(u => u.id === item.authorId) || { firstName: 'Anonymous', lastName: '' };

  return (
    <div className={`p-4 ${colorMode ? 'bg-slate-800' : 'bg-white'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${getTypeColor(item.type)}`}>
            {getTypeIcon(item.type)}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className={`font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                {item.title}
              </h4>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(item.type)}`}>
                {item.type}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(item.severity)}`}>
                {item.severity}
              </span>
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`text-sm ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                by {author.firstName} {author.lastName}
              </span>
              <span className={`text-sm ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {formatDate(item.timestamp)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onDelete?.(item)}
            disabled={isDeleting}
            className={`p-1 rounded text-xs transition-colors ${
              colorMode 
                ? 'text-gray-400 hover:text-red-400 hover:bg-slate-700' 
                : 'text-gray-500 hover:text-red-500 hover:bg-gray-100'
            }`}
            title="Delete feedback"
          >
            {isDeleting ? '...' : '×'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={`mb-3 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {item.content || item.description}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Project Link */}
          {project && (
            <button
              onClick={() => onProjectSelect?.(project)}
              className={`text-xs font-medium transition-colors ${
                colorMode 
                  ? 'text-[#EF946C] hover:text-[#E67E22]' 
                  : 'text-[#EF946C] hover:text-[#E67E22]'
              }`}
            >
              #{project.projectNumber} - {project.customer?.name || project.clientName || project.name}
            </button>
          )}
          
          {/* Stats */}
          <div className="flex items-center space-x-3 text-xs text-gray-500">
            <span className="flex items-center space-x-1">
              <ThumbsUp className="h-3 w-3" />
              <span>{item.voteCount || 0}</span>
            </span>
            <span className="flex items-center space-x-1">
              <MessageSquare className="h-3 w-3" />
              <span>{item.commentCount || 0}</span>
            </span>
          </div>
        </div>

        {/* Status */}
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          item.status === 'RESOLVED' 
            ? 'text-green-600 bg-green-100' 
            : item.status === 'IN_PROGRESS'
            ? 'text-blue-600 bg-blue-100'
            : 'text-gray-600 bg-gray-100'
        }`}>
          {item.status || 'OPEN'}
        </div>
      </div>

      {/* Reply Section */}
      <div className="mt-4 border-t border-gray-200 pt-4">
        {/* Reply Toggle Button */}
        <button
          onClick={() => setShowReplies(!showReplies)}
          className={`flex items-center gap-2 text-sm font-medium transition-colors ${
            colorMode 
              ? 'text-[#EF946C] hover:text-[#E67E22]' 
              : 'text-[#EF946C] hover:text-[#E67E22]'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>{showReplies ? 'Hide' : 'Show'} Replies ({item.commentCount || 0})</span>
          {showReplies ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {/* Replies Section */}
        {showReplies && (
          <div className="mt-4 space-y-4">
            {/* Add Reply Form */}
            <div className={`p-4 rounded-lg border ${colorMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-start space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  colorMode ? 'bg-slate-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                  {currentUser?.firstName?.charAt(0) || 'U'}
                </div>
                <div className="flex-1">
                  <textarea
                    value={newReply}
                    onChange={(e) => setNewReply(e.target.value)}
                    placeholder="Add a reply..."
                    rows={3}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      colorMode 
                        ? 'bg-slate-600 border-slate-500 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:ring-2 focus:ring-[#EF946C] focus:border-transparent`}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={handleSubmitReply}
                      disabled={!newReply.trim() || isSubmittingReply}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        !newReply.trim() || isSubmittingReply
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-[#EF946C] text-white hover:bg-[#E67E22]'
                      }`}
                    >
                      <Send className="h-4 w-4" />
                      <span>{isSubmittingReply ? 'Posting...' : 'Post Reply'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Replies List */}
            {isLoadingReplies ? (
              <div className="text-center py-4">
                <div className={`text-sm ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Loading replies...
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {replies.map((reply) => (
                  <div key={reply.id} className={`p-3 rounded-lg border ${
                    reply.isPinned 
                      ? 'border-yellow-300 bg-yellow-50' 
                      : colorMode 
                      ? 'bg-slate-700 border-slate-600' 
                      : 'bg-white border-gray-200'
                  }`}>
                    <div className="flex items-start space-x-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        reply.isDeveloper
                          ? 'bg-blue-500 text-white'
                          : colorMode 
                          ? 'bg-slate-600 text-white' 
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {reply.author?.name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`text-sm font-medium ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                            {reply.author?.name || 'Anonymous'}
                          </span>
                          {reply.isDeveloper && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Developer
                            </span>
                          )}
                          <span className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {new Date(reply.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className={`text-sm whitespace-pre-wrap ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {reply.body}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {replies.length === 0 && (
                  <div className={`text-center py-4 text-sm ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    No replies yet. Be the first to reply!
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackItem;
