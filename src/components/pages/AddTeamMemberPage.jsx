import React, { useState } from 'react';
import { API_BASE_URL } from '../../services/api';

const AddTeamMemberPage = ({ colorMode }) => {
  const [email, setEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState(''); // Preserve email for success display
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [emailStatus, setEmailStatus] = useState(null);
  const [emailError, setEmailError] = useState(''); // Track email send error reason
  const [setupLink, setSetupLink] = useState('');

  const validateForm = () => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Get auth token
      const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Use backend API to create team member
      // We send default values for required fields that are hidden from UI
      const response = await fetch(`${API_BASE_URL}/users/add-team-member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: 'Team',
          lastName: 'Member',
          email: email.trim(),
          phone: null,
          secondaryPhone: null,
          preferredPhone: null,
          role: 'WORKER'
        })
      });

      const result = await response.json();
      
      console.log('🔍 ADD-TEAM-MEMBER: Response status:', response.status);
      console.log('🔍 ADD-TEAM-MEMBER: Response data:', result);

      if (!response.ok) {
        // Handle validation errors with more detail
        if (result.errors && Object.keys(result.errors).length > 0) {
          const errorMessages = Object.values(result.errors).flat();
          throw new Error(errorMessages.join(', ') || result.message || 'Failed to send invite');
        }
        throw new Error(result.message || result.error || 'Failed to send invite');
      }

      if (result.success) {
        console.log('✅ ADD-TEAM-MEMBER: User created successfully:', result.data.user);
        console.log('✅ ADD-TEAM-MEMBER: Email sent status:', result.data?.emailSent);
        console.log('✅ ADD-TEAM-MEMBER: Email error (if any):', result.data?.emailError);
        console.log('✅ ADD-TEAM-MEMBER: Setup link:', result.data?.setupLink);
        setSubmittedEmail(email.trim()); // Save email before clearing
        setSuccess(true);
        setEmailStatus(result.data?.emailSent || false);
        setEmailError(result.data?.emailError || ''); // Store email error reason
        // Always get setupLink from backend - show as fallback even if email sent
        setSetupLink(result.data?.setupLink || result.data?.user?.setupLink || '');
        setEmail('');
        
        // Log email error if any (helps with debugging)
        if (result.data?.emailError) {
          console.warn('⚠️ ADD-TEAM-MEMBER: Email failed to send:', result.data.emailError);
        }
      } else {
        throw new Error(result.message || 'Failed to send invite');
      }
    } catch (err) {
      console.error('❌ ADD-TEAM-MEMBER: Error details:', err);
      console.error('❌ ADD-TEAM-MEMBER: Full error object:', JSON.stringify(err, null, 2));
      setError(err.message || 'Failed to send invite');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSuccess(false);
    setError('');
    setEmailStatus(null);
    setEmailError('');
    setSetupLink('');
    setEmail('');
    setSubmittedEmail('');
  };

  if (success) {
    return (
      <div className={`min-h-screen ${colorMode ? 'bg-[#0f172a]' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className={`max-w-md w-full mx-4 ${colorMode ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-lg p-8`}>
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className={`text-lg font-medium mb-2 ${colorMode ? 'text-white' : 'text-gray-900'}`}>Team Member Added!</h3>
            {emailStatus ? (
              <div>
                <p className={`text-sm mb-4 ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  ✅ Invitation email has been sent to <strong>{submittedEmail}</strong>
                </p>
                <p className={`text-xs mb-4 ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  The team member can log in using Google OAuth with their email address.
                </p>
              </div>
            ) : (
              <div>
                <p className={`text-sm mb-2 ${colorMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  ⚠️ User created for <strong>{submittedEmail}</strong>, but the invitation email failed to send.
                </p>
                {emailError && (
                  <p className={`text-xs mb-4 ${colorMode ? 'text-red-300' : 'text-red-500'}`}>
                    Reason: {emailError}
                  </p>
                )}
              </div>
            )}
            
            {/* Always show setup link as fallback */}
            {setupLink && (
              <div className={`p-3 rounded-md mb-4 ${colorMode ? 'bg-slate-700' : 'bg-gray-100'}`}>
                <p className={`text-xs font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Manual Setup Link (share this if email isn't received):
                </p>
                <code className={`text-xs break-all block p-2 rounded ${colorMode ? 'bg-slate-800 text-blue-400' : 'bg-white text-blue-600 border'}`}>
                  {setupLink}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(setupLink);
                    alert('Link copied to clipboard!');
                  }}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  📋 Copy Setup Link
                </button>
              </div>
            )}
            <button
              onClick={resetForm}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors mt-4"
            >
              Invite Another Member
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${colorMode ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-sm border border-gray-200`}>
      <div className="px-4 py-3 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900">Add Team Member</h1>
        <p className="text-sm text-gray-600">Invite a new team member via email</p>
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                An invitation will be sent to this email address. They can sign in using their Google Account.
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending Invite...
                  </>
                ) : (
                  'Send Invite'
                )}
              </button>
            </div>
          </form>
    </div>
  );
};

export default AddTeamMemberPage;
