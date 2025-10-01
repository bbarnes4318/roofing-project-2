import React, { useState, useEffect } from 'react';
import { FiMail, FiSearch, FiFilter, FiRefreshCw, FiDownload } from 'react-icons/fi';
import EmailHistoryList from '../Email/EmailHistoryList';
import EmailDetailModal from '../Email/EmailDetailModal';

const EmailHistoryPage = () => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [emailType, setEmailType] = useState('');
  const [status, setStatus] = useState('');
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchEmails();
  }, [emailType, status, limit, offset]);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');

      if (!token) {
        setError('Authentication required. Please log in.');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      if (emailType) params.append('emailType', emailType);
      if (status) params.append('status', status);
      params.append('limit', limit);
      params.append('offset', offset);

      const response = await fetch(`/api/email/history?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please log in again.');
        }
        throw new Error('Failed to fetch emails');
      }

      const data = await response.json();
      setEmails(data.data.emails || []);
      setTotal(data.data.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmails = emails.filter(email => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      email.subject?.toLowerCase().includes(search) ||
      email.senderName?.toLowerCase().includes(search) ||
      email.senderEmail?.toLowerCase().includes(search) ||
      email.toEmails?.some(e => e.toLowerCase().includes(search))
    );
  });

  const handleNextPage = () => {
    if (offset + limit < total) {
      setOffset(offset + limit);
    }
  };

  const handlePrevPage = () => {
    if (offset > 0) {
      setOffset(Math.max(0, offset - limit));
    }
  };

  const emailStats = {
    total: total,
    sent: emails.filter(e => e.status === 'sent').length,
    delivered: emails.filter(e => e.status === 'delivered').length,
    opened: emails.filter(e => e.status === 'opened').length
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--color-background-ash)' }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="rounded-lg p-8 text-white" style={{ 
          background: 'linear-gradient(to right, var(--color-brand-aqua-blue), var(--color-accent-vibrant-green))',
          boxShadow: 'var(--shadow-medium)'
        }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-white bg-opacity-20 p-4 rounded-lg">
                <FiMail className="w-10 h-10" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Email History</h1>
                <p className="text-white text-opacity-90 mt-1">
                  View and manage all email communications
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={fetchEmails}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors disabled:opacity-50"
              >
                <FiRefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors">
                <FiDownload className="w-5 h-5" />
                Export
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div
              className="rounded-lg p-4"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                boxShadow: 'var(--shadow-soft)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}
            >
              <div className="text-3xl font-bold text-white">{emailStats.total}</div>
              <div className="text-sm mt-1 text-white text-opacity-90">Total Emails</div>
            </div>
            <div
              className="rounded-lg p-4"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                boxShadow: 'var(--shadow-soft)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}
            >
              <div className="text-3xl font-bold text-white">{emailStats.sent}</div>
              <div className="text-sm mt-1 text-white text-opacity-90">Sent</div>
            </div>
            <div
              className="rounded-lg p-4"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                boxShadow: 'var(--shadow-soft)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}
            >
              <div className="text-3xl font-bold text-white">{emailStats.delivered}</div>
              <div className="text-sm mt-1 text-white text-opacity-90">Delivered</div>
            </div>
            <div
              className="rounded-lg p-4"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                boxShadow: 'var(--shadow-soft)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}
            >
              <div className="text-3xl font-bold text-white">{emailStats.opened}</div>
              <div className="text-sm mt-1 text-white text-opacity-90">Opened</div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg p-6" style={{ 
          border: '1px solid var(--color-border-silver)',
          boxShadow: 'var(--shadow-soft)'
        }}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-charcoal)' }}>
                Search
              </label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-light-gray w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by subject, sender, or recipient..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none"
                  style={{
                    border: '1px solid var(--color-border-silver)',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--color-brand-aqua-blue)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(0, 137, 209, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--color-border-silver)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Email Type Filter */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-charcoal)' }}>
                Email Type
              </label>
              <select
                value={emailType}
                onChange={(e) => setEmailType(e.target.value)}
                className="w-full px-4 py-2 rounded-lg focus:outline-none"
                style={{
                  border: '1px solid var(--color-border-silver)',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-brand-aqua-blue)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 137, 209, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--color-border-silver)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <option value="">All Types</option>
                <option value="project_update">Project Update</option>
                <option value="customer_communication">Customer</option>
                <option value="team_communication">Team</option>
                <option value="bubbles_ai">AI Assistant</option>
                <option value="general">General</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-charcoal)' }}>
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2 rounded-lg focus:outline-none"
                style={{
                  border: '1px solid var(--color-border-silver)',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-brand-aqua-blue)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 137, 209, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--color-border-silver)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <option value="">All Status</option>
                <option value="sent">Sent</option>
                <option value="delivered">Delivered</option>
                <option value="opened">Opened</option>
                <option value="failed">Failed</option>
                <option value="bounced">Bounced</option>
              </select>
            </div>
          </div>
        </div>

        {/* Email List */}
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-800">
            <p className="font-semibold">Error loading emails</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg p-6" style={{ 
            border: '1px solid var(--color-border-silver)',
            boxShadow: 'var(--shadow-soft)'
          }}>
            <EmailHistoryList
              emails={filteredEmails}
              onEmailClick={setSelectedEmail}
              loading={loading}
              emptyMessage="No emails found matching your filters"
            />

            {/* Pagination */}
            {total > limit && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-border-silver">
                <div className="text-sm text-text-light-gray">
                  Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} emails
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handlePrevPage}
                    disabled={offset === 0}
                    className="px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  style={{
                    backgroundColor: 'var(--color-background-ash)',
                    color: 'var(--color-text-charcoal)'
                  }}
                  onMouseEnter={(e) => !e.target.disabled && (e.target.style.backgroundColor = 'var(--color-brand-aqua-blue-light-tint)')}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--color-background-ash)'}
                  >
                    Previous
                  </button>
                  <button
                    onClick={handleNextPage}
                    disabled={offset + limit >= total}
                    className="px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  style={{
                    backgroundColor: 'var(--color-brand-aqua-blue)'
                  }}
                  onMouseEnter={(e) => !e.target.disabled && (e.target.style.backgroundColor = 'var(--color-brand-deep-teal)')}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--color-brand-aqua-blue)'}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Email Detail Modal */}
        {selectedEmail && (
          <EmailDetailModal
            email={selectedEmail}
            onClose={() => setSelectedEmail(null)}
          />
        )}
      </div>
    </div>
  );
};

export default EmailHistoryPage;
