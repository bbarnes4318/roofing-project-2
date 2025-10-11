import React, { useState, useEffect } from 'react';
import { formatPhoneNumber } from '../../utils/helpers';
import { useSubjects } from '../../contexts/SubjectsContext';
import WorkflowImportPage from './WorkflowImportPage';
import CompleteExcelDataManager from '../ui/CompleteExcelDataManager';
import RolesTabComponentFixed from './RolesTabComponentFixed';
import FollowUpTracking from '../ui/FollowUpTracking';
import { API_BASE_URL, authService } from '../../services/api';

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

  // Subjects context and local UI state
  const { subjects, addSubject, editSubject, deleteSubject, resetToDefaults } = useSubjects();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [editingSubject, setEditingSubject] = useState(null);
  const [editingText, setEditingText] = useState('');

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

  const handleSave = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const payload = {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone: phone || undefined,
        timezone,
        language
      };
      const res = await authService.updateUserProfile(payload);
      if (res?.success && res?.data?.user) {
        const updated = res.data.user;
        setFirstName(updated.firstName || '');
        setLastName(updated.lastName || '');
        setName(`${updated.firstName || ''} ${updated.lastName || ''}`.trim());
        try {
          localStorage.setItem('user', JSON.stringify(updated));
          sessionStorage.setItem('user', JSON.stringify(updated));
        } catch (_) {}
        if (typeof onUserUpdated === 'function') onUserUpdated(updated);
        setSuccessMessage('Profile updated successfully!');
        setSuccess(true);
        setTimeout(() => setSuccess(false), 4000);
      } else {
        throw new Error(res?.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Profile save failed:', err);
      setSuccessMessage(String(err?.message || 'Failed to save'));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSubject = () => {
    if (addSubject(newSubject)) {
      showSuccessMessage('Subject added successfully!');
      setNewSubject('');
      setShowAddForm(false);
    }
  };

  const handleEditSubject = (index, originalSubject) => {
    setEditingSubject(index);
    setEditingText(originalSubject);
  };

  const handleSaveEdit = (index) => {
    if (editSubject(index, editingText)) {
      showSuccessMessage('Subject updated successfully!');
      setEditingSubject(null);
      setEditingText('');
    }
  };

  const handleDeleteSubject = (index) => {
    deleteSubject(index);
    showSuccessMessage('Subject deleted successfully!');
  };

  const handleCancelEdit = () => {
    setEditingSubject(null);
    setEditingText('');
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Are you sure you want to reset all subjects to defaults? This will remove any custom subjects you\'ve added.')) {
      resetToDefaults();
      showSuccessMessage('Subjects reset to defaults!');
    }
  };

  // Role assignment functions
  // New function to save array-based role assignments
  const saveRoleAssignments = async (newRoleAssignments) => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
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
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
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
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
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
            administration: [],
            subcontractor: [],
            locationManager: []
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

  // Keep local fields in sync with currentUser
  useEffect(() => {
    const fullName = currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : '';
    setName(fullName);
    setFirstName(currentUser?.firstName || '');
    setLastName(currentUser?.lastName || '');
    setEmail(currentUser?.email || '');
    setPhone(currentUser?.phone || '');
    setCompany(currentUser?.company || '');
    setTimezone(currentUser?.timezone || 'America/New_York');
    setLanguage(currentUser?.language || 'English');
  }, [currentUser]);

  // Load users and role assignments from API on mount
  useEffect(() => {
    let isMounted = true; // Prevent updates after unmount

    const loadUsersAndRoles = async () => {
      try {
        setUsersLoading(true);

        // Get auth token; do not create demo tokens
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        if (!token) {
          console.warn('⚠️ No auth token found');
        }

        // Load available users
        console.log('📡 Fetching users from API...');
        const usersResponse = await fetch(`${API_BASE_URL}/roles/users`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          console.log(`✅ Received ${usersData.data?.length || 0} users from API`);
          if (isMounted && usersData.success && usersData.data) {
            setAvailableUsers(usersData.data);
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
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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

  // Get visible tabs based on user permissions
  const getVisibleTabs = () => {
    const baseTabs = [
      { id: 'profile', label: 'Profile', icon: '👤' },
      // Note: Preferences section removed per requirements
      // Note: Notifications section hidden per requirements
      { id: 'security', label: 'Security', icon: '🔒' },
      { id: 'roles', label: 'Roles', icon: '👥' },
      { id: 'follow-up', label: 'Follow-ups', icon: '⏰' },
      // Note: Excel Data section hidden per requirements
      { id: 'subjects', label: 'Subjects', icon: '📝' }
    ];

    // Admin import tabs are hidden for all users for now

    return baseTabs;
  };

  const tabs = getVisibleTabs();

  const renderProfileTab = () => (
    <div className="space-y-3">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${colorMode ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'}`}>
          {`${(currentUser?.firstName || 'U').charAt(0).toUpperCase()}${(currentUser?.lastName || '').charAt(0).toUpperCase()}`}
        </div>
        <div>
          <div className={`text-sm font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{name || `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || 'User'}</div>
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

  const [isClearingData, setIsClearingData] = useState(false);

  const handleClearMockData = async () => {
    const confirmed = window.confirm(
      '⚠️ CLEAR ALL MOCK DATA?\n\n' +
      'This will permanently delete:\n' +
      '• All tasks\n' +
      '• All calendar events/reminders\n' +
      '• All project messages\n\n' +
      'This action CANNOT be undone!\n\n' +
      'Are you absolutely sure you want to proceed?'
    );

    if (!confirmed) return;

    // Double confirmation for safety
    const doubleConfirmed = window.confirm(
      '🚨 FINAL CONFIRMATION\n\n' +
      'You are about to DELETE ALL tasks, reminders, and messages from the system.\n\n' +
      'Click OK to proceed with deletion, or Cancel to abort.'
    );

    if (!doubleConfirmed) return;

    setIsClearingData(true);

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      
      // Delete all tasks
      const tasksResponse = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Delete all calendar events (reminders)
      const calendarResponse = await fetch(`${API_BASE_URL}/calendar`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Delete all project messages
      const messagesResponse = await fetch(`${API_BASE_URL}/project-messages`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const results = {
        tasks: tasksResponse.ok,
        calendar: calendarResponse.ok,
        messages: messagesResponse.ok
      };

      if (results.tasks && results.calendar && results.messages) {
        showSuccessMessage('✅ All mock data has been cleared successfully!');
        
        // Reload the page after 2 seconds to refresh all data
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        const failed = [];
        if (!results.tasks) failed.push('tasks');
        if (!results.calendar) failed.push('calendar events');
        if (!results.messages) failed.push('messages');
        
        showSuccessMessage(`⚠️ Partial success. Failed to clear: ${failed.join(', ')}`);
      }

    } catch (error) {
      console.error('Error clearing mock data:', error);
      showSuccessMessage('❌ Failed to clear mock data: ' + (error.message || 'Unknown error'));
    } finally {
      setIsClearingData(false);
    }
  };

  const renderSecurityTab = () => (
    <div className="space-y-3">
      {/* Note: 2FA and Session Timeout removed per requirements */}
      <div className="">
        <h3 className={`text-sm font-semibold mb-2 ${colorMode ? 'text-white' : 'text-gray-800'}`}>Change Password</h3>
        <div className="space-y-2">
          <div>
            <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className={`w-full p-2 rounded border focus:ring-1 focus:ring-blue-400 transition-all text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
              autoComplete="current-password"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>New Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={`w-full p-2 rounded border focus:ring-1 focus:ring-blue-400 transition-all text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className={`w-full p-2 rounded border focus:ring-1 focus:ring-blue-400 transition-all text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
                autoComplete="new-password"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Clear Mock Data Section */}
      <div className={`mt-6 border rounded-lg p-4 ${
        colorMode
          ? 'bg-red-900/20 border-red-500/40'
          : 'bg-red-50 border-red-200'
      }`}>
        <h3 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${
          colorMode ? 'text-red-300' : 'text-red-900'
        }`}>
          <span>🗑️</span>
          Clear All Mock Data
        </h3>
        <p className={`text-xs mb-3 ${
          colorMode ? 'text-red-200' : 'text-red-700'
        }`}>
          After trialing the software, use this to remove all test data and start fresh with real data.
        </p>
        <div className={`text-xs space-y-1 mb-3 ${
          colorMode ? 'text-red-200' : 'text-red-600'
        }`}>
          <p><strong>⚠️ Warning:</strong> This will permanently delete:</p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>All tasks (TODO, IN_PROGRESS, DONE)</li>
            <li>All calendar events and reminders</li>
            <li>All project messages and conversations</li>
          </ul>
          <p className="mt-2"><strong>❌ This action CANNOT be undone!</strong></p>
        </div>
        <button
          type="button"
          onClick={handleClearMockData}
          disabled={isClearingData}
          className={`w-full px-4 py-2 rounded font-semibold text-sm transition-colors ${
            isClearingData
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : colorMode
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {isClearingData ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Clearing All Data...
            </span>
          ) : (
            '🗑️ Clear All Mock Data'
          )}
        </button>
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

  const renderSubjectsTab = () => (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Message Subjects</h3>
          <p className={`text-xs mt-1 ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Manage subjects available in Project Messages dropdown ({subjects.length} subjects)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1.5 bg-[var(--color-primary-blueprint-blue)] text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
          >
            <span>+</span>
            Add Subject
          </button>
          <button
            type="button"
            onClick={handleResetToDefaults}
            className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
              colorMode
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Add New Subject Form */}
      {showAddForm && (
        <div className={`p-3 rounded border ${colorMode ? 'bg-[#1e293b] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="Enter new subject..."
              className={`flex-1 p-2 rounded border text-sm ${
                colorMode
                  ? 'bg-[#232b4d] border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
              }`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSubject();
                } else if (e.key === 'Escape') {
                  setShowAddForm(false);
                  setNewSubject('');
                }
              }}
              autoFocus
            />
            <button
              type="button"
              onClick={handleAddSubject}
              disabled={!newSubject.trim() || subjects.includes(newSubject.trim())}
              className={`px-3 py-2 text-xs font-medium rounded transition-colors ${
                newSubject.trim() && !subjects.includes(newSubject.trim())
                  ? 'bg-[var(--color-success-green)] text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewSubject('');
              }}
              className={`px-3 py-2 text-xs font-medium rounded border transition-colors ${
                colorMode
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Cancel
            </button>
          </div>
          {newSubject.trim() && subjects.includes(newSubject.trim()) && (
            <p className="text-xs text-red-500 mt-1">This subject already exists</p>
          )}
        </div>
      )}

      {/* Subjects List */}
      <div className={`max-h-96 overflow-y-auto border rounded ${colorMode ? 'border-gray-600' : 'border-gray-200'}`}>
        {subjects.length === 0 ? (
          <div className="p-4 text-center">
            <p className={`text-sm ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>No subjects found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {subjects.map((subject, index) => (
              <div key={index} className={`p-3 hover:bg-opacity-50 transition-colors ${
                colorMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
              }`}>
                <div className="flex items-center justify-between">
                  {editingSubject === index ? (
                    // Edit mode
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className={`flex-1 p-1.5 rounded border text-sm ${
                          colorMode
                            ? 'bg-[#232b4d] border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-800'
                        }`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveEdit(index);
                          } else if (e.key === 'Escape') {
                            handleCancelEdit();
                          }
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(index)}
                        disabled={!editingText.trim() || subjects.includes(editingText.trim())}
                        className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                          editingText.trim() && !subjects.includes(editingText.trim())
                            ? 'bg-[var(--color-success-green)] text-white hover:bg-green-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className={`px-2 py-1 text-xs font-medium rounded border transition-colors ${
                          colorMode
                            ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    // View mode
                    <>
                      <div className="flex-1">
                        <span className={`text-sm font-medium ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                          {subject}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditSubject(index, subject)}
                          className={`p-1.5 rounded transition-colors ${
                            colorMode
                              ? 'text-blue-400 hover:bg-blue-900/20'
                              : 'text-blue-600 hover:bg-blue-50'
                          }`}
                          title="Edit subject"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete "${subject}"?`)) {
                              handleDeleteSubject(index);
                            }
                          }}
                          className={`p-1.5 rounded transition-colors ${
                            colorMode
                              ? 'text-red-400 hover:bg-red-900/20'
                              : 'text-red-600 hover:bg-red-50'
                          }`}
                          title="Delete subject"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>
                {editingSubject === index && editingText.trim() && subjects.includes(editingText.trim()) && (
                  <p className="text-xs text-red-500 mt-1">This subject already exists</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
        <p>💡 Changes are saved automatically and will appear in Project Messages dropdowns immediately.</p>
        <p className="mt-1">📝 Use "Reset to Defaults" to restore the original subject list.</p>
      </div>
    </div>
  );

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
        <textarea
          rows={2}
          className={`w-full p-2 rounded border focus:ring-1 focus:ring-blue-400 transition-all text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
          placeholder="Enter company address"
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
          Follow-up Settings
        </h3>
        <button
          onClick={saveFollowUpSettings}
          disabled={isLoadingFollowUp}
          className={`px-4 py-2 rounded text-sm font-semibold transition-all duration-200 ${
            isLoadingFollowUp
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : colorMode
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isLoadingFollowUp ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="space-y-4">
        {/* Enable Follow-ups */}
        <div className="flex items-center justify-between p-3 rounded border">
          <div>
            <label className={`block text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
              Enable Automatic Follow-ups
            </label>
            <p className={`text-xs ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Automatically send follow-up reminders for tasks and alerts
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
          <div className="space-y-4">
            {/* Task Follow-up Timing */}
            <div className="border rounded p-4">
              <h4 className={`text-sm font-semibold mb-3 ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                Task Follow-up Timing
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Days
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={followUpSettings.taskFollowUpDays}
                    onChange={(e) => setFollowUpSettings(prev => ({ ...prev, taskFollowUpDays: parseInt(e.target.value) || 0 }))}
                    className={`w-full p-2 rounded border text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={followUpSettings.taskFollowUpHours}
                    onChange={(e) => setFollowUpSettings(prev => ({ ...prev, taskFollowUpHours: parseInt(e.target.value) || 0 }))}
                    className={`w-full p-2 rounded border text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Minutes
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={followUpSettings.taskFollowUpMinutes}
                    onChange={(e) => setFollowUpSettings(prev => ({ ...prev, taskFollowUpMinutes: parseInt(e.target.value) || 0 }))}
                    className={`w-full p-2 rounded border text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
                  />
                </div>
              </div>
            </div>

            {/* Reminder Follow-up Timing */}
            <div className="border rounded p-4">
              <h4 className={`text-sm font-semibold mb-3 ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                Reminder Follow-up Timing
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Days
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={followUpSettings.reminderFollowUpDays}
                    onChange={(e) => setFollowUpSettings(prev => ({ ...prev, reminderFollowUpDays: parseInt(e.target.value) || 0 }))}
                    className={`w-full p-2 rounded border text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={followUpSettings.reminderFollowUpHours}
                    onChange={(e) => setFollowUpSettings(prev => ({ ...prev, reminderFollowUpHours: parseInt(e.target.value) || 0 }))}
                    className={`w-full p-2 rounded border text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Minutes
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={followUpSettings.reminderFollowUpMinutes}
                    onChange={(e) => setFollowUpSettings(prev => ({ ...prev, reminderFollowUpMinutes: parseInt(e.target.value) || 0 }))}
                    className={`w-full p-2 rounded border text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
                  />
                </div>
              </div>
            </div>

            {/* Alert Follow-up Timing */}
            <div className="border rounded p-4">
              <h4 className={`text-sm font-semibold mb-3 ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                Alert Follow-up Timing
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Days
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={followUpSettings.alertFollowUpDays}
                    onChange={(e) => setFollowUpSettings(prev => ({ ...prev, alertFollowUpDays: parseInt(e.target.value) || 0 }))}
                    className={`w-full p-2 rounded border text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={followUpSettings.alertFollowUpHours}
                    onChange={(e) => setFollowUpSettings(prev => ({ ...prev, alertFollowUpHours: parseInt(e.target.value) || 0 }))}
                    className={`w-full p-2 rounded border text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Minutes
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={followUpSettings.alertFollowUpMinutes}
                    onChange={(e) => setFollowUpSettings(prev => ({ ...prev, alertFollowUpMinutes: parseInt(e.target.value) || 0 }))}
                    className={`w-full p-2 rounded border text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-1 ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                Max Follow-up Attempts
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={followUpSettings.maxFollowUpAttempts}
                onChange={(e) => setFollowUpSettings(prev => ({ ...prev, maxFollowUpAttempts: parseInt(e.target.value) || 3 }))}
                className={`w-full p-2 rounded border text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
              />
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-1 ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                Custom Follow-up Message
              </label>
              <textarea
                value={followUpSettings.followUpMessage}
                onChange={(e) => setFollowUpSettings(prev => ({ ...prev, followUpMessage: e.target.value }))}
                placeholder="Enter a custom message for follow-up notifications..."
                rows={3}
                maxLength={1000}
                className={`w-full p-2 rounded border text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
              />
              <p className={`text-xs mt-1 ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {followUpSettings.followUpMessage.length}/1000 characters
              </p>
            </div>
          </div>
        )}

        {/* Follow-up Tracking */}
        <div className="mt-6">
          <h4 className={`text-md font-semibold mb-3 ${colorMode ? 'text-white' : 'text-gray-800'}`}>
            Follow-up Tracking
          </h4>
          <FollowUpTracking colorMode={colorMode} />
        </div>
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
      case 'subjects':
        return renderSubjectsTab();
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
              <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 border-2 ${colorMode ? 'bg-green-800 border-green-600 text-white' : 'bg-green-100 border-green-300 text-green-800'}`}>
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
