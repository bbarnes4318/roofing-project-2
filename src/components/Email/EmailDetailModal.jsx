import React, { useState, useEffect } from 'react';
import { FiX, FiMail, FiPaperclip, FiDownload, FiExternalLink, FiCheck, FiAlertCircle, FiClock } from 'react-icons/fi';
import { format } from 'date-fns';

const EmailDetailModal = ({ emailId, email: initialEmail, onClose }) => {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(!initialEmail);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!initialEmail && emailId) {
      fetchEmailDetails();
    }
  }, [emailId, initialEmail]);

  const fetchEmailDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/email/${emailId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch email details');

      const data = await response.json();
      setEmail(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

  if (!email && !loading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-silver bg-gradient-to-r from-brand-aqua-blue to-accent-vibrant-green">
          <div className="flex items-center gap-3 text-white">
            <FiMail className="w-6 h-6" />
            <h2 className="text-xl font-bold">Email Details</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-aqua-blue"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <FiAlertCircle className="mx-auto h-12 w-12 text-semantic-danger mb-4" />
              <p className="text-semantic-danger">{error}</p>
            </div>
          ) : email ? (
            <div className="space-y-6">
              {/* Email Header Info */}
              <div className="bg-background-ash rounded-lg p-4 space-y-3">
                {/* Subject */}
                <div>
                  <label className="text-sm font-semibold text-text-light-gray block mb-1">Subject</label>
                  <h3 className="text-xl font-bold text-text-charcoal">{email.subject}</h3>
                </div>

                {/* From */}
                <div className="flex items-center gap-3">
                  <label className="text-sm font-semibold text-text-light-gray w-20">From:</label>
                  <div className="flex items-center gap-2">
                    {email.sender?.avatar ? (
                      <img
                        src={email.sender.avatar}
                        alt={email.senderName}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-aqua-blue to-accent-vibrant-green flex items-center justify-center text-white text-sm font-semibold">
                        {email.senderName?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-text-charcoal">{email.senderName}</div>
                      <div className="text-sm text-text-light-gray">{email.senderEmail}</div>
                    </div>
                  </div>
                </div>

                {/* To */}
                <div className="flex items-start gap-3">
                  <label className="text-sm font-semibold text-text-light-gray w-20 pt-1">To:</label>
                  <div className="flex-1">
                    {email.toEmails?.map((toEmail, index) => (
                      <div key={index} className="text-text-charcoal">
                        {email.toNames?.[index] && <span className="font-medium">{email.toNames[index]} </span>}
                        <span className="text-text-light-gray">&lt;{toEmail}&gt;</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Date & Status */}
                <div className="flex items-center gap-6 pt-2 border-t border-border-silver">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-text-light-gray">Sent:</label>
                    <span className="text-text-charcoal">
                      {format(new Date(email.sentAt || email.createdAt), 'PPpp')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(email.status)}
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(email.status)}`}>
                      {email.status}
                    </span>
                  </div>
                </div>

                {/* Project/Customer Links */}
                {(email.project || email.customer || email.task) && (
                  <div className="flex items-center gap-4 pt-2 border-t border-border-silver">
                    {email.project && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text-light-gray">Project:</span>
                        <span className="text-brand-aqua-blue font-medium">
                          {email.project.projectName} (#{email.project.projectNumber})
                        </span>
                      </div>
                    )}
                    {email.customer && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text-light-gray">Customer:</span>
                        <span className="text-text-charcoal font-medium">{email.customer.primaryName}</span>
                      </div>
                    )}
                    {email.task && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text-light-gray">Task:</span>
                        <span className="text-text-charcoal font-medium">{email.task.title}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Attachments */}
              {email.attachments && email.attachments.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-text-charcoal mb-3 flex items-center gap-2">
                    <FiPaperclip className="w-4 h-4" />
                    Attachments ({email.attachments.length})
                  </h4>
                  <div className="space-y-2">
                    {email.attachments.map((attachment, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-background-ash rounded-lg border border-border-silver hover:border-brand-aqua-blue transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <FiPaperclip className="w-5 h-5 text-brand-aqua-blue" />
                          <div>
                            <div className="font-medium text-text-charcoal">{attachment.filename}</div>
                            {attachment.size && (
                              <div className="text-sm text-text-light-gray">
                                {(attachment.size / 1024).toFixed(2)} KB
                              </div>
                            )}
                          </div>
                        </div>
                        <button className="text-brand-aqua-blue hover:text-brand-deep-teal p-2 rounded-lg hover:bg-brand-aqua-blue-light-tint transition-colors">
                          <FiDownload className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Email Body */}
              <div>
                <h4 className="text-sm font-semibold text-text-charcoal mb-3">Message</h4>
                {email.bodyHtml ? (
                  <div
                    className="prose max-w-none bg-white border border-border-silver rounded-lg p-6"
                    dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
                  />
                ) : (
                  <div className="bg-white border border-border-silver rounded-lg p-6 whitespace-pre-wrap">
                    {email.bodyText}
                  </div>
                )}
              </div>

              {/* Tracking Info */}
              {(email.deliveredAt || email.openedAt || email.clickedAt) && (
                <div className="bg-background-ash rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-text-charcoal mb-3">Tracking</h4>
                  <div className="space-y-2 text-sm">
                    {email.deliveredAt && (
                      <div className="flex items-center gap-2 text-semantic-success">
                        <FiCheck className="w-4 h-4" />
                        <span>Delivered: {format(new Date(email.deliveredAt), 'PPpp')}</span>
                      </div>
                    )}
                    {email.openedAt && (
                      <div className="flex items-center gap-2 text-brand-aqua-blue">
                        <FiExternalLink className="w-4 h-4" />
                        <span>Opened: {format(new Date(email.openedAt), 'PPpp')}</span>
                      </div>
                    )}
                    {email.clickedAt && (
                      <div className="flex items-center gap-2 text-accent-vibrant-green">
                        <FiExternalLink className="w-4 h-4" />
                        <span>Link clicked: {format(new Date(email.clickedAt), 'PPpp')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border-silver bg-background-ash">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white border border-border-silver text-text-charcoal rounded-lg hover:bg-background-ash transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailDetailModal;
