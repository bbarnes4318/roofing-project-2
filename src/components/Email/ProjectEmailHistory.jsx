import React, { useState, useEffect } from 'react';
import { FiMail, FiFilter, FiRefreshCw } from 'react-icons/fi';
import EmailHistoryList from './EmailHistoryList';
import EmailDetailModal from './EmailDetailModal';

const ProjectEmailHistory = ({ projectId }) => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [filter, setFilter] = useState('all'); // all, sent, delivered, opened

  useEffect(() => {
    if (projectId) {
      fetchProjectEmails();
    }
  }, [projectId]);

  const fetchProjectEmails = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/email/history/project/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch project emails');

      const data = await response.json();
      setEmails(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmails = emails.filter(email => {
    if (filter === 'all') return true;
    return email.status === filter;
  });

  const emailStats = {
    total: emails.length,
    sent: emails.filter(e => e.status === 'sent').length,
    delivered: emails.filter(e => e.status === 'delivered').length,
    opened: emails.filter(e => e.status === 'opened').length,
    failed: emails.filter(e => e.status === 'failed' || e.status === 'bounced').length
  };

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="bg-gradient-to-r from-brand-aqua-blue to-accent-vibrant-green rounded-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FiMail className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Email History</h2>
              <p className="text-white text-opacity-90">All emails sent for this project</p>
            </div>
          </div>
          <button
            onClick={fetchProjectEmails}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white bg-opacity-10 rounded-lg p-3">
            <div className="text-2xl font-bold">{emailStats.total}</div>
            <div className="text-sm text-white text-opacity-80">Total Emails</div>
          </div>
          <div className="bg-white bg-opacity-10 rounded-lg p-3">
            <div className="text-2xl font-bold">{emailStats.sent}</div>
            <div className="text-sm text-white text-opacity-80">Sent</div>
          </div>
          <div className="bg-white bg-opacity-10 rounded-lg p-3">
            <div className="text-2xl font-bold">{emailStats.delivered}</div>
            <div className="text-sm text-white text-opacity-80">Delivered</div>
          </div>
          <div className="bg-white bg-opacity-10 rounded-lg p-3">
            <div className="text-2xl font-bold">{emailStats.opened}</div>
            <div className="text-sm text-white text-opacity-80">Opened</div>
          </div>
          <div className="bg-white bg-opacity-10 rounded-lg p-3">
            <div className="text-2xl font-bold">{emailStats.failed}</div>
            <div className="text-sm text-white text-opacity-80">Failed</div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-lg border border-border-silver p-4">
        <div className="flex items-center gap-3">
          <FiFilter className="w-5 h-5 text-text-light-gray" />
          <span className="text-sm font-semibold text-text-charcoal">Filter by status:</span>
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'All' },
              { value: 'sent', label: 'Sent' },
              { value: 'delivered', label: 'Delivered' },
              { value: 'opened', label: 'Opened' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === option.value
                    ? 'bg-brand-aqua-blue text-white'
                    : 'bg-background-ash text-text-charcoal hover:bg-brand-aqua-blue-light-tint'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Email list */}
      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <p className="font-semibold">Error loading emails</p>
          <p className="text-sm">{error}</p>
        </div>
      ) : (
        <EmailHistoryList
          emails={filteredEmails}
          onEmailClick={setSelectedEmail}
          loading={loading}
          emptyMessage="No emails have been sent for this project yet"
        />
      )}

      {/* Email detail modal */}
      {selectedEmail && (
        <EmailDetailModal
          email={selectedEmail}
          onClose={() => setSelectedEmail(null)}
        />
      )}
    </div>
  );
};

export default ProjectEmailHistory;
