import React, { useState } from 'react';
import { API_BASE_URL } from '../../services/api';

const AddTeamMemberPage = ({ colorMode }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    secondaryPhone: '',
    preferredPhone: '',
    role: 'WORKER'
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [emailStatus, setEmailStatus] = useState(null);
  const [setupLink, setSetupLink] = useState('');

  const roles = [
    { value: 'ADMIN', label: 'Administrator' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'PROJECT_MANAGER', label: 'Project Manager' },
    { value: 'FOREMAN', label: 'Foreman' },
    { value: 'WORKER', label: 'Worker' },
    { value: 'SUBCONTRACTOR', label: 'Subcontractor' }
  ];

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
    if (!formData.firstName.trim()) {
      setError('First name is required');
      return false;
    }
    if (!formData.lastName.trim()) {
      setError('Last name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
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
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/users/add-team-member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        setEmailStatus(result.data.emailSent);
        setSetupLink(result.data.setupLink || '');
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          secondaryPhone: '',
          preferredPhone: '',
          role: 'WORKER'
        });
      } else {
        setError(result.message || 'Failed to add team member');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Error adding team member:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSuccess(false);
    setError('');
    setEmailStatus(null);
    setSetupLink('');
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">Team Member Added Successfully!</h3>
            {emailStatus ? (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  ✅ An invitation email has been sent to {formData.email}. They will receive instructions to complete their profile setup.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-yellow-600 mb-4">
                  ⚠️ Team member was added, but the invitation email failed to send. Please contact them directly with this setup link:
                </p>
                <div className="bg-gray-100 p-3 rounded-md mb-4">
                  <code className="text-xs break-all">{setupLink}</code>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(setupLink)}
                  className="text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  Copy Setup Link
                </button>
              </div>
            )}
            <button
              onClick={resetForm}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Another Team Member
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
        <p className="text-sm text-gray-600">Add a new team member to your organization</p>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
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
                <label htmlFor="secondaryPhone" className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Phone for Customer Communications
                </label>
                <div className="space-y-1">
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

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                Role *
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {roles.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Adding Team Member...' : 'Add Team Member'}
              </button>
            </div>
          </form>
    </div>
  );
};

export default AddTeamMemberPage;
