import React, { useState, useEffect } from 'react';
import RoleSelectionScreen from './RoleSelectionScreen';
import OwnerOnboardingFlow from './OwnerOnboardingFlow';
import { authService, onboardingService } from '../../services/api';

const ROLE_MAPPINGS = {
  'ADMIN': 'ADMIN',
  'FIELD_DIRECTOR': 'FOREMAN', // Map to existing DB role
  'OFFICE_STAFF': 'WORKER',   // Map to existing DB role
  'OWNER': 'ADMIN',           // Owner gets admin privileges
  'PROJECT_MANAGER': 'PROJECT_MANAGER',
  'LOCATION_MANAGER': 'LOCATION_MANAGER'
};

const OnboardingFlow = ({ currentUser, onComplete }) => {
  const [currentStep, setCurrentStep] = useState('role-selection');
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if user needs onboarding
  useEffect(() => {
    // Skip onboarding if user already has completed it or has a role set properly
    if (currentUser?.hasCompletedOnboarding || currentUser?.role !== 'WORKER') {
      // User doesn't need onboarding, complete immediately
      onComplete?.();
    }
  }, [currentUser, onComplete]);

  const handleRoleSelected = async (roleId) => {
    setLoading(true);
    setError(null);

    try {
      const mappedRole = ROLE_MAPPINGS[roleId] || roleId;
      
      // Update user role via API
      const response = await onboardingService.updateRole({
        role: mappedRole,
        onboardingRole: roleId, // Store the original selection
        hasCompletedOnboarding: roleId !== 'OWNER' // Only Owner needs additional onboarding
      });

      if (response.success) {
        setSelectedRole(roleId);
        
        // If Owner role, continue to workflow setup
        if (roleId === 'OWNER') {
          setCurrentStep('owner-onboarding');
        } else {
          // For other roles, complete onboarding immediately
          handleOnboardingComplete({
            role: roleId,
            mappedRole: mappedRole,
            completedAt: new Date().toISOString()
          });
        }
      } else {
        throw new Error(response.message || 'Failed to update user role');
      }
    } catch (err) {
      console.error('Error updating user role:', err);
      setError('Failed to update your role. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOwnerOnboardingComplete = async (onboardingData) => {
    setLoading(true);
    
    try {
      // Update user with completed onboarding data
      const response = await onboardingService.completeOnboarding({
        role: selectedRole,
        workflowSetup: onboardingData,
        completedAt: new Date().toISOString()
      });

      if (response.success) {
        handleOnboardingComplete({
          role: selectedRole,
          mappedRole: ROLE_MAPPINGS[selectedRole],
          workflowSetup: onboardingData,
          completedAt: new Date().toISOString()
        });
      } else {
        throw new Error(response.message || 'Failed to complete onboarding');
      }
    } catch (err) {
      console.error('Error completing onboarding:', err);
      setError('Failed to complete onboarding. Please try again.');
      setLoading(false);
    }
  };

  const handleOnboardingComplete = (data) => {
    // Store onboarding completion in localStorage for immediate UI update
    const updatedUser = {
      ...currentUser,
      role: data.mappedRole,
      onboardingRole: data.role,
      hasCompletedOnboarding: true,
      onboardingData: data
    };
    
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    // Call parent completion handler
    if (onComplete) {
      onComplete(data);
    }
  };

  const handleBackToRoleSelection = () => {
    setCurrentStep('role-selection');
    setSelectedRole(null);
    setError(null);
  };

  // Error display
  if (error) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Setup Error
          </h3>
          <p className="text-gray-600 mb-6">
            {error}
          </p>
          <button
            onClick={() => {
              setError(null);
              setCurrentStep('role-selection');
            }}
            className="w-full bg-[var(--color-primary-blueprint-blue)] hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Render current step
  switch (currentStep) {
    case 'role-selection':
      return (
        <RoleSelectionScreen
          onRoleSelected={handleRoleSelected}
          loading={loading}
        />
      );
      
    case 'owner-onboarding':
      return (
        <OwnerOnboardingFlow
          currentUser={currentUser}
          onComplete={handleOwnerOnboardingComplete}
          onBack={handleBackToRoleSelection}
        />
      );
      
    default:
      return null;
  }
};

export default OnboardingFlow;