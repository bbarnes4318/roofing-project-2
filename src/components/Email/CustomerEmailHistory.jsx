import React, { useState, useEffect } from 'react';
import { FiMail, FiRefreshCw } from 'react-icons/fi';
import EmailHistoryList from './EmailHistoryList';
import EmailDetailModal from './EmailDetailModal';

const CustomerEmailHistory = ({ customerId }) => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState(null);

  useEffect(() => {
    if (customerId) {
      fetchCustomerEmails();
    }
  }, [customerId]);

  const fetchCustomerEmails = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/email/history/customer/${customerId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch customer emails');

      const data = await response.json();
      setEmails(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-aqua-blue to-accent-vibrant-green rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FiMail className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Email Communication History</h2>
              <p className="text-white text-opacity-90">
                {emails.length} email{emails.length !== 1 ? 's' : ''} sent to this customer
              </p>
            </div>
          </div>
          <button
            onClick={fetchCustomerEmails}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
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
          emails={emails}
          onEmailClick={setSelectedEmail}
          loading={loading}
          emptyMessage="No emails have been sent to this customer yet"
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

export default CustomerEmailHistory;
