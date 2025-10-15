import React, { useState, useEffect } from 'react';
import { 
  X, 
  MessageCircle, 
  ThumbsUp, 
  Tag, 
  User, 
  Clock, 
  AlertTriangle, 
  Wrench, 
  Lightbulb,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Pause,
  Pin,
  Lock,
  Unlock,
  Plus,
  Send
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { feedbackService } from '../../services/api';
import { mockFeedbackService } from '../../services/mockFeedbackService';
import { toast } from 'react-hot-toast';

const FeedbackDrawer = ({ feedback, currentUser, onClose, onStatusChange, colorMode }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');

  // Load comments when component mounts
  useEffect(() => {
    const loadComments = async () => {
      // Use real API database
      const response = await feedbackService.getComments(feedback.id);
      console.log('Comments loaded via API:', response.data);
      setComments(Array.isArray(response.data) ? response.data : []);
    };

    loadComments();
  }, [feedback.id]);

  // Handle escape key to close drawer
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const isDeveloper = currentUser?.role === 'DEVELOPER' || currentUser?.role === 'ADMIN';

  const statusOptions = [
    { value: 'OPEN', label: 'Open', icon: AlertCircle, color: 'green' },
    { value: 'IN_REVIEW', label: 'In Review', icon: Clock, color: 'yellow' },
    { value: 'PLANNED', label: 'Planned', icon: CheckCircle, color: 'blue' },
    { value: 'IN_PROGRESS', label: 'In Progress', icon: Play, color: 'purple' },
    { value: 'DONE', label: 'Done', icon: CheckCircle, color: 'green' },
    { value: 'CLOSED', label: 'Closed', icon: XCircle, color: 'gray' }
  ];

  const severityOptions = [
    { value: 'LOW', label: 'Low', color: 'green' },
    { value: 'MEDIUM', label: 'Medium', color: 'yellow' },
    { value: 'HIGH', label: 'High', color: 'orange' },
    { value: 'CRITICAL', label: 'Critical', color: 'red' }
  ];

  const getTypeIcon = (type) => {
    switch (type) {
      case 'BUG':
        return AlertTriangle;
      case 'IMPROVEMENT':
        return Wrench;
      case 'IDEA':
        return Lightbulb;
      default:
        return AlertTriangle;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'BUG':
        return 'red';
      case 'IMPROVEMENT':
        return 'blue';
      case 'IDEA':
        return 'green';
      default:
        return 'gray';
    }
  };

  const handleStatusChange = (status) => {
    onStatusChange(feedback.id, { status });
    setShowStatusMenu(false);
  };

  const handleSeverityChange = (severity) => {
    onStatusChange(feedback.id, { severity });
  };

  const handleAssigneeChange = (assigneeId) => {
    onStatusChange(feedback.id, { assigneeId });
    setShowAssigneeMenu(false);
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      const updatedTags = [...(feedback.tags || []), newTag.trim()];
      onStatusChange(feedback.id, { tags: updatedTags });
      setNewTag('');
      setShowTagInput(false);
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    const updatedTags = feedback.tags?.filter(tag => tag !== tagToRemove) || [];
    onStatusChange(feedback.id, { tags: updatedTags });
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      // Use real API database
      const response = await feedbackService.addComment(feedback.id, {
        body: newComment,
        isDeveloper: isDeveloper,
        parentId: null
      });
      
      console.log('Comment created via API:', response.data);
      console.log('Comment ID from API:', response.data?.id);
      console.log('Full comment object:', JSON.stringify(response.data, null, 2));
      
      if (!response.data?.id) {
        console.error('Comment created but no ID returned from API');
        toast.error('Comment created but missing ID');
        return;
      }
      
      const comment = response.data;
      console.log('Adding comment to state:', comment);
      setComments(prev => {
        const newComments = [comment, ...prev];
        console.log('Previous comments:', prev);
        console.log('New comment being added:', comment);
        console.log('New comments state:', newComments);
        console.log('New comments length:', newComments.length);
        return newComments;
      });
      setNewComment('');
      toast.success('Comment posted successfully!');
    } catch (error) {
      console.error('Failed to submit comment:', error);
      toast.error('Failed to post comment. Please try again.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const TypeIcon = getTypeIcon(feedback.type);
  const typeColor = getTypeColor(feedback.type);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={`w-full max-w-2xl h-full ${colorMode ? 'bg-slate-800' : 'bg-white'} shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${colorMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg bg-${typeColor}-100`}>
              <TypeIcon className={`h-5 w-5 text-${typeColor}-600`} />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                {feedback.title}
              </h2>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${typeColor}-100 text-${typeColor}-800`}>
                  {feedback.type}
                </span>
                <span className={`text-sm ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  #{feedback.id.slice(-6)}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${colorMode ? 'hover:bg-slate-700 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}`}
            title="Close (Esc)"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-200px)]">
          {/* Feedback Content */}
          <div className="p-6">
            <div className={`prose max-w-none ${colorMode ? 'prose-invert' : ''}`}>
              <div className={`whitespace-pre-wrap ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {feedback.description}
              </div>
            </div>

            {/* Attachments */}
            {feedback.attachments && feedback.attachments.length > 0 && (
              <div className="mt-6">
                <h4 className={`text-sm font-medium mb-3 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Attachments
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {feedback.attachments.map((attachment, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${colorMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center space-x-2">
                        <div className="text-sm font-medium">{attachment.name}</div>
                        <div className="text-xs text-gray-500">({(attachment.size / 1024 / 1024).toFixed(1)}MB)</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Developer Controls */}
            {isDeveloper && (
              <div className="mt-6 p-4 rounded-lg border border-blue-200 bg-blue-50">
                <h4 className="text-sm font-medium text-blue-800 mb-3">Developer Controls</h4>
                <div className="flex flex-wrap gap-2">
                  {/* Status Change */}
                  <div className="relative">
                    <button
                      onClick={() => setShowStatusMenu(!showStatusMenu)}
                      className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50"
                    >
                      <span className="text-sm">Status</span>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">{feedback.status}</span>
                    </button>
                    {showStatusMenu && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                        {statusOptions.map((option) => {
                          const OptionIcon = option.icon;
                          return (
                            <button
                              key={option.value}
                              onClick={() => handleStatusChange(option.value)}
                              className="w-full flex items-center space-x-2 px-3 py-2 text-left hover:bg-gray-50"
                            >
                              <OptionIcon className="h-4 w-4" />
                              <span className="text-sm">{option.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Severity Change */}
                  <div className="relative">
                    <select
                      value={feedback.severity || 'MEDIUM'}
                      onChange={(e) => handleSeverityChange(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm"
                    >
                      {severityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Assignee */}
                  <div className="relative">
                    <button
                      onClick={() => setShowAssigneeMenu(!showAssigneeMenu)}
                      className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50"
                    >
                      <User className="h-4 w-4" />
                      <span className="text-sm">Assign</span>
                    </button>
                    {showAssigneeMenu && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                        <button
                          onClick={() => handleAssigneeChange(null)}
                          className="w-full flex items-center space-x-2 px-3 py-2 text-left hover:bg-gray-50"
                        >
                          <span className="text-sm">Unassigned</span>
                        </button>
                        {/* In production, this would show actual team members */}
                        <button
                          onClick={() => handleAssigneeChange('dev1')}
                          className="w-full flex items-center space-x-2 px-3 py-2 text-left hover:bg-gray-50"
                        >
                          <span className="text-sm">John Developer</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags */}
                <div className="mt-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <Tag className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Tags</span>
                    <button
                      onClick={() => setShowTagInput(!showTagInput)}
                      className="text-blue-500 hover:text-blue-600"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {feedback.tags?.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700"
                      >
                        <span>{tag}</span>
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="text-gray-500 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  {showTagInput && (
                    <div className="flex items-center space-x-2 mt-2">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Add tag..."
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                      />
                      <button
                        onClick={handleAddTag}
                        className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Comments Section */}
            <div className="mt-8">
              <h4 className={`text-lg font-semibold mb-4 ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                Comments ({comments.length})
              </h4>
              {console.log('Total comments in state:', comments.length, comments)}

              {/* Add Comment */}
              <div className={`mb-6 p-4 rounded-lg border ${colorMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-start space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    colorMode ? 'bg-slate-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {currentUser?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      rows={3}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        colorMode 
                          ? 'bg-slate-600 border-slate-500 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={handleSubmitComment}
                        disabled={!newComment.trim() || isSubmittingComment}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                          !newComment.trim() || isSubmittingComment
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        <Send className="h-4 w-4" />
                        <span>{isSubmittingComment ? 'Posting...' : 'Post Comment'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments List */}
              <div className="space-y-4">
                {Array.isArray(comments) && comments.map((comment, index) => {
                  console.log('Rendering comment:', comment.id, 'at index:', index);
                  return (
                  <div key={comment.id || `comment-${index}-${Date.now()}`} className={`p-4 rounded-lg border ${
                    comment.isPinned 
                      ? 'border-yellow-300 bg-yellow-50' 
                      : colorMode 
                      ? 'bg-slate-700 border-slate-600' 
                      : 'bg-white border-gray-200'
                  }`}>
                    <div className="flex items-start space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        comment.isDeveloper
                          ? 'bg-blue-500 text-white'
                          : colorMode 
                          ? 'bg-slate-600 text-white' 
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {comment.author?.name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`font-medium ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                            {comment.author?.name || 'Anonymous'}
                          </span>
                          {comment.isDeveloper && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Developer
                            </span>
                          )}
                          {comment.isPinned && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <Pin className="h-3 w-3 mr-1" />
                              Pinned
                            </span>
                          )}
                          <span className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {(() => {
                              try {
                                if (!comment.createdAt) return 'Just now';
                                const date = new Date(comment.createdAt);
                                if (isNaN(date.getTime())) return 'Just now';
                                return formatDistanceToNow(date, { addSuffix: true });
                              } catch (error) {
                                return 'Just now';
                              }
                            })()}
                          </span>
                        </div>
                        <div className={`whitespace-pre-wrap ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {comment.body}
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FeedbackDrawer;
