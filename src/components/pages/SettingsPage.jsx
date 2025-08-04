import React, { useState, useEffect } from 'react';
import { formatPhoneNumber } from '../../utils/helpers';
import { useSubjects } from '../../contexts/SubjectsContext';
import WorkflowImportPage from './WorkflowImportPage';
import { API_BASE_URL } from '../../services/api';

const mockUser = {
  name: 'Sarah Owner',
  email: 'sarah.owner@kenstruction.com',
  role: 'Owner',
  avatar: 'SO',
  phone: '(555) 123-4567',
  company: 'Kenstruction LLC',
  timezone: 'America/New_York',
  language: 'English'
};

const SettingsPage = ({ colorMode, setColorMode }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [name, setName] = useState(mockUser.name);
  const [email, setEmail] = useState(mockUser.email);
  const [phone, setPhone] = useState(mockUser.phone);
  const [company, setCompany] = useState(mockUser.company);
  const [timezone, setTimezone] = useState(mockUser.timezone);
  const [language, setLanguage] = useState(mockUser.language);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [projectUpdates, setProjectUpdates] = useState(true);
  const [taskReminders, setTaskReminders] = useState(true);
  const [systemAlerts, setSystemAlerts] = useState(true);

  // Security settings
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(30);

  // Subjects management state
  const { subjects, addSubject, editSubject, deleteSubject, resetToDefaults } = useSubjects();
  const [newSubject, setNewSubject] = useState('');
  const [editingSubject, setEditingSubject] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Project import state
  const [workflowTemplates, setWorkflowTemplates] = useState([]);
  const [selectedWorkflowTemplate, setSelectedWorkflowTemplate] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState(null);

  const handleSave = (e) => {
    e.preventDefault();
    setSuccessMessage('Settings saved successfully!');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  // Subjects management functions
  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
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

  // Project import functions
  const fetchWorkflowTemplates = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/project-import/templates`);
      const data = await response.json();
      if (data.success) {
        setWorkflowTemplates(data.data);
        if (data.data.length > 0) {
          setSelectedWorkflowTemplate(data.data[0].id);
        }
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
        setImportResults(data.data);
        showSuccessMessage(`Import completed: ${data.data.successful.length} projects created successfully`);
        setImportFile(null);
      } else {
        showSuccessMessage(`Import failed: ${data.message}`);
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

  // Load workflow templates on component mount
  useEffect(() => {
    fetchWorkflowTemplates();
  }, []);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'company', label: 'Company', icon: '🏢' },
    { id: 'project-import', label: 'Project Import', icon: '🏗️' },
    { id: 'workflow-import', label: 'Workflow Import', icon: '📊' },
    { id: 'subjects', label: 'Subjects', icon: '📝' }
  ];

  const renderProfileTab = () => (
    <div className="space-y-3">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${colorMode ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'}`}>
          {mockUser.avatar}
        </div>
        <div>
          <div className={`text-sm font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{mockUser.name}</div>
          <div className={`text-xs ${colorMode ? 'text-blue-200' : 'text-blue-600'}`}>{mockUser.role}</div>
          <div className={`text-[10px] ${colorMode ? 'text-gray-300' : 'text-gray-500'}`}>{mockUser.email}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Full Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
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
        <div>
          <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Company</label>
          <input
            type="text"
            value={company}
            onChange={e => setCompany(e.target.value)}
            className={`w-full p-2 rounded border focus:ring-1 focus:ring-blue-400 transition-all text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
          />
        </div>
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
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all duration-200 ${!colorMode ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              ☀️ Light
            </button>
            <button
              type="button"
              onClick={() => setColorMode && setColorMode(true)}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all duration-200 ${colorMode ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
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
            <div className={`w-9 h-5 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${emailNotifications ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
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
            <div className={`w-9 h-5 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${smsNotifications ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
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
            <div className={`w-9 h-5 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${projectUpdates ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
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
            <div className={`w-9 h-5 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${taskReminders ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
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
            <div className={`w-9 h-5 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${systemAlerts ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
          </label>
        </div>
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between p-2 rounded border border-gray-200">
          <div>
            <div className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Two-Factor Authentication</div>
            <div className={`text-xs ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Add an extra layer of security</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={twoFactorAuth}
              onChange={e => setTwoFactorAuth(e.target.checked)}
              className="sr-only peer"
            />
            <div className={`w-9 h-5 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${twoFactorAuth ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
          </label>
        </div>

        <div>
          <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Session Timeout (minutes)</label>
          <select
            value={sessionTimeout}
            onChange={e => setSessionTimeout(Number(e.target.value))}
            className={`w-full p-2 rounded border focus:ring-1 focus:ring-blue-400 transition-all text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
          >
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={60}>1 hour</option>
            <option value={120}>2 hours</option>
          </select>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-3">
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
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
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
                  ? 'bg-green-600 text-white hover:bg-green-700'
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
                            ? 'bg-green-600 text-white hover:bg-green-700'
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
          Import your project data with customer information, addresses, budgets, and more.
        </p>
        <div className={`text-xs space-y-1 ${
          colorMode ? 'text-blue-200' : 'text-blue-600'
        }`}>
          <p><strong>Required Columns:</strong> customerName, projectAddress</p>
          <p><strong>Optional Columns:</strong> projectNumber, customerEmail, customerPhone, city, state, zipCode, projectType, projectValue, notes</p>
        </div>
      </div>

      {/* Workflow Template Selection */}
      <div className={`border rounded-lg p-4 ${
        colorMode 
          ? 'bg-purple-900/20 border-purple-500/40' 
          : 'bg-purple-50 border-purple-200'
      }`}>
        <h3 className={`font-medium mb-2 ${
          colorMode ? 'text-purple-300' : 'text-purple-900'
        }`}>🔧 Workflow Template</h3>
        <p className={`text-sm mb-3 ${
          colorMode ? 'text-purple-200' : 'text-purple-700'
        }`}>
          Select the workflow template to assign to imported projects
        </p>
        <select
          value={selectedWorkflowTemplate}
          onChange={(e) => setSelectedWorkflowTemplate(e.target.value)}
          className={`w-full p-2 rounded border text-sm ${
            colorMode 
              ? 'bg-[#232b4d] border-gray-600 text-white' 
              : 'bg-white border-gray-300 text-gray-800'
          }`}
        >
          <option value="">Select a workflow template...</option>
          {workflowTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name} ({template.phases?.join(', ') || 'All Phases'})
            </option>
          ))}
        </select>
      </div>

      {/* Download Template */}
      <div className={`border rounded-lg p-4 ${
        colorMode 
          ? 'bg-green-900/20 border-green-500/40' 
          : 'bg-green-50 border-green-200'
      }`}>
        <h3 className={`font-medium mb-2 ${
          colorMode ? 'text-green-300' : 'text-green-900'
        }`}>📄 Download Template</h3>
        <p className={`text-sm mb-3 ${
          colorMode ? 'text-green-200' : 'text-green-700'
        }`}>
          Use our template to ensure your project data is formatted correctly
        </p>
        <button
          onClick={downloadSampleFile}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
        >
          📋 Download CSV Template
        </button>
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
                    : 'bg-blue-600 text-white hover:bg-blue-700'
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
              <span className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
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
                    <strong>Row {failed.row}:</strong> {failed.error}
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
          ? 'bg-yellow-900/20 border-yellow-500/40' 
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <h3 className={`font-medium mb-2 ${
          colorMode ? 'text-yellow-300' : 'text-yellow-900'
        }`}>💡 Example Project Data</h3>
        <div className="overflow-x-auto">
          <table className={`min-w-full text-xs border-collapse ${
            colorMode ? 'border-gray-600' : 'border-gray-300'
          }`}>
            <thead>
              <tr className={colorMode ? 'bg-yellow-900/40' : 'bg-yellow-100'}>
                <th className={`px-2 py-1 text-left border ${
                  colorMode ? 'border-gray-600 text-yellow-200' : 'border-gray-300 text-yellow-900'
                }`}>customerName</th>
                <th className={`px-2 py-1 text-left border ${
                  colorMode ? 'border-gray-600 text-yellow-200' : 'border-gray-300 text-yellow-900'
                }`}>projectAddress</th>
                <th className={`px-2 py-1 text-left border ${
                  colorMode ? 'border-gray-600 text-yellow-200' : 'border-gray-300 text-yellow-900'
                }`}>customerPhone</th>
                <th className={`px-2 py-1 text-left border ${
                  colorMode ? 'border-gray-600 text-yellow-200' : 'border-gray-300 text-yellow-900'
                }`}>projectValue</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={`px-2 py-1 border ${
                  colorMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-800'
                }`}>John Smith</td>
                <td className={`px-2 py-1 border ${
                  colorMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-800'
                }`}>123 Main St, Dallas TX</td>
                <td className={`px-2 py-1 border ${
                  colorMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-800'
                }`}>(555) 123-4567</td>
                <td className={`px-2 py-1 border ${
                  colorMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-800'
                }`}>15000</td>
              </tr>
              <tr>
                <td className={`px-2 py-1 border ${
                  colorMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-800'
                }`}>Jane Doe</td>
                <td className={`px-2 py-1 border ${
                  colorMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-800'
                }`}>456 Oak Ave, Dallas TX</td>
                <td className={`px-2 py-1 border ${
                  colorMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-800'
                }`}>(555) 987-6543</td>
                <td className={`px-2 py-1 border ${
                  colorMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-800'
                }`}>3500</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
      case 'preferences':
        return renderPreferencesTab();
      case 'notifications':
        return renderNotificationsTab();
      case 'security':
        return renderSecurityTab();
      case 'company':
        return renderCompanyTab();
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
          <div className="flex border-b border-gray-200">
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
              
              <div className="flex justify-end pt-3 border-t border-gray-200 mt-4">
                <button
                  type="submit"
                  className="bg-blue-600 text-white font-semibold py-2 px-4 rounded text-sm hover:bg-blue-700 transition-colors duration-200 shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>

            {success && (
              <div className={`fixed top-4 right-4 p-3 rounded shadow-sm z-50 ${colorMode ? 'bg-green-800 text-white' : 'bg-green-100 text-green-800'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm">✅</span>
                  <span className="font-semibold text-sm">{successMessage}</span>
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