import React, { useState, useEffect } from 'react';
import { formatPhoneNumber } from '../../utils/helpers';
// Note: useSubjects import removed per requirements
import WorkflowImportPage from './WorkflowImportPage';
import CompleteExcelDataManager from '../ui/CompleteExcelDataManager';
import RolesTabComponentFixed from './RolesTabComponentFixed';
import FollowUpTracking from '../ui/FollowUpTracking';
import RoofingPermissionsPage from './RoofingPermissionsPage';
import AddTeamMemberPage from './AddTeamMemberPage';
import UserManagementPage from './UserManagementPage';
import { API_BASE_URL, authService } from '../../services/api';
import GoogleMapsAutocomplete from '../ui/GoogleMapsAutocomplete';

// Removed mock user; use real authenticated user via props

const SettingsPage = ({ colorMode, setColorMode, currentUser, onUserUpdated }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [language, setLanguage] = useState('English');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [displayName, setDisplayName] = useState('');
  
  // Password visibility states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Profile picture upload handlers
  const handleProfilePictureChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setSuccessMessage('Please select a valid image file');
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setSuccessMessage('Image size must be less than 5MB');
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        return;
      }
      
      setProfilePicture(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePicturePreview(e.target.result);
      };
      reader.readAsDataURL(file);

      // IMMEDIATELY upload the profile picture and update the top-right icon
      try {
        const formData = new FormData();
        formData.append('avatar', file);
        
        const uploadRes = await fetch(`${API_BASE_URL}/auth/upload-avatar`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: formData
        });
        
        const uploadResult = await uploadRes.json();
        console.log('🔄 IMMEDIATE AVATAR UPLOAD: Upload result:', uploadResult);
        if (uploadResult.success) {
          const updatedUser = uploadResult.data.user;
          console.log('🔄 IMMEDIATE AVATAR UPLOAD: Updated user:', updatedUser);
          console.log('🔄 IMMEDIATE AVATAR UPLOAD: Avatar URL:', updatedUser?.avatar);
          
          // Update local storage and session storage with new user data
          try {
            localStorage.setItem('user', JSON.stringify(updatedUser));
            sessionStorage.setItem('user', JSON.stringify(updatedUser));
          } catch (_) {}
          
          // IMMEDIATELY call the onUserUpdated callback to update the top-right icon
          if (typeof onUserUpdated === 'function') {
            console.log('🔄 IMMEDIATE AVATAR UPLOAD: Calling onUserUpdated callback');
            onUserUpdated(updatedUser);
          }
          
          // Clear the profile picture file state after successful upload
          // Keep preview until currentUser prop updates with new avatar
          setProfilePicture(null);
          // Don't clear preview immediately - let it persist until currentUser.avatar updates
          // The preview will be replaced by currentUser.avatar once the parent component updates
          
          setSuccessMessage('Profile picture updated successfully!');
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        } else {
          throw new Error(uploadResult.message || 'Failed to upload profile picture');
        }
      } catch (err) {
        console.error('Immediate avatar upload failed:', err);
        setSuccessMessage(String(err?.message || 'Failed to upload profile picture'));
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    }
  };

  const removeProfilePicture = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/remove-avatar`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      if (result.success) {
        // Update the current user state
        const updatedUser = result.data.user;
        try {
          localStorage.setItem('user', JSON.stringify(updatedUser));
          sessionStorage.setItem('user', JSON.stringify(updatedUser));
        } catch (_) {}
        if (typeof onUserUpdated === 'function') onUserUpdated(updatedUser);
        
        // Clear local state
        setProfilePicture(null);
        setProfilePicturePreview(null);
        
        setSuccessMessage('Profile picture removed successfully!');
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        throw new Error(result.message || 'Failed to remove profile picture');
      }
    } catch (err) {
      console.error('Remove profile picture failed:', err);
      setSuccessMessage(String(err?.message || 'Failed to remove profile picture'));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  // Note: subjects-related state variables removed per requirements

  // Roles/users state
  const [roleAssignments, setRoleAssignments] = useState({
    projectManager: [],
    fieldDirector: [],
    officeStaff: [],
    administration: [],
    subcontractor: []
  });
  const [availableUsers, setAvailableUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Workflow templates for Project Import
  const [workflowTemplates, setWorkflowTemplates] = useState([]);

  // Excel Data Manager state
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [excelError, setExcelError] = useState('');
  const [uploadResult, setUploadResult] = useState(null);

  // Helper to show transient success/toast-style messages
  const showSuccessMessage = (message) => {
    try {
      setSuccessMessage(String(message ?? ''));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (_) {}
  };

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [projectUpdates, setProjectUpdates] = useState(true);
  const [taskReminders, setTaskReminders] = useState(true);
  const [systemAlerts, setSystemAlerts] = useState(true);
  const [selectedWorkflowTemplate, setSelectedWorkflowTemplate] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState(null);

  // Follow-up settings state
  const [followUpSettings, setFollowUpSettings] = useState({
    isEnabled: false,
    taskFollowUpDays: 7,
    taskFollowUpHours: 0,
    taskFollowUpMinutes: 0,
    reminderFollowUpDays: 3,
    reminderFollowUpHours: 0,
    reminderFollowUpMinutes: 0,
    alertFollowUpDays: 5,
    alertFollowUpHours: 0,
    alertFollowUpMinutes: 0,
    maxFollowUpAttempts: 3,
    followUpMessage: ''
  });
  const [isLoadingFollowUp, setIsLoadingFollowUp] = useState(false);

  // Initialize form fields with current user data (ONLY ONCE on mount or when user ID changes)
  const currentUserId = currentUser?.id;
  useEffect(() => {
    if (currentUser) {
      setFirstName(currentUser.firstName || '');
      setLastName(currentUser.lastName || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
      // Try to get displayName from currentUser, fallback to localStorage
      let displayNameValue = currentUser.displayName || '';
      if (!displayNameValue) {
        try {
          const localUser = JSON.parse(localStorage.getItem('user') || '{}');
          displayNameValue = localUser.displayName || '';
        } catch (_) {}
      }
      setDisplayName(displayNameValue);
      setName(`${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim());
      setTimezone(currentUser.timezone || 'America/New_York');
      setLanguage(currentUser.language || 'English');
    }
  }, [currentUserId]); // Only run when user ID changes, not on every currentUser update

  // Clear profile picture preview when currentUser.avatar updates (after upload completes)
  // This ensures we use the actual avatar URL once it's available instead of the preview
  useEffect(() => {
    if (currentUser?.avatar && profilePicturePreview) {
      // Test if the avatar URL actually loads before clearing preview
      const testImage = new Image();
      const avatarUrl = currentUser.avatar.startsWith('spaces://') 
        ? `https://${process.env.REACT_APP_DO_SPACES_NAME || 'kenstruction'}.${process.env.REACT_APP_DO_SPACES_ENDPOINT || 'nyc3.digitaloceanspaces.com'}/${currentUser.avatar.replace('spaces://', '')}`
        : currentUser.avatar;
      
      testImage.onload = () => {
        // Image loads successfully, clear the preview
        console.log('✅ Avatar image loaded successfully, clearing preview');
        setProfilePicturePreview(null);
      };
      
      testImage.onerror = () => {
        // Image failed to load, keep showing preview
        console.error('❌ Avatar image failed to load, keeping preview');
        console.error('Failed URL:', avatarUrl);
      };
      
      testImage.src = avatarUrl;
    }
  }, [currentUser?.avatar, profilePicturePreview]); // Run when avatar or preview changes

  const handleSave = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      // First, upload profile picture if one is selected
      let updatedUser = null;
      if (profilePicture) {
        const formData = new FormData();
        formData.append('avatar', profilePicture);
        
        const uploadRes = await fetch(`${API_BASE_URL}/auth/upload-avatar`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: formData
        });
        
        const uploadResult = await uploadRes.json();
        console.log('🔄 AVATAR UPLOAD: Upload result:', uploadResult);
        if (uploadResult.success) {
          updatedUser = uploadResult.data.user;
          console.log('🔄 AVATAR UPLOAD: Updated user:', updatedUser);
          console.log('🔄 AVATAR UPLOAD: Avatar URL:', updatedUser?.avatar);
          // Update local storage and session storage with new user data
          try {
            localStorage.setItem('user', JSON.stringify(updatedUser));
            sessionStorage.setItem('user', JSON.stringify(updatedUser));
          } catch (_) {}
          // Call the onUserUpdated callback to update the parent component
          if (typeof onUserUpdated === 'function') {
            console.log('🔄 AVATAR UPLOAD: Calling onUserUpdated callback');
            onUserUpdated(updatedUser);
          }
          // Clear the profile picture file state after successful upload
          // Keep preview until currentUser prop updates with new avatar
          setProfilePicture(null);
          // Don't clear preview immediately - let it persist until currentUser.avatar updates
        } else {
          throw new Error(uploadResult.message || 'Failed to upload profile picture');
        }
      }

      // Then update other profile information
      // Only include fields that have values to avoid overwriting with empty strings
      const payload = {};
      if (firstName && firstName.trim()) payload.firstName = firstName.trim();
      if (lastName && lastName.trim()) payload.lastName = lastName.trim();
      if (email && email.trim()) payload.email = email.trim();
      if (phone && phone.trim()) payload.phone = phone.trim();
      if (timezone) payload.timezone = timezone;
      if (language) payload.language = language;
      // Include displayName in payload to save to database
      if (displayName !== undefined && displayName !== null) {
        payload.displayName = displayName.trim() || null;
      }
      
      console.log('🔍 PROFILE SAVE: Sending payload:', payload);
      const res = await authService.updateUserProfile(payload);
      console.log('🔍 PROFILE SAVE: API response:', res);
      if (res?.success && res?.data?.user) {
        const updated = res.data.user;
        console.log('🔍 PROFILE SAVE: Updated user data:', updated);
        
        // Merge avatar from previous update if it exists and wasn't included in this update
        if (updatedUser && updatedUser.avatar && !updated.avatar) {
          updated.avatar = updatedUser.avatar;
        }
        
        // Also preserve avatar from localStorage if it's not in the updated user
        if (!updated.avatar) {
          try {
            const localUser = JSON.parse(localStorage.getItem('user') || '{}');
            if (localUser.avatar) {
              updated.avatar = localUser.avatar;
            }
          } catch (_) {}
        }
        
        setFirstName(updated.firstName || '');
        setLastName(updated.lastName || '');
        setEmail(updated.email || '');
        setPhone(updated.phone || '');
        // DisplayName is now saved to database and returned from API
        setDisplayName(updated.displayName || '');
        setName(`${updated.firstName || ''} ${updated.lastName || ''}`.trim());
        try {
          localStorage.setItem('user', JSON.stringify(updated));
          sessionStorage.setItem('user', JSON.stringify(updated));
        } catch (_) {}
        if (typeof onUserUpdated === 'function') {
          console.log('🔍 PROFILE SAVE: Calling onUserUpdated callback with user:', updated);
          onUserUpdated(updated);
        }
        setSuccessMessage('Profile updated successfully!');
        setSuccess(true);
        setTimeout(() => setSuccess(false), 4000);
      } else {
        throw new Error(res?.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Profile save failed:', err);
      console.error('Profile save error details:', {
        message: err?.message,
        response: err?.response?.data,
        status: err?.response?.status
      });
      setSuccessMessage(String(err?.message || 'Failed to save profile'));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Note: subjects-related functions removed per requirements

  // Role assignment functions
  // New function to save array-based role assignments
  const saveRoleAssignments = async (newRoleAssignments) => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('authToken');
      console.log('💾 Saving role assignments:', newRoleAssignments);

      // Convert role assignments to the format expected by the backend
      // Backend expects: { projectManager: [userId1, userId2], ... }
      const roleAssignmentsForBackend = {};

      Object.keys(newRoleAssignments).forEach(roleType => {
        const users = newRoleAssignments[roleType] || [];
        roleAssignmentsForBackend[roleType] = users.map(user => user.id);
      });

      console.log('📤 Sending to backend:', roleAssignmentsForBackend);

      // Use the new sync endpoint that handles bulk updates efficiently
      const response = await fetch(`${API_BASE_URL}/roles/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          roleAssignments: roleAssignmentsForBackend
        })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Role assignments saved successfully:', result);
    } catch (error) {
      console.error('❌ Error saving role assignments:', error);
      throw error;
    }
  };

  const handleRoleAssignment = async (roleType, userId) => {
    try {
      console.log(`🔄 DEBUGGING: Assigning ${roleType} to user ${userId}`);

      // Don't update if it's the same value or empty
      if (!userId || roleAssignments[roleType] === userId) {
        console.log(`✅ DEBUGGING: No change needed (same value or empty)`);
        return;
      }

      // Optimistically update UI - store the value immediately
      const newAssignments = {
        ...roleAssignments,
        [roleType]: userId
      };
      setRoleAssignments(newAssignments);

      // Get existing token (don't create new one)
      const token = localStorage.getItem('authToken') || localStorage.getItem('authToken');
      console.log(`🔑 DEBUGGING: Token exists: ${!!token}`);

      if (!token) {
        throw new Error('No authentication token available');
      }

      // Convert frontend role names to backend format
      const roleTypeMapping = {
        productManager: 'PROJECT_MANAGER',
        projectManager: 'PROJECT_MANAGER',
        fieldDirector: 'FIELD_DIRECTOR',
        officeStaff: 'OFFICE_STAFF',
        administration: 'ADMINISTRATION',
        subcontractor: 'SUBCONTRACTOR',
        locationManager: 'LOCATION_MANAGER'
      };

      const backendRoleType = roleTypeMapping[roleType] || roleType;
      console.log(`🔄 DEBUGGING: Converting ${roleType} → ${backendRoleType}`);

      // Save to API
      console.log(`📡 DEBUGGING: Making API call to ${API_BASE_URL}/roles/assign`);
      const response = await fetch(`${API_BASE_URL}/roles/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          roleType: backendRoleType,
          userId: userId
        })
      });

      console.log(`📡 DEBUGGING: Response status: ${response.status}`);
      const data = await response.json();
      console.log(`📡 DEBUGGING: Response data:`, data);

      if (data.success) {
        const selectedUser = availableUsers.find(user => user.id === userId);
        console.log(`✅ DEBUGGING: Assignment successful!`);
        showSuccessMessage(`${selectedUser?.name || 'User'} assigned as ${getRoleDisplayName(roleType)}`);

        // DO NOT refresh assignments - it causes infinite loops!
        // The state is already updated optimistically
      } else {
        console.log(`❌ DEBUGGING: API returned failure: ${data.message}`);
        throw new Error(data.message || 'Failed to assign role');
      }

    } catch (error) {
      console.log(`❌ DEBUGGING: Error in handleRoleAssignment:`, error);
      // Revert state on error
      setRoleAssignments(prev => ({
        ...prev,
        [roleType]: ''
      }));
      showSuccessMessage(`Failed to assign role: ${error.message || error.toString() || 'Unknown error'}`);
    }
  };

  const getRoleDisplayName = (roleType) => {
    const roleNames = {
      productManager: 'Project Manager',
      projectManager: 'Project Manager',
      fieldDirector: 'Field Director',
      officeStaff: 'Office Staff',
      administration: 'Administration',
      subcontractor: 'Subcontractor',
      locationManager: 'Location Manager'
    };
    return roleNames[roleType] || roleType;
  };

  const getUserDisplayName = (userId) => {
    const user = availableUsers.find(u => u.id === userId);
    return user ? `${user.name} (${user.email})` : 'Select a user...';
  };

  // Function to load just role assignments
  const loadRoleAssignments = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('authToken');
      if (!token) {
        console.log('⚠️ No token available for loading role assignments');
        return;
      }

      console.log('📡 Loading role assignments...');
      const rolesResponse = await fetch(`${API_BASE_URL}/roles`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (rolesResponse.ok) {
        const rolesData = await rolesResponse.json();
        console.log('📊 Role assignments received:', rolesData);
        if (rolesData.success) {
          // Transform API data to new array-based format
          const formattedRoles = {
            projectManager: [], // Changed from productManager to projectManager
            fieldDirector: [],
            officeStaff: [],
            administration: []
            // Note: subcontractor and locationManager are not valid role types in the database
          };

          // Handle existing assignments if they exist
          Object.keys(formattedRoles).forEach(roleType => {
            const apiRoleType = roleType === 'projectManager' ? 'productManager' : roleType;
            const roleData = rolesData.data[apiRoleType] || rolesData.data[roleType];

            if (roleData) {
              if (Array.isArray(roleData)) {
                // New format - array of user objects
                formattedRoles[roleType] = roleData;
              } else if (roleData.userId) {
                // Old format - single user with userId
                const user = availableUsers.find(u => u.id === roleData.userId);
                if (user) {
                  formattedRoles[roleType] = [user];
                }
              }
            }
          });

          console.log('✅ Setting role assignments (new format):', formattedRoles);
          setRoleAssignments(formattedRoles);
        }
      } else {
        console.error(`❌ Failed to load role assignments: ${rolesResponse.status}`);
      }
    } catch (error) {
      console.error('Error loading role assignments:', error);
    }
  };

  // REMOVED: This was a duplicate useEffect that was causing form fields to reset

  // Load users and role assignments from API on mount
  useEffect(() => {
    let isMounted = true; // Prevent updates after unmount

    const loadUsersAndRoles = async () => {
      try {
        setUsersLoading(true);

        // Get auth token; do not create demo tokens
        const token = localStorage.getItem('authToken') || localStorage.getItem('authToken');
        if (!token) {
          console.warn('⚠️ No auth token found');
        }

        // Load available users
        console.log('📡 Fetching users from API...');
        const usersResponse = await fetch(`${API_BASE_URL}/users/team-members`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          console.log(`✅ Received ${usersData.data?.teamMembers?.length || 0} users from API`);
          if (isMounted && usersData.success && usersData.data?.teamMembers) {
            // Filter to show only active users in the assignments list
            const activeUsers = usersData.data.teamMembers.filter(u => u.isActive !== false && u.status !== 'Inactive');
            setAvailableUsers(activeUsers);
          } else {
            console.warn('⚠️ API returned success but no data');
          }
        } else {
          console.error(`❌ API returned status ${usersResponse.status}`);
        }

        // Load current role assignments
        await loadRoleAssignments();

      } catch (error) {
        console.error('Error loading users and roles:', error);
        // Don't use fallback data - let the user know there's an issue
        showSuccessMessage('Failed to load users. Please check your connection.');
      } finally {
        setUsersLoading(false);
      }
    };

    loadUsersAndRoles();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run once on mount!

  // Project import functions
  const fetchWorkflowTemplates = async () => {
    try {
      // Since WorkflowTemplate model doesn't exist, provide default options
      const defaultTemplates = [
        { id: 'standard', name: 'Standard Roofing Workflow', description: 'Default 7-phase roofing workflow' },
        { id: 'express', name: 'Express Workflow', description: 'Simplified workflow for small projects' },
        { id: 'insurance', name: 'Insurance Claims Workflow', description: 'Workflow optimized for insurance claims' }
      ];

      setWorkflowTemplates(defaultTemplates);
      if (defaultTemplates.length > 0) {
        setSelectedWorkflowTemplate(defaultTemplates[0].id);
      }
    } catch (error) {
      console.error('Error fetching workflow templates:', error);
    }
  };

  const handleProjectImport = async () => {
    if (!importFile || !selectedWorkflowTemplate) {
      showSuccessMessage('Please select a file and workflow template');
      return;
    }

    setImportLoading(true);
    const formData = new FormData();
    formData.append('file', importFile);
    formData.append('workflowTemplateId', selectedWorkflowTemplate);

    try {
      const response = await fetch(`${API_BASE_URL}/project-import/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (data.success) {
        const successCount = data.data.successful || 0;
        const failedCount = data.data.failed || 0;

        setImportResults({
          total: data.data.total || 0,
          successful: successCount,
          failed: data.data.errors || []
        });

        let message = `Import completed: ${successCount} projects created successfully`;
        if (failedCount > 0) {
          message += `, ${failedCount} failed`;
        }

        showSuccessMessage(message);
        setImportFile(null);
      } else {
        showSuccessMessage(`Import failed: ${String(data.message || 'Unknown error')}`);
      }
    } catch (error) {
      console.error('Error importing projects:', error);
      showSuccessMessage('Import failed due to an error');
    } finally {
      setImportLoading(false);
    }
  };

  const downloadSampleFile = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/project-import/sample`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'project-import-sample.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading sample file:', error);
      showSuccessMessage('Failed to download sample file');
    }
  };

  const downloadCSVTemplate = (templateType) => {
    try {
      let filename, url;

      switch (templateType) {
        case 'combined':
          filename = 'project_customer_combined_template.csv';
          url = '/templates/project_customer_combined_template.csv';
          break;
        case 'combined-instructions':
          filename = 'Combined_Upload_Instructions.md';
          url = '/templates/COMBINED_UPLOAD_INSTRUCTIONS.md';
          break;
        default:
          throw new Error('Invalid template type');
      }

      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.target = '_blank'; // Open in new tab if direct download fails
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showSuccessMessage(`Downloaded ${templateType} template successfully!`);
    } catch (error) {
      console.error('Error downloading template:', error);
      showSuccessMessage(`Failed to download ${templateType} template`);
    }
  };

  // Load workflow templates on component mount
  useEffect(() => {
    fetchWorkflowTemplates();
  }, []);

  // Load follow-up settings
  const loadFollowUpSettings = async () => {
    try {
      const response = await fetch('/api/follow-up/settings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setFollowUpSettings(data.data.settings);
      }
    } catch (error) {
      console.error('Error loading follow-up settings:', error);
    }
  };

  // Save follow-up settings
  const saveFollowUpSettings = async () => {
    setIsLoadingFollowUp(true);
    try {
      const response = await fetch('/api/follow-up/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(followUpSettings)
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Follow-up settings saved successfully!');
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        throw new Error(data.message || 'Failed to save follow-up settings');
      }
    } catch (error) {
      console.error('Error saving follow-up settings:', error);
      setSuccessMessage('Failed to save follow-up settings');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setIsLoadingFollowUp(false);
    }
  };

  // Load follow-up settings on component mount
  useEffect(() => {
    loadFollowUpSettings();
  }, []);

  // REMOVED: This was another duplicate useEffect that was causing form fields to reset

  // Get visible tabs based on user permissions
  const getVisibleTabs = () => {
    const baseTabs = [
      { id: 'profile', label: 'Profile', icon: '👤' },
      // Note: Preferences section removed per requirements
      // Note: Notifications section hidden per requirements
      { id: 'security', label: 'Security', icon: '🔒' },
      { id: 'roles', label: 'Roles', icon: '👥' },
      { id: 'permissions', label: 'Permissions', icon: '🔐' },
      { id: 'team-members', label: 'Team Members', icon: '👥' },
      { id: 'add-team-member', label: 'Add Team Member', icon: '➕' },
      { id: 'follow-up', label: 'Bubbles AI', icon: '🤖' }
      // Note: Excel Data section hidden per requirements
      // Note: Subjects tab removed per requirements
    ];

    // Admin import tabs are hidden for all users for now

    return baseTabs;
  };

  const tabs = getVisibleTabs();

  const renderProfileTab = () => (
    <div className="space-y-3">
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          {/* Show preview first if available, otherwise show avatar */}
          {profilePicturePreview ? (
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-500">
              <img 
                src={profilePicturePreview} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            </div>
          ) : currentUser?.avatar ? (
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-500">
              <img 
                src={currentUser.avatar.startsWith('spaces://') 
                  ? `https://${process.env.REACT_APP_DO_SPACES_NAME || 'kenstruction'}.${process.env.REACT_APP_DO_SPACES_ENDPOINT || 'nyc3.digitaloceanspaces.com'}/${currentUser.avatar.replace('spaces://', '')}`
                  : currentUser.avatar
                } 
                alt="Profile" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error('Profile image failed to load:', e);
                  console.error('Avatar URL:', currentUser.avatar);
                  console.error('Constructed URL:', e.target.src);
                  e.target.style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${colorMode ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'}`}>
              {`${(currentUser?.firstName || 'U').charAt(0).toUpperCase()}${(currentUser?.lastName || '').charAt(0).toUpperCase()}`}
            </div>
          )}
          <button
            type="button"
            onClick={() => document.getElementById('profile-picture-upload').click()}
            className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-blue-600 transition-colors"
            title="Change profile picture"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          {(profilePicturePreview || currentUser?.avatar) && (
            <button
              type="button"
              onClick={removeProfilePicture}
              className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-sm"
              title="Remove profile picture"
            >
              <svg className="w-1.5 h-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div>
          <div className={`text-sm font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
            {displayName || name || `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || 'User'}
          </div>
          <div className={`text-xs ${colorMode ? 'text-blue-200' : 'text-blue-600'}`}>
            {(() => {
              const roleUpper = String(currentUser?.role || '').toUpperCase();
              if (currentUser?.position) return currentUser.position;
              if (roleUpper === 'WORKER') return 'User';
              return currentUser?.role || 'User';
            })()}
          </div>
          <div className={`text-[10px] ${colorMode ? 'text-gray-300' : 'text-gray-500'}`}>{email}</div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        id="profile-picture-upload"
        type="file"
        accept="image/*"
        onChange={handleProfilePictureChange}
        className="hidden"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>First Name</label>
          <input
            type="text"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            className={`w-full p-2 rounded border focus:ring-1 focus:ring-blue-400 transition-all text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
          />
        </div>
        <div>
          <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Last Name</label>
          <input
            type="text"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            className={`w-full p-2 rounded border focus:ring-1 focus:ring-blue-400 transition-all text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
          />
        </div>
        <div>
          <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Email Address</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={`w-full p-2 rounded border focus:ring-1 focus:ring-blue-400 transition-all text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
          />
        </div>
        <div>
          <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={e => {
              const input = e.target.value;
              // Allow user to type freely, but format on blur
              setPhone(input);
            }}
            onBlur={e => {
              // Format the phone number when user leaves the field
              setPhone(formatPhoneNumber(e.target.value));
            }}
            placeholder="(555) 555-5555"
            className={`w-full p-2 rounded border focus:ring-1 focus:ring-blue-400 transition-all text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
          />
        </div>
        <div className="md:col-span-2">
          <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="How your name appears in the Bubbles system"
            className={`w-full p-2 rounded border focus:ring-1 focus:ring-blue-400 transition-all text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
          />
          <p className={`text-xs mt-1 ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
            How your name is displayed in the Bubbles system
          </p>
        </div>
        {/* Note: Company field removed per requirements */}
      </div>
    </div>
  );

  const renderPreferencesTab = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Theme</label>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setColorMode && setColorMode(false)}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all duration-200 ${!colorMode ? 'bg-[var(--color-primary-blueprint-blue)] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              ☀️ Light
            </button>
            <button
              type="button"
              onClick={() => setColorMode && setColorMode(true)}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all duration-200 ${colorMode ? 'bg-[var(--color-primary-blueprint-blue)] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              🌙 Dark
            </button>
          </div>
        </div>
        <div>
          <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Timezone</label>
          <select
            value={timezone}
            onChange={e => setTimezone(e.target.value)}
            className={`w-full p-2 rounded border focus:ring-1 focus:ring-blue-400 transition-all text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
          >
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
          </select>
        </div>
        <div>
          <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Language</label>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            className={`w-full p-2 rounded border focus:ring-1 focus:ring-blue-400 transition-all text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
          >
            <option value="English">English</option>
            <option value="Spanish">Spanish</option>
            <option value="French">French</option>
          </select>
        </div>
        <div>
          <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Date Format</label>
          <select
            className={`w-full p-2 rounded border focus:ring-1 focus:ring-blue-400 transition-all text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
          >
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between p-2 rounded border border-gray-200">
          <div>
            <div className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Email Notifications</div>
            <div className={`text-xs ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Receive updates via email</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={e => setEmailNotifications(e.target.checked)}
              className="sr-only peer"
            />
            <div className={`w-9 h-5 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${emailNotifications ? 'bg-[var(--color-primary-blueprint-blue)]' : 'bg-gray-200'}`}></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-2 rounded border border-gray-200">
          <div>
            <div className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>SMS Notifications</div>
            <div className={`text-xs ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Receive urgent alerts via text</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={smsNotifications}
              onChange={e => setSmsNotifications(e.target.checked)}
              className="sr-only peer"
            />
            <div className={`w-9 h-5 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${smsNotifications ? 'bg-[var(--color-primary-blueprint-blue)]' : 'bg-gray-200'}`}></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-2 rounded border border-gray-200">
          <div>
            <div className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Project Updates</div>
            <div className={`text-xs ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Get notified about project progress</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={projectUpdates}
              onChange={e => setProjectUpdates(e.target.checked)}
              className="sr-only peer"
            />
            <div className={`w-9 h-5 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${projectUpdates ? 'bg-[var(--color-primary-blueprint-blue)]' : 'bg-gray-200'}`}></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-2 rounded border border-gray-200">
          <div>
            <div className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Task Reminders</div>
            <div className={`text-xs ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Reminders for upcoming tasks</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={taskReminders}
              onChange={e => setTaskReminders(e.target.checked)}
              className="sr-only peer"
            />
            <div className={`w-9 h-5 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${taskReminders ? 'bg-[var(--color-primary-blueprint-blue)]' : 'bg-gray-200'}`}></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-2 rounded border border-gray-200">
          <div>
            <div className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>System Alerts</div>
            <div className={`text-xs ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Important system notifications</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={systemAlerts}
              onChange={e => setSystemAlerts(e.target.checked)}
              className="sr-only peer"
            />
            <div className={`w-9 h-5 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${systemAlerts ? 'bg-[var(--color-primary-blueprint-blue)]' : 'bg-gray-200'}`}></div>
          </label>
        </div>
      </div>
    </div>
  );



  const renderSecurityTab = () => (
    <div className="space-y-3">
      {/* Note: 2FA and Session Timeout removed per requirements */}
      <div className="">
        <h3 className={`text-sm font-semibold mb-2 ${colorMode ? 'text-white' : 'text-gray-800'}`}>Change Password</h3>
        <div className="space-y-2">
          <div>
            <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Current Password</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className={`w-full p-2 pr-10 rounded border focus:ring-1 focus:ring-blue-400 transition-all text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${colorMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {showCurrentPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={`w-full p-2 pr-10 rounded border focus:ring-1 focus:ring-blue-400 transition-all text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${colorMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {showNewPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className={`w-full p-2 pr-10 rounded border focus:ring-1 focus:ring-blue-400 transition-all text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${colorMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {showConfirmPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  );

  const handleAddUserToRole = (roleType, user) => {
    setRoleAssignments(prev => {
      const currentUsers = prev[roleType] || [];
      if (!currentUsers.find(u => u.id === user.id)) {
        return {
          ...prev,
          [roleType]: [...currentUsers, user]
        };
      }
      return prev;
    });
  };

  const handleRemoveUserFromRole = (roleType, userId) => {
    setRoleAssignments(prev => ({
      ...prev,
      [roleType]: (prev[roleType] || []).filter(user => user.id !== userId)
    }));
  };

  const getUnassignedUsers = () => {
    const assignedUserIds = Object.values(roleAssignments)
      .flat()
      .map(user => user.id);
    return availableUsers.filter(user => !assignedUserIds.includes(user.id));
  };

  const renderRolesTab = () => (
    <RolesTabComponentFixed
      colorMode={colorMode}
      roleAssignments={roleAssignments}
      setRoleAssignments={setRoleAssignments}
      availableUsers={availableUsers}
      saveRoleAssignments={saveRoleAssignments}
    />
  );

  const renderRolesTabOld = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className={`border rounded-lg p-4 ${
        colorMode
          ? 'bg-blue-900/20 border-blue-500/40'
          : 'bg-blue-50 border-blue-200'
      }`}>
        <h3 className={`font-medium mb-2 ${
          colorMode ? 'text-blue-300' : 'text-blue-900'
        }`}>👥 Default Role Assignments</h3>
        <p className={`text-sm mb-2 ${
          colorMode ? 'text-blue-200' : 'text-blue-700'
        }`}>
          Assign default users to key roles for new projects. These users will automatically receive alerts and messages for their assigned roles.
        </p>
        <div className={`text-xs space-y-1 ${
          colorMode ? 'text-blue-200' : 'text-blue-600'
        }`}>
          <p><strong>Note:</strong> Project Manager assignment is mandatory for each project (but can be changed per project)</p>
          <p><strong>Alerts:</strong> Users will receive notifications based on their role assignments</p>
        </div>
      </div>

      {/* Role Assignment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Project Manager */}
        <div className={`border rounded-lg p-4 ${
          colorMode
            ? 'bg-purple-900/20 border-purple-500/40'
            : 'bg-purple-50 border-purple-200'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🎯</span>
            <h4 className={`font-semibold ${
              colorMode ? 'text-purple-300' : 'text-purple-900'
            }`}>Project Manager</h4>
          </div>
          <p className={`text-xs mb-3 ${
            colorMode ? 'text-purple-200' : 'text-purple-700'
          }`}>
            Oversees product development, strategy, and client requirements
          </p>
          <select
            value={roleAssignments.productManager || ''}
            onChange={(e) => {
              const newValue = e.target.value;
              if (newValue !== roleAssignments.productManager) {
                handleRoleAssignment('productManager', newValue);
              }
            }}
            disabled={usersLoading}
            className={`w-full p-2 rounded border text-sm ${
              colorMode
                ? 'bg-[#232b4d] border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-800'
            } ${usersLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <option value="">Select Project Manager...</option>
            {availableUsers.map(user => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          {roleAssignments.productManager && (
            <div className={`mt-2 p-2 rounded text-xs ${
              colorMode ? 'bg-purple-900/40 text-purple-200' : 'bg-purple-100 text-purple-800'
            }`}>
              <strong>Current:</strong> {getUserDisplayName(roleAssignments.productManager).split(' (')[0]}
            </div>
          )}
        </div>

        {/* Field Director */}
        <div className={`border rounded-lg p-4 ${
          colorMode
            ? 'bg-orange-900/20 border-orange-500/40'
            : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🏗️</span>
            <h4 className={`font-semibold ${
              colorMode ? 'text-orange-300' : 'text-orange-900'
            }`}>Field Director</h4>
          </div>
          <p className={`text-xs mb-3 ${
            colorMode ? 'text-orange-200' : 'text-orange-700'
          }`}>
            Manages field operations, crews, and on-site project execution
          </p>
          <select
            value={roleAssignments.fieldDirector || ''}
            onChange={(e) => {
              const newValue = e.target.value;
              if (newValue !== roleAssignments.fieldDirector) {
                handleRoleAssignment('fieldDirector', newValue);
              }
            }}
            disabled={usersLoading}
            className={`w-full p-2 rounded border text-sm ${
              colorMode
                ? 'bg-[#232b4d] border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-800'
            } ${usersLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <option value="">Select Field Director...</option>
            {availableUsers.map(user => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          {roleAssignments.fieldDirector && (
            <div className={`mt-2 p-2 rounded text-xs ${
              colorMode ? 'bg-orange-900/40 text-orange-200' : 'bg-orange-100 text-orange-800'
            }`}>
              <strong>Current:</strong> {getUserDisplayName(roleAssignments.fieldDirector).split(' (')[0]}
            </div>
          )}
        </div>

        {/* Office Staff */}
        <div className={`border rounded-lg p-4 ${
          colorMode
            ? 'bg-green-900/20 border-green-500/40'
            : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📋</span>
            <h4 className={`font-semibold ${
              colorMode ? 'text-green-300' : 'text-green-900'
            }`}>Office Staff</h4>
          </div>
          <p className={`text-xs mb-3 ${
            colorMode ? 'text-green-200' : 'text-green-700'
          }`}>
            Handles scheduling, documentation, permits, and client communications
          </p>
          <select
            value={roleAssignments.officeStaff || ''}
            onChange={(e) => {
              const newValue = e.target.value;
              if (newValue !== roleAssignments.officeStaff) {
                handleRoleAssignment('officeStaff', newValue);
              }
            }}
            disabled={usersLoading}
            className={`w-full p-2 rounded border text-sm ${
              colorMode
                ? 'bg-[#232b4d] border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-800'
            } ${usersLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <option value="">Select Office Staff...</option>
            {availableUsers.map(user => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          {roleAssignments.officeStaff && (
            <div className={`mt-2 p-2 rounded text-xs ${
              colorMode ? 'bg-green-900/40 text-green-200' : 'bg-green-100 text-green-800'
            }`}>
              <strong>Current:</strong> {getUserDisplayName(roleAssignments.officeStaff).split(' (')[0]}
            </div>
          )}
        </div>

        {/* Administration */}
        <div className={`border rounded-lg p-4 ${
          colorMode
            ? 'bg-red-900/20 border-red-500/40'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">⚙️</span>
            <h4 className={`font-semibold ${
              colorMode ? 'text-red-300' : 'text-red-900'
            }`}>Administration</h4>
          </div>
          <p className={`text-xs mb-3 ${
            colorMode ? 'text-red-200' : 'text-red-700'
          }`}>
            Manages system settings, user accounts, and administrative tasks
          </p>
          <select
            value={roleAssignments.administration || ''}
            onChange={(e) => {
              const newValue = e.target.value;
              if (newValue !== roleAssignments.administration) {
                handleRoleAssignment('administration', newValue);
              }
            }}
            disabled={usersLoading}
            className={`w-full p-2 rounded border text-sm ${
              colorMode
                ? 'bg-[#232b4d] border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-800'
            } ${usersLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <option value="">Select Administrator...</option>
            {availableUsers.map(user => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          {roleAssignments.administration && (
            <div className={`mt-2 p-2 rounded text-xs ${
              colorMode ? 'bg-red-900/40 text-red-200' : 'bg-red-100 text-red-800'
            }`}>
              <strong>Current:</strong> {getUserDisplayName(roleAssignments.administration).split(' (')[0]}
            </div>
          )}
        </div>

        {/* Subcontractor */}
        <div className={`border rounded-lg p-4 ${
          colorMode
            ? 'bg-orange-900/20 border-orange-500/40'
            : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🔨</span>
            <h4 className={`font-semibold ${
              colorMode ? 'text-orange-300' : 'text-orange-900'
            }`}>Subcontractor</h4>
          </div>
          <p className={`text-xs mb-3 ${
            colorMode ? 'text-orange-200' : 'text-orange-700'
          }`}>
            External contractors who work on specific projects
          </p>
          <select
            value={roleAssignments.subcontractor || ''}
            onChange={(e) => {
              const newValue = e.target.value;
              if (newValue !== roleAssignments.subcontractor) {
                handleRoleAssignment('subcontractor', newValue);
              }
            }}
            disabled={usersLoading}
            className={`w-full p-2 rounded border text-sm ${
              colorMode
                ? 'bg-[#232b4d] border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-800'
            } ${usersLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <option value="">Select Subcontractor...</option>
            {availableUsers.map(user => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          {roleAssignments.subcontractor && (
            <div className={`mt-2 p-2 rounded text-xs ${
              colorMode ? 'bg-orange-900/40 text-orange-200' : 'bg-orange-100 text-orange-800'
            }`}>
              <strong>Current:</strong> {getUserDisplayName(roleAssignments.subcontractor).split(' (')[0]}
            </div>
          )}
        </div>
      </div>



      {/* Summary Card */}
      <div className={`border rounded-lg p-4 ${
        colorMode
          ? 'bg-gray-800/50 border-gray-600'
          : 'bg-gray-50 border-gray-200'
      }`}>
        <h4 className={`font-semibold mb-3 ${
          colorMode ? 'text-white' : 'text-gray-900'
        }`}>📊 Current Role Assignments</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className={`p-2 rounded ${
            colorMode ? 'bg-gray-700/50' : 'bg-white'
          }`}>
            <div className={`font-medium ${colorMode ? 'text-white' : 'text-gray-800'}`}>
              🎯 Project Manager
            </div>
            <div className={`text-xs ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {roleAssignments.productManager
                ? getUserDisplayName(roleAssignments.productManager).split(' (')[0]
                : 'Not assigned'
              }
            </div>
          </div>
          <div className={`p-2 rounded ${
            colorMode ? 'bg-gray-700/50' : 'bg-white'
          }`}>
            <div className={`font-medium ${colorMode ? 'text-white' : 'text-gray-800'}`}>
              🏗️ Field Director
            </div>
            <div className={`text-xs ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {roleAssignments.fieldDirector
                ? getUserDisplayName(roleAssignments.fieldDirector).split(' (')[0]
                : 'Not assigned'
              }
            </div>
          </div>
          <div className={`p-2 rounded ${
            colorMode ? 'bg-gray-700/50' : 'bg-white'
          }`}>
            <div className={`font-medium ${colorMode ? 'text-white' : 'text-gray-800'}`}>
              📋 Office Staff
            </div>
            <div className={`text-xs ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {roleAssignments.officeStaff
                ? getUserDisplayName(roleAssignments.officeStaff).split(' (')[0]
                : 'Not assigned'
              }
            </div>
          </div>
          <div className={`p-2 rounded ${
            colorMode ? 'bg-gray-700/50' : 'bg-white'
          }`}>
            <div className={`font-medium ${colorMode ? 'text-white' : 'text-gray-800'}`}>
              ⚙️ Administration
            </div>
            <div className={`text-xs ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {roleAssignments.administration
                ? getUserDisplayName(roleAssignments.administration).split(' (')[0]
                : 'Not assigned'
              }
            </div>
          </div>
          <div className={`p-2 rounded ${
            colorMode ? 'bg-gray-700/50' : 'bg-white'
          }`}>
            <div className={`font-medium ${colorMode ? 'text-white' : 'text-gray-800'}`}>
              🔨 Subcontractor
            </div>
            <div className={`text-xs ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {roleAssignments.subcontractor
                ? getUserDisplayName(roleAssignments.subcontractor).split(' (')[0]
                : 'Not assigned'
              }
            </div>
          </div>

        </div>
      </div>

      {/* Info Footer */}
      <div className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'} space-y-1`}>
        <p>💡 <strong>Automatic Notifications:</strong> Users assigned to roles will automatically receive relevant alerts and messages.</p>
        <p>🔄 <strong>Project Manager Override:</strong> While a default is set, Project Manager can be changed for each individual project.</p>
        <p>💾 <strong>Auto-Save:</strong> Role assignments are saved automatically when changed.</p>
      </div>
    </div>
);

  // Note: renderSubjectsTab function removed per requirements

  const renderCompanyTab = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Company Name</label>
          <input
            type="text"
            value={company}
            onChange={e => setCompany(e.target.value)}
            className={`w-full p-2 rounded border focus:ring-1 focus:ring-blue-400 transition-all text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
          />
        </div>
        <div>
          <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Business Type</label>
          <select
            className={`w-full p-2 rounded border focus:ring-1 focus:ring-blue-400 transition-all text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
          >
            <option value="construction">Construction</option>
            <option value="roofing">Roofing</option>
            <option value="remodeling">Remodeling</option>
            <option value="general">General Contractor</option>
          </select>
        </div>
        <div>
          <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>License Number</label>
          <input
            type="text"
            className={`w-full p-2 rounded border focus:ring-1 focus:ring-blue-400 transition-all text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
            placeholder="Enter license number"
          />
        </div>
        <div>
          <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Tax ID</label>
          <input
            type="text"
            className={`w-full p-2 rounded border focus:ring-1 focus:ring-blue-400 transition-all text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
            placeholder="Enter tax ID"
          />
        </div>
      </div>

      <div>
        <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Company Address</label>
        <GoogleMapsAutocomplete
          name="companyAddress"
          value=""
          onChange={() => {}}
          placeholder="Enter company address"
          className={`w-full p-2 rounded border focus:ring-1 focus:ring-blue-400 transition-all text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Primary Contact</label>
          <input
            type="text"
            className={`w-full p-2 rounded border focus:ring-1 focus:ring-blue-400 transition-all text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
            placeholder="Primary contact name"
          />
        </div>
        <div>
          <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Contact Phone</label>
          <input
            type="tel"
            className={`w-full p-2 rounded border focus:ring-1 focus:ring-blue-400 transition-all text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
            placeholder="Contact phone number"
          />
        </div>
      </div>
    </div>
  );

  const renderProjectImportTab = () => (
    <div className="space-y-6">
      <div className={`border rounded-lg p-4 ${
        colorMode
          ? 'bg-blue-900/20 border-blue-500/40'
          : 'bg-blue-50 border-blue-200'
      }`}>
        <h3 className={`font-medium mb-2 ${
          colorMode ? 'text-blue-300' : 'text-blue-900'
        }`}>📋 Project Data Import</h3>
        <p className={`text-sm mb-3 ${
          colorMode ? 'text-blue-200' : 'text-blue-700'
        }`}>
          Import projects with customer data. Each project will be initialized with the complete 91-line item workflow starting at the LEAD phase.
        </p>
        <div className={`text-xs space-y-1 ${
          colorMode ? 'text-blue-200' : 'text-blue-600'
        }`}>
          <p><strong>Required Columns:</strong> projectNumber, projectName, primaryName, primaryEmail, primaryPhone, address, projectType, budget, startDate, endDate</p>
          <p><strong>Optional Columns:</strong> secondaryName, secondaryEmail, secondaryPhone, primaryContact, notes (customer notes), status, priority, estimatedCost, actualCost, description (project description), pmPhone, pmEmail, progress</p>
          <p><strong>Valid Project Types:</strong> ROOF_REPLACEMENT, KITCHEN_REMODEL, BATHROOM_RENOVATION, SIDING_INSTALLATION, WINDOW_REPLACEMENT, FLOORING, PAINTING, ELECTRICAL_WORK, PLUMBING, HVAC, DECK_CONSTRUCTION, LANDSCAPING, OTHER</p>
          <p><strong>Valid Statuses:</strong> PENDING, IN_PROGRESS, COMPLETED, ON_HOLD</p>
          <p><strong>Valid Priorities:</strong> LOW, MEDIUM, HIGH</p>
        </div>
      </div>

      {/* Workflow Template Selection */}
      <div className={`border rounded-lg p-4 ${
        colorMode
          ? 'bg-gray-800/50 border-gray-600'
          : 'bg-gray-50 border-gray-200'
      }`}>
        <h3 className={`font-medium mb-2 ${
          colorMode ? 'text-blue-300' : 'text-blue-900'
        }`}>🔧 Workflow Template</h3>
        <p className={`text-sm mb-3 ${
          colorMode ? 'text-gray-300' : 'text-gray-700'
        }`}>
          Select the workflow template to assign to imported projects
        </p>
        <select
          value={selectedWorkflowTemplate}
          onChange={(e) => setSelectedWorkflowTemplate(e.target.value)}
          className={`w-full p-2 rounded border text-sm ${
            colorMode
              ? 'bg-[#181f3a] border-[#3b82f6] text-white'
              : 'bg-white border-gray-300 text-gray-800'
          }`}
        >
          <option value="">Select a workflow template...</option>
          {workflowTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name} - {template.description}
            </option>
          ))}
        </select>
      </div>

      {/* Download Templates */}
      <div className={`border rounded-lg p-4 ${
        colorMode
          ? 'bg-gray-800/50 border-gray-600'
          : 'bg-gray-50 border-gray-200'
      }`}>
        <h3 className={`font-medium mb-2 ${
          colorMode ? 'text-blue-300' : 'text-blue-900'
        }`}>📄 Download CSV Template</h3>
        <p className={`text-sm mb-3 ${
          colorMode ? 'text-gray-300' : 'text-gray-700'
        }`}>
          Download the combined Project + Customer template with project number field
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => downloadCSVTemplate('combined')}
            className="px-4 py-2 bg-[var(--color-primary-blueprint-blue)] text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            🏗️👥 Combined Template
          </button>
          <button
            onClick={() => downloadCSVTemplate('combined-instructions')}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-sm font-medium"
          >
            📋 Upload Instructions
          </button>
        </div>
      </div>

      {/* Upload Area */}
      <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        colorMode
          ? 'border-gray-600 hover:border-gray-500'
          : 'border-gray-300 hover:border-gray-400'
      }`}>
        <div className="text-4xl mb-4">🏗️</div>
        {importFile ? (
          <div className="space-y-3">
            <div className={`p-3 rounded border ${
              colorMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-100 border-gray-300'
            }`}>
              <p className={`text-sm font-medium ${
                colorMode ? 'text-white' : 'text-gray-800'
              }`}>
                Selected: {importFile.name}
              </p>
              <p className={`text-xs ${
                colorMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Size: {(importFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleProjectImport}
                disabled={importLoading || !selectedWorkflowTemplate}
                className={`px-6 py-2 rounded font-medium transition-colors ${
                  importLoading || !selectedWorkflowTemplate
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-[var(--color-primary-blueprint-blue)] text-white hover:bg-blue-700'
                }`}
              >
                {importLoading ? '🔄 Importing...' : '📤 Import Projects'}
              </button>
              <button
                onClick={() => {
                  setImportFile(null);
                  setImportResults(null);
                }}
                className={`px-4 py-2 rounded border transition-colors ${
                  colorMode
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <label className="cursor-pointer">
              <span className="px-4 py-2 bg-[var(--color-primary-blueprint-blue)] text-white rounded hover:bg-blue-700 transition-colors">
                Choose Project File
              </span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setImportFile(file);
                    setImportResults(null);
                  }
                }}
                className="hidden"
              />
            </label>
            <p className={`mt-2 text-sm ${
              colorMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Upload your Excel or CSV file with project data
            </p>
            <p className={`mt-1 text-xs ${
              colorMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Supported formats: .xlsx, .xls, .csv (max 10MB)
            </p>
          </div>
        )}
      </div>

      {/* Import Results */}
      {importResults && (
        <div className={`border rounded-lg p-4 ${
          importResults.failed.length > 0
            ? colorMode
              ? 'bg-yellow-900/20 border-yellow-500/40'
              : 'bg-yellow-50 border-yellow-200'
            : colorMode
              ? 'bg-green-900/20 border-green-500/40'
              : 'bg-green-50 border-green-200'
        }`}>
          <h3 className={`font-medium mb-2 ${
            importResults.failed.length > 0
              ? colorMode ? 'text-yellow-300' : 'text-yellow-900'
              : colorMode ? 'text-green-300' : 'text-green-900'
          }`}>📊 Import Results</h3>
          <div className={`text-sm space-y-2 ${
            importResults.failed.length > 0
              ? colorMode ? 'text-yellow-200' : 'text-yellow-800'
              : colorMode ? 'text-green-200' : 'text-green-800'
          }`}>
            <p><strong>Total:</strong> {importResults.total}</p>
            <p><strong>Successful:</strong> {importResults.successful.length}</p>
            <p><strong>Failed:</strong> {importResults.failed.length}</p>
          </div>

          {importResults.successful.length > 0 && (
            <div className="mt-4">
              <h4 className={`font-medium text-sm mb-2 ${
                colorMode ? 'text-green-300' : 'text-green-900'
              }`}>✅ Successfully Imported Projects:</h4>
              <div className="space-y-1">
                {importResults.successful.slice(0, 5).map((project, index) => (
                  <div key={index} className={`text-xs p-2 rounded ${
                    colorMode ? 'bg-green-900/30' : 'bg-green-100'
                  }`}>
                    <strong>{project.projectNumber}</strong> - {project.customerName}
                  </div>
                ))}
                {importResults.successful.length > 5 && (
                  <p className={`text-xs ${
                    colorMode ? 'text-green-300' : 'text-green-700'
                  }`}>
                    ... and {importResults.successful.length - 5} more
                  </p>
                )}
              </div>
            </div>
          )}

          {importResults.failed.length > 0 && (
            <div className="mt-4">
              <h4 className={`font-medium text-sm mb-2 ${
                colorMode ? 'text-red-300' : 'text-red-900'
              }`}>❌ Failed Imports:</h4>
              <div className="space-y-1">
                {importResults.failed.slice(0, 3).map((failed, index) => (
                  <div key={index} className={`text-xs p-2 rounded ${
                    colorMode ? 'bg-red-900/30' : 'bg-red-100'
                  }`}>
                    <strong>Row {failed.row || index + 1}:</strong> {String(failed.error || failed.message || 'Unknown error')}
                  </div>
                ))}
                {importResults.failed.length > 3 && (
                  <p className={`text-xs ${
                    colorMode ? 'text-red-300' : 'text-red-700'
                  }`}>
                    ... and {importResults.failed.length - 3} more errors
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Example Data */}
      <div className={`border rounded-lg p-4 ${
        colorMode
          ? 'bg-gray-800/50 border-gray-600'
          : 'bg-gray-50 border-gray-200'
      }`}>
        <h3 className={`font-medium mb-2 ${
          colorMode ? 'text-blue-300' : 'text-blue-900'
        }`}>💡 Example Project Data</h3>
        <div className="overflow-x-auto">
          <table className={`min-w-full text-xs border-collapse ${
            colorMode ? 'border-gray-600' : 'border-gray-300'
          }`}>
            <thead>
              <tr className={colorMode ? 'bg-gray-700/50' : 'bg-gray-100'}>
                <th className={`px-2 py-1 text-left border ${
                  colorMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-900'
                }`}>projectNumber</th>
                <th className={`px-2 py-1 text-left border ${
                  colorMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-900'
                }`}>projectName</th>
                <th className={`px-2 py-1 text-left border ${
                  colorMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-900'
                }`}>primaryName</th>
                <th className={`px-2 py-1 text-left border ${
                  colorMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-900'
                }`}>primaryEmail</th>
                <th className={`px-2 py-1 text-left border ${
                  colorMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-900'
                }`}>address</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={`px-2 py-1 border ${
                  colorMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-800'
                }`}>12345</td>
                <td className={`px-2 py-1 border ${
                  colorMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-800'
                }`}>Smith Roof Replacement</td>
                <td className={`px-2 py-1 border ${
                  colorMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-800'
                }`}>John Smith</td>
                <td className={`px-2 py-1 border ${
                  colorMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-800'
                }`}>john.smith@email.com</td>
                <td className={`px-2 py-1 border ${
                  colorMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-800'
                }`}>123 Main St, Dallas TX</td>
              </tr>
              <tr>
                <td className={`px-2 py-1 border ${
                  colorMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-800'
                }`}>12346</td>
                <td className={`px-2 py-1 border ${
                  colorMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-800'
                }`}>Doe Kitchen Remodel</td>
                <td className={`px-2 py-1 border ${
                  colorMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-800'
                }`}>Jane Doe</td>
                <td className={`px-2 py-1 border ${
                  colorMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-800'
                }`}>jane.doe@email.com</td>
                <td className={`px-2 py-1 border ${
                  colorMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-800'
                }`}>456 Oak Ave, Dallas TX</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Excel Data Manager functions
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadFile(file);
      setExcelError('');
      setUploadResult(null);
    }
  };

  const handleExcelUpload = async () => {
    if (!uploadFile) {
      setExcelError('Please select an Excel file first');
      return;
    }

    setIsUploading(true);
    setExcelError('');

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await fetch('/api/excel-data/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      setUploadResult(data.data);
      setUploadFile(null);
      setSuccessMessage('Excel data uploaded successfully to DigitalOcean database!');
      setSuccess(true);

      // Reset file input
      const fileInput = document.getElementById('excel-file-input-settings');
      if (fileInput) fileInput.value = '';

      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);

    } catch (err) {
      console.error('Upload error:', err);
      setExcelError(err.message || err.toString() || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/excel-data/template', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'project-data-template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setExcelError('Failed to download template: ' + (err.message || err.toString() || 'Unknown error'));
    }
  };

  const exportDatabase = async () => {
    try {
      const response = await fetch('/api/excel-data/export', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `projects-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccessMessage('Database exported to Excel successfully!');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setExcelError('Failed to export data: ' + (err.message || err.toString() || 'Unknown error'));
    }
  };

  const renderExcelDataTab = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className={`border rounded-lg p-4 ${colorMode ? 'bg-gray-800 border-gray-700' : 'bg-green-50 border-green-200'}`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌐</span>
          <div>
            <h3 className={`font-semibold ${colorMode ? 'text-green-400' : 'text-green-800'}`}>
              DigitalOcean PostgreSQL Integration
            </h3>
            <p className={`text-sm ${colorMode ? 'text-gray-300' : 'text-green-700'}`}>
              Direct Excel control of your live database
            </p>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className={`border rounded-lg p-4 ${colorMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h3 className={`font-semibold mb-3 ${colorMode ? 'text-white' : 'text-gray-900'}`}>
          📤 Upload Project Data
        </h3>

        <div className={`border-2 border-dashed rounded-lg p-4 text-center mb-4 ${
          uploadFile
            ? colorMode ? 'border-green-500 bg-green-900/20' : 'border-green-400 bg-green-50'
            : colorMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-50'
        }`}>
          {uploadFile ? (
            <div>
              <span className="text-2xl">✅</span>
              <p className={`font-medium ${colorMode ? 'text-green-400' : 'text-green-800'}`}>
                {uploadFile.name}
              </p>
              <p className={`text-sm ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div>
              <span className="text-3xl">📊</span>
              <p className={`font-medium ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                Choose Excel File
              </p>
              <p className={`text-sm ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                .xlsx or .xls files only
              </p>
            </div>
          )}

          <input
            id="excel-file-input-settings"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />

          <label
            htmlFor="excel-file-input-settings"
            className={`inline-block mt-3 px-4 py-2 rounded-lg cursor-pointer transition-colors text-sm ${
              colorMode
                ? 'bg-[var(--color-primary-blueprint-blue)] hover:bg-blue-500 text-white'
                : 'bg-blue-500 hover:bg-[var(--color-primary-blueprint-blue)] text-white'
            }`}
          >
            {uploadFile ? 'Choose Different File' : 'Select Excel File'}
          </label>
        </div>

        <button
          onClick={handleExcelUpload}
          disabled={!uploadFile || isUploading}
          className={`w-full py-2 px-4 rounded-lg font-semibold transition-colors text-sm ${
            !uploadFile || isUploading
              ? colorMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : colorMode ? 'bg-[var(--color-success-green)] hover:bg-green-500 text-white' : 'bg-green-500 hover:bg-[var(--color-success-green)] text-white'
          }`}
        >
          {isUploading ? 'Syncing to DigitalOcean...' : 'Upload to Database'}
        </button>
      </div>

      {/* Download Section */}
      <div className={`border rounded-lg p-4 ${colorMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h3 className={`font-semibold mb-3 ${colorMode ? 'text-white' : 'text-gray-900'}`}>
          📥 Download & Export
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className={`p-3 rounded-lg ${colorMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <h4 className={`font-medium mb-2 text-sm ${colorMode ? 'text-white' : 'text-gray-900'}`}>
              Excel Template
            </h4>
            <p className={`text-xs mb-3 ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Download template with required format
            </p>
            <button
              onClick={downloadTemplate}
              className={`w-full py-2 px-3 rounded text-xs font-medium transition-colors ${
                colorMode ? 'bg-[var(--color-primary-blueprint-blue)] hover:bg-blue-500 text-white' : 'bg-blue-500 hover:bg-[var(--color-primary-blueprint-blue)] text-white'
              }`}
            >
              Download Template
            </button>
          </div>

          <div className={`p-3 rounded-lg ${colorMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <h4 className={`font-medium mb-2 text-sm ${colorMode ? 'text-white' : 'text-gray-900'}`}>
              Export Database
            </h4>
            <p className={`text-xs mb-3 ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Export current data from DigitalOcean
            </p>
            <button
              onClick={exportDatabase}
              className={`w-full py-2 px-3 rounded text-xs font-medium transition-colors ${
                colorMode ? 'bg-[var(--color-success-green)] hover:bg-green-500 text-white' : 'bg-green-500 hover:bg-[var(--color-success-green)] text-white'
              }`}
            >
              Export to Excel
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {excelError && (
        <div className={`border rounded-lg p-3 ${colorMode ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2">
            <span className="text-red-500">⚠️</span>
            <span className={`text-sm font-medium ${colorMode ? 'text-red-400' : 'text-red-800'}`}>
              {String(excelError)}
            </span>
          </div>
        </div>
      )}

      {/* Upload Results */}
      {uploadResult && (
        <div className={`border rounded-lg p-4 ${colorMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`font-semibold mb-3 text-sm ${colorMode ? 'text-white' : 'text-gray-900'}`}>
            Upload Results
          </h3>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className={`text-center p-2 rounded ${colorMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
              <p className={`text-lg font-bold ${colorMode ? 'text-blue-400' : 'text-blue-600'}`}>
                {uploadResult.total}
              </p>
              <p className={`text-xs ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Total</p>
            </div>
            <div className={`text-center p-2 rounded ${colorMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
              <p className={`text-lg font-bold ${colorMode ? 'text-green-400' : 'text-green-600'}`}>
                {uploadResult.successful}
              </p>
              <p className={`text-xs ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Success</p>
            </div>
            <div className={`text-center p-2 rounded ${colorMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
              <p className={`text-lg font-bold ${colorMode ? 'text-red-400' : 'text-red-600'}`}>
                {uploadResult.failed}
              </p>
              <p className={`text-xs ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Failed</p>
            </div>
          </div>

          {uploadResult.errors && uploadResult.errors.length > 0 && (
            <div className={`p-3 rounded ${colorMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
              <h4 className={`font-medium mb-2 text-xs ${colorMode ? 'text-red-400' : 'text-red-800'}`}>
                Errors:
              </h4>
              <div className="space-y-1">
                {uploadResult.errors.slice(0, 3).map((error, index) => (
                  <p key={index} className={`text-xs ${colorMode ? 'text-red-300' : 'text-red-700'}`}>
                    Row {error.row}: {String(error.error || error.message || 'Unknown error')}
                  </p>
                ))}
                {uploadResult.errors.length > 3 && (
                  <p className={`text-xs ${colorMode ? 'text-red-300' : 'text-red-700'}`}>
                    ... and {uploadResult.errors.length - 3} more errors
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className={`border rounded-lg p-4 ${colorMode ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-200'}`}>
        <h3 className={`font-semibold mb-3 text-sm ${colorMode ? 'text-white' : 'text-blue-900'}`}>
          📋 How to Use
        </h3>
        <div className="space-y-2 text-xs">
          <div className="flex gap-2">
            <span className={`flex-shrink-0 w-4 h-4 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center`}>1</span>
            <p className={`${colorMode ? 'text-gray-300' : 'text-blue-800'}`}>
              Download template with required format and fields
            </p>
          </div>
          <div className="flex gap-2">
            <span className={`flex-shrink-0 w-4 h-4 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center`}>2</span>
            <p className={`${colorMode ? 'text-gray-300' : 'text-blue-800'}`}>
              Fill in your project data using same column names
            </p>
          </div>
          <div className="flex gap-2">
            <span className={`flex-shrink-0 w-4 h-4 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center`}>3</span>
            <p className={`${colorMode ? 'text-gray-300' : 'text-blue-800'}`}>
              Upload file - syncs directly to DigitalOcean PostgreSQL
            </p>
          </div>
          <div className="flex gap-2">
            <span className={`flex-shrink-0 w-4 h-4 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center`}>4</span>
            <p className={`${colorMode ? 'text-gray-300' : 'text-blue-800'}`}>
              Changes appear immediately across the entire application
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFollowUpTab = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className={`text-base font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
          Bubbles AI Settings
        </h3>
        <button
          onClick={saveFollowUpSettings}
          disabled={isLoadingFollowUp}
          className={`px-3 py-1.5 rounded text-xs font-semibold transition-all duration-200 ${
            isLoadingFollowUp
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : colorMode
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isLoadingFollowUp ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Follow-up Tracking - Moved to top */}
      <div className="mb-2">
        <h4 className={`text-xs font-semibold mb-1 ${colorMode ? 'text-white' : 'text-gray-800'}`}>
          Follow-up Tracking
        </h4>
        <div className="text-xs text-gray-500">
          <FollowUpTracking colorMode={colorMode} />
        </div>
      </div>

      <div className="space-y-2">
        {/* Enable Follow-ups */}
        <div className="flex items-center justify-between p-2 rounded border">
          <div>
            <label className={`block text-xs font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
              Enable Automatic Follow-ups
            </label>
            <p className={`text-xs ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Send follow-up reminders for tasks and alerts
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={followUpSettings.isEnabled}
              onChange={(e) => setFollowUpSettings(prev => ({ ...prev, isEnabled: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Follow-up Timing Settings */}
        {followUpSettings.isEnabled && (
          <div className="space-y-2">
            {/* Task Follow-up Timing */}
            <div className="border rounded p-2">
              <h4 className={`text-xs font-semibold mb-2 ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                Task Follow-up Timing
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Days
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={followUpSettings.taskFollowUpDays}
                    onChange={(e) => setFollowUpSettings(prev => ({ ...prev, taskFollowUpDays: parseInt(e.target.value) || 0 }))}
                    className={`w-full px-2 py-1 rounded border text-xs ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={followUpSettings.taskFollowUpHours}
                    onChange={(e) => setFollowUpSettings(prev => ({ ...prev, taskFollowUpHours: parseInt(e.target.value) || 0 }))}
                    className={`w-full px-2 py-1 rounded border text-xs ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Minutes
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={followUpSettings.taskFollowUpMinutes}
                    onChange={(e) => setFollowUpSettings(prev => ({ ...prev, taskFollowUpMinutes: parseInt(e.target.value) || 0 }))}
                    className={`w-full px-2 py-1 rounded border text-xs ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
                  />
                </div>
              </div>
            </div>

            {/* Reminder Follow-up Timing */}
            <div className="border rounded p-2">
              <h4 className={`text-xs font-semibold mb-2 ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                Reminder Follow-up Timing
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Days
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={followUpSettings.reminderFollowUpDays}
                    onChange={(e) => setFollowUpSettings(prev => ({ ...prev, reminderFollowUpDays: parseInt(e.target.value) || 0 }))}
                    className={`w-full px-2 py-1 rounded border text-xs ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={followUpSettings.reminderFollowUpHours}
                    onChange={(e) => setFollowUpSettings(prev => ({ ...prev, reminderFollowUpHours: parseInt(e.target.value) || 0 }))}
                    className={`w-full px-2 py-1 rounded border text-xs ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Minutes
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={followUpSettings.reminderFollowUpMinutes}
                    onChange={(e) => setFollowUpSettings(prev => ({ ...prev, reminderFollowUpMinutes: parseInt(e.target.value) || 0 }))}
                    className={`w-full px-2 py-1 rounded border text-xs ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
                  />
                </div>
              </div>
            </div>

            {/* Alert Follow-up Timing */}
            <div className="border rounded p-2">
              <h4 className={`text-xs font-semibold mb-2 ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                Alert Follow-up Timing
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Days
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={followUpSettings.alertFollowUpDays}
                    onChange={(e) => setFollowUpSettings(prev => ({ ...prev, alertFollowUpDays: parseInt(e.target.value) || 0 }))}
                    className={`w-full px-2 py-1 rounded border text-xs ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={followUpSettings.alertFollowUpHours}
                    onChange={(e) => setFollowUpSettings(prev => ({ ...prev, alertFollowUpHours: parseInt(e.target.value) || 0 }))}
                    className={`w-full px-2 py-1 rounded border text-xs ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Minutes
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={followUpSettings.alertFollowUpMinutes}
                    onChange={(e) => setFollowUpSettings(prev => ({ ...prev, alertFollowUpMinutes: parseInt(e.target.value) || 0 }))}
                    className={`w-full px-2 py-1 rounded border text-xs ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                  Max Follow-up Attempts
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={followUpSettings.maxFollowUpAttempts}
                  onChange={(e) => setFollowUpSettings(prev => ({ ...prev, maxFollowUpAttempts: parseInt(e.target.value) || 3 }))}
                  className={`w-full px-2 py-1 rounded border text-xs ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                  Custom Follow-up Message
                </label>
                <textarea
                  value={followUpSettings.followUpMessage}
                  onChange={(e) => setFollowUpSettings(prev => ({ ...prev, followUpMessage: e.target.value }))}
                  placeholder="Custom message..."
                  rows={2}
                  maxLength={1000}
                  className={`w-full px-2 py-1 rounded border text-xs ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
                />
                <p className={`text-xs mt-1 ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {followUpSettings.followUpMessage.length}/1000
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
      // Note: Preferences section removed per requirements
      // Note: Notifications section hidden per requirements
      case 'security':
        return renderSecurityTab();
      case 'roles':
        return renderRolesTab();
      case 'permissions':
        return <RoofingPermissionsPage colorMode={colorMode} />;
      case 'team-members':
        return <UserManagementPage colorMode={colorMode} />;
      case 'add-team-member':
        return (
          <div>
            <div className="flex items-center mb-4">
              <button
                onClick={() => setActiveTab('team-members')}
                className="mr-4 text-blue-600 hover:text-blue-800"
              >
                ← Back to Team Members
              </button>
            </div>
            <AddTeamMemberPage colorMode={colorMode} />
          </div>
        );
      case 'follow-up':
        return renderFollowUpTab();
      // Note: Excel Data section hidden per requirements
      case 'complete-excel':
        return <CompleteExcelDataManager colorMode={colorMode} />;
      // Note: Company section removed per requirements
      case 'project-import':
        return renderProjectImportTab();
      case 'workflow-import':
        return <WorkflowImportPage />;
      // Note: Subjects tab removed per requirements
      default:
        return renderProfileTab();
    }
  };

  return (
    <div className={`min-h-screen ${colorMode ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto p-3">
        <div className={`rounded-lg shadow-sm border ${colorMode ? 'bg-[#232b4d]/80 border-[#3b82f6]/40' : 'bg-white border-gray-200'}`}>
          {/* Ultra Compact Tab Navigation */}
          <div className="flex flex-wrap border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? `${colorMode ? 'text-blue-400 border-b-2 border-blue-400' : 'text-blue-600 border-b-2 border-blue-600'}`
                    : `${colorMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`
                }`}
              >
                <span className="text-sm">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Ultra Compact Tab Content */}
          <div className="p-4">
            <form onSubmit={handleSave}>
              {renderTabContent()}

              {/* Note: Most settings auto-save. Save button primarily for Profile and Security changes */}
              {(activeTab === 'profile' || activeTab === 'security') && (
                <div className="flex justify-end pt-3 border-t border-gray-200 mt-4">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 shadow-sm ${
                      isSaving
                        ? 'bg-gray-400 cursor-not-allowed'
                        : colorMode
                        ? 'bg-[var(--color-primary-blueprint-blue)] hover:bg-blue-700 text-white shadow-blue-900/20'
                        : 'bg-[var(--color-primary-blueprint-blue)] hover:bg-blue-700 text-white shadow-blue-600/20'
                    } hover:shadow-md transform hover:scale-105`}
                  >
                    <span className="flex items-center gap-2">
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <span>💾</span>
                          <span>Save Changes</span>
                        </>
                      )}
                    </span>
                  </button>
                </div>
              )}
            </form>

            {success && (
              <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-[99999] border-2 ${colorMode ? 'bg-green-800 border-green-600 text-white' : 'bg-green-100 border-green-300 text-green-800'}`}>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Success!</div>
                    <div className="text-sm opacity-90">{String(successMessage)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
