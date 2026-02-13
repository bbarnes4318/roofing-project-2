import React from 'react';
import { FiMail, FiPaperclip, FiCheck, FiAlertCircle, FiClock } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';

const EmailHistoryList = ({ emails, onEmailClick, loading, emptyMessage }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-aqua-blue"></div>
      </div>
    );
  }

  if (!emails || emails.length === 0) {
    return (
      <div className="text-center py-12">
        <FiMail className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-500">{emptyMessage || 'No emails found'}</p>
      </div>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered':
      case 'opened':
        return <FiCheck className="text-semantic-success" />;
      case 'failed':
      case 'bounced':
        return <FiAlertCircle className="text-semantic-danger" />;
      default:
        return <FiClock className="text-brand-aqua-blue" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'opened':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
      case 'bounced':
        return 'bg-red-100 text-red-800';
      case 'sent':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEmailTypeLabel = (type) => {
    const labels = {
      project_update: 'Project Update',
      customer_communication: 'Customer',
      team_communication: 'Team',
      bubbles_ai: 'AI Assistant',
      general: 'General',
      notification: 'Notification',
      system: 'System'
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-3">
      {emails.map((email) => (
        <div
          key={email.id}
          onClick={() => onEmailClick && onEmailClick(email)}
          className="bg-white rounded-lg border border-border-silver p-4 hover:border-brand-aqua-blue hover:shadow-soft transition-all cursor-pointer"
        >
          <div className="flex items-start justify-between">
            {/* Left side - Email info */}
            <div className="flex-1 min-w-0">
              {/* Header row */}
              <div className="flex items-center gap-3 mb-2">
                {/* Sender avatar */}
                <div className="flex-shrink-0">
                  {email.sender?.avatar ? (
                    <img
                      src={email.sender.avatar}
                      alt={email.senderName}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#F8FAFC] flex items-center justify-center text-white font-semibold">
                      {email.senderName?.charAt(0) || email.senderEmail?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>

                {/* Sender name and time */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text-charcoal">
                      {email.senderName || email.senderEmail}
                    </span>
                    <span className="text-xs text-text-light-gray">
                      {formatDistanceToNow(new Date(email.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="text-sm text-text-light-gray">
                    to {email.toEmails?.join(', ') || 'recipients'}
                  </div>
                </div>

                {/* Status badge */}
                <div className="flex items-center gap-2">
                  {getStatusIcon(email.status)}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(email.status)}`}>
                    {email.status}
                  </span>
                </div>
              </div>

              {/* Subject */}
              <h4 className="font-semibold text-text-charcoal mb-1 truncate">
                {email.subject}
              </h4>

              {/* Preview text */}
              {email.bodyText && (
                <p className="text-sm text-text-light-gray line-clamp-2 mb-2">
                  {email.bodyText.substring(0, 150)}...
                </p>
              )}

              {/* Footer row */}
              <div className="flex items-center gap-3 text-xs text-text-light-gray">
                {/* Email type badge */}
                <span className="px-2 py-1 bg-brand-aqua-blue-light-tint text-brand-aqua-blue rounded-full">
                  {getEmailTypeLabel(email.emailType)}
                </span>

                {/* Project link */}
                {email.project && (
                  <span className="flex items-center gap-1">
                    <span className="font-medium">Project:</span>
                    {email.project.projectName}
                  </span>
                )}

                {/* Customer link */}
                {email.customer && (
                  <span className="flex items-center gap-1">
                    <span className="font-medium">Customer:</span>
                    {email.customer.primaryName}
                  </span>
                )}

                {/* Attachments indicator */}
                {email.attachments && email.attachments.length > 0 && (
                  <span className="flex items-center gap-1">
                    <FiPaperclip className="w-3 h-3" />
                    {email.attachments.length} attachment{email.attachments.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default EmailHistoryList;
