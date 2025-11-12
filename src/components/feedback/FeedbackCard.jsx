import React, { useState } from 'react';
import { 
  ThumbsUp, 
  MessageCircle, 
  Eye, 
  Clock, 
  User, 
  Tag, 
  AlertTriangle, 
  Wrench, 
  Lightbulb,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Pause
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const FeedbackCard = ({ feedback, currentUser, onVote, onClick, colorMode }) => {
  const [isVoting, setIsVoting] = useState(false);

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

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN':
        return 'green';
      case 'IN_REVIEW':
        return 'yellow';
      case 'PLANNED':
        return 'blue';
      case 'IN_PROGRESS':
        return 'purple';
      case 'DONE':
        return 'green';
      case 'CLOSED':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'OPEN':
        return AlertCircle;
      case 'IN_REVIEW':
        return Eye;
      case 'PLANNED':
        return Clock;
      case 'IN_PROGRESS':
        return Play;
      case 'DONE':
        return CheckCircle;
      case 'CLOSED':
        return XCircle;
      default:
        return AlertCircle;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'LOW':
        return 'green';
      case 'MEDIUM':
        return 'yellow';
      case 'HIGH':
        return 'orange';
      case 'CRITICAL':
        return 'red';
      default:
        return 'gray';
    }
  };

  const handleVote = async (e) => {
    e.stopPropagation();
    if (isVoting) return;
    
    setIsVoting(true);
    try {
      await onVote(feedback.id, feedback.hasVoted);
    } finally {
      setIsVoting(false);
    }
  };

  const TypeIcon = getTypeIcon(feedback.type);
  const StatusIcon = getStatusIcon(feedback.status);
  const typeColor = getTypeColor(feedback.type);
  const statusColor = getStatusColor(feedback.status);
  const severityColor = getSeverityColor(feedback.severity);

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg mb-4 ${
        colorMode 
          ? 'bg-slate-800 border-slate-600 shadow-slate-900/20' 
          : 'bg-white border-gray-300 shadow-gray-200/50'
      } border-2 border-l-4 border-l-${typeColor}-500 rounded-xl p-5 hover:scale-[1.01] hover:shadow-xl`}
      style={{
        boxShadow: colorMode 
          ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)' 
          : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg bg-${typeColor}-100 border border-${typeColor}-200`}>
            <TypeIcon className={`h-5 w-5 text-${typeColor}-600`} />
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${colorMode ? 'text-white' : 'text-gray-900'} line-clamp-2`}>
              {feedback.title}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${typeColor}-100 text-${typeColor}-800`}>
                {feedback.type}
              </span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${statusColor}-100 text-${statusColor}-800`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {feedback.status.replace('_', ' ')}
              </span>
              {feedback.severity && (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${severityColor}-100 text-${severityColor}-800`}>
                  {feedback.severity}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>{formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true })}</span>
          </div>
        </div>
      </div>

      {/* Description Preview */}
      <div className={`mb-3 ${colorMode ? 'text-gray-300' : 'text-gray-600'} line-clamp-2`}>
        {feedback.description}
      </div>

      {/* Attachments - Display images inline */}
      {feedback.attachments && Array.isArray(feedback.attachments) && feedback.attachments.length > 0 && (
        <div className="mb-3 space-y-2">
          {feedback.attachments
            .filter(att => att.isImage && att.dataUrl)
            .slice(0, 3) // Show max 3 images in card preview
            .map((att, index) => (
              <div key={index} className="rounded-lg overflow-hidden border border-gray-300 max-w-full">
                <img 
                  src={att.dataUrl} 
                  alt={att.name || `Attachment ${index + 1}`}
                  className="w-full h-auto max-h-48 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Open image in new tab/window for full view
                    const newWindow = window.open();
                    if (newWindow) {
                      newWindow.document.write(`<img src="${att.dataUrl}" style="max-width: 100%; height: auto;" />`);
                    }
                  }}
                />
              </div>
            ))}
          {feedback.attachments.filter(att => att.isImage && att.dataUrl).length > 3 && (
            <div className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
              +{feedback.attachments.filter(att => att.isImage && att.dataUrl).length - 3} more image(s)
            </div>
          )}
        </div>
      )}

      {/* Tags */}
      {feedback.tags && feedback.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {feedback.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                colorMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <Tag className="h-3 w-3 mr-1" />
              {tag}
            </span>
          ))}
          {feedback.tags.length > 3 && (
            <span className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
              +{feedback.tags.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Vote Button */}
          <button
            onClick={handleVote}
            disabled={isVoting}
            className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
              feedback.hasVoted
                ? 'bg-blue-100 text-blue-700'
                : colorMode
                ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <ThumbsUp className={`h-4 w-4 ${feedback.hasVoted ? 'text-blue-600' : ''}`} />
            <span className="text-sm font-medium">{feedback.voteCount || 0}</span>
          </button>

          {/* Comments */}
          <div className="flex items-center space-x-1 text-sm text-gray-500">
            <MessageCircle className="h-4 w-4" />
            <span>{feedback.commentCount || 0}</span>
          </div>

          {/* Assignee */}
          {feedback.assignee && (
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <User className="h-4 w-4" />
              <span>{feedback.assignee.name}</span>
            </div>
          )}
        </div>

        {/* Author */}
        <div className="flex items-center space-x-2">
          {feedback.author?.avatar ? (
            <img 
              src={feedback.author.avatar} 
              alt={feedback.author?.name || 'User'} 
              className="w-8 h-8 rounded-full object-cover border-2 border-gray-300"
              onError={(e) => {
                // Fallback to initials if image fails to load
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              colorMode ? 'bg-slate-700 text-white' : 'bg-gray-200 text-gray-700'
            }`}
            style={{ display: feedback.author?.avatar ? 'none' : 'flex' }}
          >
            {feedback.author?.name?.charAt(0) || 'U'}
          </div>
          <div className="text-sm">
            <div className={`font-medium ${colorMode ? 'text-white' : 'text-gray-900'}`}>
              {feedback.author?.name || 'Anonymous'}
            </div>
            <div className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true })}
            </div>
          </div>
        </div>
      </div>

      {/* Developer Response Indicator */}
      {feedback.developerResponseCount > 0 && (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-blue-800">
              {feedback.developerResponseCount} developer response{feedback.developerResponseCount !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-blue-600 ml-auto">Click to view</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackCard;
