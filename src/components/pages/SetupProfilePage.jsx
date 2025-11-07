import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../services/api';

const SetupProfilePage = ({ colorMode }) => {
  const [token, setToken] = useState('');
  const [formData, setFormData] = useState({
    phone: '',
    secondaryPhone: '',
    preferredPhone: '',
    position: '',
    department: '',
    bio: ''
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Get token from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    
    if (urlToken) {
      setToken(urlToken);
      verifyToken(urlToken);
    } else {
      setError('Invalid setup link');
      setLoading(false);
    }
  }, []);

  const verifyToken = async (tokenToVerify) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-setup-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: tokenToVerify })
      });

      const result = await response.json();
      
      if (result.success) {
        setUser(result.data.user);
        setFormData(prev => ({
          ...prev,
          phone: result.data.user.phone || '',
          secondaryPhone: result.data.user.secondaryPhone || '',
          preferredPhone: result.data.user.preferredPhone || ''
        }));
      } else {
        setError(result.message || 'Invalid or expired setup link');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Error verifying token:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhoneChange = (e) => {
    const { name, value } = e.target;
    // Basic phone number formatting
    const formatted = value.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    setFormData(prev => ({
      ...prev,
      [name]: formatted
    }));
  };

  const handlePreferredPhoneChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      preferredPhone: value
    }));
  };

  const validateForm = () => {
    if (formData.phone && formData.secondaryPhone && !formData.preferredPhone) {
      setError('Please select which phone number is preferred for customer communications');
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
      const response = await fetch(`${API_BASE_URL}/auth/complete-profile-setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          phone: formData.phone,
          secondaryPhone: formData.secondaryPhone,
          preferredPhone: formData.preferredPhone,
          position: formData.position,
          department: formData.department,
          bio: formData.bio
        })
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          window.location.href = '/login';
        }, 3000);
      } else {
        setError(result.message || 'Failed to complete profile setup');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Error completing profile setup:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${colorMode ? 'bg-[#0f172a]' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying setup link...</p>
        </div>
      </div>
    );
  }

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
            <h3 className="text-lg font-medium text-gray-900 mb-2">Profile Setup Complete!</h3>
            <p className="text-sm text-gray-600 mb-4">
              Your profile has been successfully set up. You can now sign in with Google OAuth.
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Redirecting to login in 3 seconds...
            </p>
            <p className="text-xs text-blue-600">
              Remember: Use "Continue with Google" to sign in with your email address.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-screen ${colorMode ? 'bg-[#0f172a]' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className={`max-w-md w-full mx-4 ${colorMode ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-lg p-8`}>
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Setup Link Invalid</h3>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.href = '/login'}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${colorMode ? 'bg-[#0f172a]' : 'bg-gray-50'} py-8`}>
      <div className="max-w-2xl mx-auto px-4">
        <div className={`${colorMode ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-lg`}>
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Complete Your Profile Setup</h1>
            <p className="text-gray-600 mt-1">Welcome {user.firstName}! Please complete your profile to get started.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
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

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Your Account Information</h3>
              <div className="text-sm text-blue-700">
                <p><strong>Name:</strong> {user.firstName} {user.lastName}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Role:</strong> {user.role}</p>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-xs text-blue-600">
                  <strong>Note:</strong> You'll sign in using Google OAuth with your email address ({user.email}). No password needed!
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  placeholder="(555) 123-4567"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="secondaryPhone" className="block text-sm font-medium text-gray-700 mb-2">
                  Secondary Phone
                </label>
                <input
                  type="tel"
                  id="secondaryPhone"
                  name="secondaryPhone"
                  value={formData.secondaryPhone}
                  onChange={handlePhoneChange}
                  placeholder="(555) 123-4567"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {(formData.phone || formData.secondaryPhone) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Phone for Customer Communications
                </label>
                <div className="space-y-2">
                  {formData.phone && (
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="preferredPhone"
                        value={formData.phone}
                        checked={formData.preferredPhone === formData.phone}
                        onChange={handlePreferredPhoneChange}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Primary Phone: {formData.phone}</span>
                    </label>
                  )}
                  {formData.secondaryPhone && (
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="preferredPhone"
                        value={formData.secondaryPhone}
                        checked={formData.preferredPhone === formData.secondaryPhone}
                        onChange={handlePreferredPhoneChange}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Secondary Phone: {formData.secondaryPhone}</span>
                    </label>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-2">
                  Position
                </label>
                <input
                  type="text"
                  id="position"
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  placeholder="e.g., Project Manager, Foreman"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <input
                  type="text"
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  placeholder="e.g., Operations, Sales"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                placeholder="Tell us a bit about yourself..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <button
                type="button"
                onClick={() => window.location.href = '/login'}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Completing Setup...' : 'Complete Setup'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SetupProfilePage;
