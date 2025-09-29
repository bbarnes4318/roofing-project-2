import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, updatePassword } from '../lib/supabaseClient';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [sessionValid, setSessionValid] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a valid recovery session
    checkRecoverySession();
  }, []);

  const checkRecoverySession = async () => {
    // Supabase automatically handles the recovery token from the URL
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error checking recovery session:', error);
      setMessage({ 
        type: 'error', 
        text: 'Invalid or expired reset link. Please request a new password reset.' 
      });
      return;
    }

    if (session) {
      setSessionValid(true);
    } else {
      setMessage({ 
        type: 'error', 
        text: 'No valid reset session found. Please check your email for the reset link.' 
      });
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    // Validate password length
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long' });
      return;
    }
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await updatePassword(newPassword);

      setMessage({
        type: 'success',
        text: 'Password updated successfully! Redirecting to login...'
      });

      // Clear form
      setNewPassword('');
      setConfirmPassword('');

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      console.error('Error updating password:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to update password. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, rgba(26, 90, 153, 0.18), rgba(232, 240, 247, 0.9))'
      }}
    >
      <div
        className="rounded-2xl shadow-xl p-8 max-w-md w-full"
        style={{
          backgroundColor: 'var(--color-surface-white)',
          boxShadow: 'var(--shadow-medium)'
        }}
      >
        <div className="text-center mb-8">
          <div
            className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{
              backgroundColor: 'var(--color-primary-light-tint)',
              color: 'var(--color-primary-blueprint-blue)'
            }}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 011.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Reset Password</h1>
          <p className="text-gray-600">
            {sessionValid ? 'Enter your new password below' : 'Checking reset link...'}
          </p>
        </div>

        {sessionValid ? (
          <form onSubmit={handleResetPassword}>
            <div className="space-y-4">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    borderColor: 'var(--color-border-gray)',
                    backgroundColor: 'var(--color-surface-white)'
                  }}
                  placeholder="Enter new password"
                  minLength={6}
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-gray-500">Minimum 6 characters</p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    borderColor: 'var(--color-border-gray)',
                    backgroundColor: 'var(--color-surface-white)'
                  }}
                  placeholder="Confirm new password"
                  minLength={6}
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword}
              className="btn btn-secondary w-full mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24" style={{ color: 'var(--color-surface-white)' }}>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating Password...
                </span>
              ) : 'Update Password'}
            </button>
          </form>
        ) : (
          <div className="text-center py-8">
            <div
              className="animate-spin rounded-full h-12 w-12 mx-auto"
              style={{
                borderBottom: '2px solid var(--color-primary-blueprint-blue)',
                borderTop: '2px solid transparent'
              }}
            ></div>
            <p className="mt-4 text-sm text-gray-600">Validating reset link…</p>
          </div>
        )}

        {message.text && (
          <div
            className="mt-6 p-3 rounded-lg text-sm"
            style={{
              backgroundColor:
                message.type === 'error'
                  ? 'var(--color-danger-light-tint)'
                  : message.type === 'success'
                    ? 'rgba(16, 185, 129, 0.12)'
                    : 'var(--color-primary-light-tint)',
              color:
                message.type === 'error'
                  ? 'var(--color-danger-red)'
                  : message.type === 'success'
                    ? 'var(--color-success-green)'
                    : 'var(--color-primary-blueprint-blue)'
            }}
          >
            {message.text}
          </div>
        )}

        {sessionValid && (
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-medium transition-colors"
              style={{ color: 'var(--color-primary-blueprint-blue)' }}
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
export default ResetPassword;