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
  Send,
  Image,
  FileText
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { feedbackService } from '../../services/api';
import { mockFeedbackService } from '../../services/mockFeedbackService';
import { toast } from 'react-hot-toast';

const FeedbackDrawer = ({ feedback, currentUser, onClose, onStatusChange, colorMode }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentAttachments, setCommentAttachments] = useState([]);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');

  // Load comments when component mounts
  useEffect(() => {
    const loadComments = async () => {
      try {
        // Use real API database
        const response = await feedbackService.getComments(feedback.id);
        console.log('Comments loaded via API:', response.data);
        
        // Check if response has expected structure
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          setComments(response.data.data);
        } else {
          console.error('Invalid comments response structure:', response.data);
          setComments([]);
        }
      } catch (error) {
        console.error('Failed to load comments:', error);
        setComments([]);
      }
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

  // Helper function to convert file to data URL
  const fileToDataURL = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Process files for comment attachments
  const processCommentFiles = async (files) => {
    const validFiles = [];
    const rejectedFiles = [];

    for (const file of files) {
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      const isValidType = file.type.startsWith('image/');
      
      if (isValidSize && isValidType) {
        try {
          const dataUrl = await fileToDataURL(file);
          validFiles.push({
            name: file.name,
            type: file.type,
            size: file.size,
            dataUrl,
            isImage: true
          });
        } catch (error) {
          console.error('Error processing image:', error);
          rejectedFiles.push(file.name);
        }
      } else {
        rejectedFiles.push(file.name);
      }
    }

    if (rejectedFiles.length > 0) {
      toast.error('Some images were rejected. Only images up to 10MB are allowed.');
    }

    if (validFiles.length > 0) {
      setCommentAttachments(prev => [...prev, ...validFiles]);
      toast.success(`Added ${validFiles.length} image(s)`);
    }
  };

  // Handle paste for comment textarea
  const handleCommentPaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        if (blob) {
          const file = new File([blob], `snippet-${Date.now()}.png`, { type: blob.type });
          imageFiles.push(file);
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      await processCommentFiles(imageFiles);
      toast.success(`Pasted ${imageFiles.length} image(s) from clipboard`);
    }
  };

  const removeCommentAttachment = (index) => {
    setCommentAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Handle comment deletion
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
      return;
    }

    try {
      await feedbackService.deleteComment(feedback.id, commentId);
      setComments(prev => prev.filter(comment => comment.id !== commentId));
      toast.success('Comment deleted successfully');
    } catch (error) {
      console.error('Failed to delete comment:', error);
      toast.error('Failed to delete comment. Please try again.');
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() && commentAttachments.length === 0) return;

    setIsSubmittingComment(true);
    try {
      // Build comment body with text and embedded images
      let commentBody = newComment.trim();
      
      // Add images as HTML img tags if there are attachments
      if (commentAttachments.length > 0) {
        const imageHtml = commentAttachments
          .filter(att => att.isImage && att.dataUrl)
          .map(att => `<img src="${att.dataUrl}" alt="${att.name || 'Image'}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;" />`)
          .join('\n');
        
        if (commentBody) {
          commentBody = commentBody + '\n\n' + imageHtml;
        } else {
          commentBody = imageHtml;
        }
      }

      // Use real API database
      const response = await feedbackService.addComment(feedback.id, {
        body: commentBody,
        isDeveloper: isDeveloper,
        parentId: null
      });
      
      console.log('Comment created via API:', response.data);
      console.log('Comment ID from API:', response.data?.data?.id);
      console.log('Full comment object:', JSON.stringify(response.data, null, 2));
      
      // Check if the response has the expected structure
      if (!response.data || !response.data.success) {
        console.error('Invalid API response structure:', response.data);
        toast.error('Invalid response from server');
        return;
      }
      
      if (!response.data.data || !response.data.data.id) {
        console.error('Comment created but no ID returned from API:', response.data);
        toast.error('Comment created but missing ID');
        return;
      }
      
      const comment = response.data.data;
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
      setCommentAttachments([]);
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

            {/* Attachments - Display images inline */}
            {feedback.attachments && Array.isArray(feedback.attachments) && feedback.attachments.length > 0 && (
              <div className="mt-6">
                <h4 className={`text-sm font-medium mb-3 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Attachments ({feedback.attachments.length})
                </h4>
                <div className="space-y-4">
                  {feedback.attachments.map((attachment, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${
                      colorMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {attachment.isImage ? (
                            <Image className="h-4 w-4 text-blue-500" />
                          ) : (
                            <FileText className="h-4 w-4 text-red-500" />
                          )}
                          <span className={`text-sm font-medium ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                            {attachment.name || `Attachment ${index + 1}`}
                          </span>
                          {attachment.size && (
                            <span className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              ({(attachment.size / 1024 / 1024).toFixed(1)}MB)
                            </span>
                          )}
                        </div>
                      </div>
                      {attachment.isImage && attachment.dataUrl && (
                        <div className="mt-3 rounded-lg overflow-hidden border border-gray-300 max-w-2xl">
                          <img 
                            src={attachment.dataUrl} 
                            alt={attachment.name || `Attachment ${index + 1}`}
                            className="w-full h-auto max-h-96 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => {
                              // Open image in new tab/window for full view
                              const newWindow = window.open();
                              if (newWindow) {
                                newWindow.document.write(`
                                  <html>
                                    <head><title>${attachment.name || 'Image'}</title></head>
                                    <body style="margin: 0; padding: 20px; background: #1e1e1e; display: flex; justify-content: center; align-items: center; min-height: 100vh;">
                                      <img src="${attachment.dataUrl}" style="max-width: 100%; height: auto; border-radius: 8px;" />
                                    </body>
                                  </html>
                                `);
                              }
                            }}
                          />
                        </div>
                      )}
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
                      onPaste={handleCommentPaste}
                      placeholder="Add a comment... (You can paste images from clipboard)"
                      rows={3}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        colorMode 
                          ? 'bg-slate-600 border-slate-500 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                    
                    {/* Comment Attachments Preview */}
                    {commentAttachments.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {commentAttachments.map((att, index) => (
                          <div key={index} className={`relative inline-block rounded-lg overflow-hidden border ${
                            colorMode ? 'border-slate-500' : 'border-gray-300'
                          }`}>
                            <img 
                              src={att.dataUrl} 
                              alt={att.name || `Attachment ${index + 1}`}
                              className="max-w-xs h-auto max-h-32 object-contain"
                            />
                            <button
                              type="button"
                              onClick={() => removeCommentAttachment(index)}
                              className={`absolute top-1 right-1 p-1 rounded-full ${
                                colorMode ? 'bg-slate-800 text-white' : 'bg-white text-gray-700'
                              } hover:bg-red-500 hover:text-white transition-colors`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center mt-2">
                      <div className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        💡 Tip: Paste images directly from clipboard (e.g., Windows Snipping Tool)
                      </div>
                      <button
                        onClick={handleSubmitComment}
                        disabled={(!newComment.trim() && commentAttachments.length === 0) || isSubmittingComment}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                          (!newComment.trim() && commentAttachments.length === 0) || isSubmittingComment
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
                {console.log('Total comments in state:', comments.length, comments)}
                {Array.isArray(comments) && comments.length > 0 ? (
                  comments.map((comment, index) => {
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
                        {comment.author?.avatar ? (
                          <img 
                            src={comment.author.avatar} 
                            alt={comment.author?.name || 'User'} 
                            className={`w-8 h-8 rounded-full object-cover ${
                              comment.isDeveloper ? 'border-2 border-blue-500' : 'border-2 border-gray-300'
                            }`}
                            onError={(e) => {
                              // Fallback to initials if image fails to load
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            comment.isDeveloper
                              ? 'bg-blue-500 text-white'
                              : colorMode 
                              ? 'bg-slate-600 text-white' 
                              : 'bg-gray-200 text-gray-700'
                          }`}
                          style={{ display: comment.author?.avatar ? 'none' : 'flex' }}
                        >
                          {comment.author?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
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
                            {currentUser?.id === comment.author?.id && (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  colorMode 
                                    ? 'hover:bg-red-900/20 text-red-400 hover:text-red-300' 
                                    : 'hover:bg-red-50 text-red-600 hover:text-red-700'
                                }`}
                                title="Delete this comment"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          <div className={`${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {comment.body && (comment.body.includes('<img') || comment.body.includes('data:image')) ? (
                              // Render HTML content (includes images)
                              <div 
                                dangerouslySetInnerHTML={{ 
                                  __html: comment.body
                                    .replace(/\n/g, '<br>')
                                    .replace(/&lt;img/g, '<img')
                                    .replace(/&gt;/g, '>')
                                    .replace(/&quot;/g, '"')
                                    .replace(/&#x27;/g, "'")
                                    .replace(/&amp;/g, '&')
                                }}
                                className="comment-content [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-2 [&_img]:block"
                                style={{
                                  wordBreak: 'break-word'
                                }}
                              />
                            ) : (
                              // Render plain text content
                              <div className="whitespace-pre-wrap">
                                {comment.body}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No comments yet</p>
                    <p className="text-sm text-gray-400 mt-2">Be the first to comment on this feedback</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FeedbackDrawer;
