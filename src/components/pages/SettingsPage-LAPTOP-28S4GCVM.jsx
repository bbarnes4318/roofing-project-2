import React, { useState, useEffect } from 'react';
import { formatPhoneNumber } from '../../utils/helpers';
import { authService } from '../../services/api';

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

  // Workflow Assignment settings
  const [userAssignment, setUserAssignment] = useState('Office');
  const [showAssignmentDetails, setShowAssignmentDetails] = useState(false);

  // Admin management settings
  const [editingUser, setEditingUser] = useState(null);
  const [savingUser, setSavingUser] = useState(null);
  const [userAssignments, setUserAssignments] = useState(() => {
    // Mock user data for demonstration - in real app this would come from API
    const mockUsers = [
      { id: 1, name: 'Sarah Owner', email: 'sarah@company.com', currentRole: 'Office', avatar: 'SO' },
      { id: 2, name: 'John Manager', email: 'john@company.com', currentRole: 'Project Manager', avatar: 'JM' },
      { id: 3, name: 'Lisa Admin', email: 'lisa@company.com', currentRole: 'Admin', avatar: 'LA' },
      { id: 4, name: 'Mike Crew', email: 'mike@company.com', currentRole: 'Field Crew', avatar: 'MC' },
      { id: 5, name: 'Tom Supervisor', email: 'tom@company.com', currentRole: 'Roof Supervisor', avatar: 'TS' },
      { id: 6, name: 'Alex Director', email: 'alex@company.com', currentRole: 'Field Director', avatar: 'AD' }
    ];
    
    return mockUsers.reduce((acc, user) => {
      acc[user.id] = user.currentRole;
      return acc;
    }, {});
  });

  // Initialize userAssignments when component mounts
  useEffect(() => {
    const mockUsers = [
      { id: 1, name: 'Sarah Owner', email: 'sarah@company.com', currentRole: 'Office', avatar: 'SO' },
      { id: 2, name: 'John Manager', email: 'john@company.com', currentRole: 'Project Manager', avatar: 'JM' },
      { id: 3, name: 'Lisa Admin', email: 'lisa@company.com', currentRole: 'Admin', avatar: 'LA' },
      { id: 4, name: 'Mike Crew', email: 'mike@company.com', currentRole: 'Field Crew', avatar: 'MC' },
      { id: 5, name: 'Tom Supervisor', email: 'tom@company.com', currentRole: 'Roof Supervisor', avatar: 'TS' },
      { id: 6, name: 'Alex Director', email: 'alex@company.com', currentRole: 'Field Director', avatar: 'AD' }
    ];
    
    const initialAssignments = mockUsers.reduce((acc, user) => {
      acc[user.id] = user.currentRole;
      return acc;
    }, {});
    
    setUserAssignments(initialAssignments);
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    setSuccessMessage('Settings saved successfully!');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleWorkflowAssignmentSave = async () => {
    try {
      // Convert user-friendly assignment to database format
      const assignmentMap = {
        'Office': 'OFFICE',
        'Admin': 'ADMIN', 
        'Project Manager': 'PROJECT_MANAGER',
        'Field Crew': 'FIELD_CREW',
        'Roof Supervisor': 'ROOF_SUPERVISOR',
        'Field Director': 'FIELD_DIRECTOR'
      };
      
      const dbAssignment = assignmentMap[userAssignment] || 'OFFICE';
      
      await authService.updateWorkflowAssignment(dbAssignment);
      setSuccessMessage('Workflow assignment updated successfully!');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating workflow assignment:', error);
      setSuccessMessage('Error updating workflow assignment. Please try again.');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'company', label: 'Company', icon: '🏢' },
    { id: 'workflow', label: 'Workflow Assignment', icon: '📋' },
    { id: 'workflow-admin', label: 'User Management', icon: '👥' }
  ];

  // Workflow structure based on project-workflow.csv
  const workflowStructure = {
    'Lead': [
      { stepName: 'Input Customer Information', section: 'Input Customer Information', lineItem: 'Make sure the name is spelled correctly', user: 'Office' },
      { stepName: 'Input Customer Information', section: 'Input Customer Information', lineItem: 'Make sure the email is correct. Send a confirmation email to confirm email.', user: 'Office' },
      { stepName: 'Complete Questions to Ask Checklist', section: 'Complete Questions to Ask Checklist', lineItem: 'Input answers from Question Checklist into notes', user: 'Office' },
      { stepName: 'Complete Questions to Ask Checklist', section: 'Complete Questions to Ask Checklist', lineItem: 'Record property details', user: 'Office' },
      { stepName: 'Input Lead Property Information', section: 'Input Lead Property Information', lineItem: 'Add Home View photos – Maps', user: 'Office' },
      { stepName: 'Input Lead Property Information', section: 'Input Lead Property Information', lineItem: 'Add Street View photos – Google Maps', user: 'Office' },
      { stepName: 'Input Lead Property Information', section: 'Input Lead Property Information', lineItem: 'Add elevation screenshot – PPRBD', user: 'Office' },
      { stepName: 'Input Lead Property Information', section: 'Input Lead Property Information', lineItem: 'Add property age – County Assessor Website', user: 'Office' },
      { stepName: 'Input Lead Property Information', section: 'Input Lead Property Information', lineItem: 'Evaluate ladder requirements – By looking at the room', user: 'Office' },
      { stepName: 'Assign A Project Manager', section: 'Assign A Project Manager', lineItem: 'Use workflow from Lead Assigning Flowchart', user: 'Office' },
      { stepName: 'Assign A Project Manager', section: 'Assign A Project Manager', lineItem: 'Select and brief the Project Manager', user: 'Office' },
      { stepName: 'Schedule Initial Inspection', section: 'Schedule Initial Inspection', lineItem: 'Call Customer and coordinate with PM schedule', user: 'Office' },
      { stepName: 'Schedule Initial Inspection', section: 'Schedule Initial Inspection', lineItem: 'Create Calendar Appointment in AL', user: 'Office' }
    ],
    'Prospect': [
      { stepName: 'Site Inspection', section: 'Site Inspection', lineItem: 'Take site photos', user: 'Project Manager' },
      { stepName: 'Site Inspection', section: 'Site Inspection', lineItem: 'Complete inspection form', user: 'Project Manager' },
      { stepName: 'Site Inspection', section: 'Site Inspection', lineItem: 'Document material colors', user: 'Project Manager' },
      { stepName: 'Site Inspection', section: 'Site Inspection', lineItem: 'Capture Hover photos', user: 'Project Manager' },
      { stepName: 'Site Inspection', section: 'Site Inspection', lineItem: 'Present upgrade options', user: 'Project Manager' },
      { stepName: 'Write Estimate', section: 'Write Estimate', lineItem: 'Fill out Estimate Form', user: 'Project Manager' },
      { stepName: 'Write Estimate', section: 'Write Estimate', lineItem: 'Write initial estimate – AccuLynx', user: 'Project Manager' },
      { stepName: 'Write Estimate', section: 'Write Estimate', lineItem: 'Write Customer Pay Estimates', user: 'Project Manager' },
      { stepName: 'Write Estimate', section: 'Write Estimate', lineItem: 'Send for Approval', user: 'Project Manager' },
      { stepName: 'Insurance Process', section: 'Insurance Process', lineItem: 'Compare field vs insurance estimates', user: 'Administration' },
      { stepName: 'Insurance Process', section: 'Insurance Process', lineItem: 'Identify supplemental items', user: 'Administration' },
      { stepName: 'Insurance Process', section: 'Insurance Process', lineItem: 'Draft estimate in Xactimate', user: 'Administration' },
      { stepName: 'Agreement Preparation', section: 'Agreement Preparation', lineItem: 'Trade cost analysis', user: 'Administration' },
      { stepName: 'Agreement Preparation', section: 'Agreement Preparation', lineItem: 'Prepare Estimate Forms', user: 'Administration' },
      { stepName: 'Agreement Preparation', section: 'Agreement Preparation', lineItem: 'Match AL estimates', user: 'Administration' },
      { stepName: 'Agreement Preparation', section: 'Agreement Preparation', lineItem: 'Calculate customer pay items', user: 'Administration' },
      { stepName: 'Agreement Preparation', section: 'Agreement Preparation', lineItem: 'Send shingle/class4 email – PDF', user: 'Administration' },
      { stepName: 'Agreement Signing', section: 'Agreement Signing', lineItem: 'Review and send signature request', user: 'Administration' },
      { stepName: 'Agreement Signing', section: 'Agreement Signing', lineItem: 'Record in QuickBooks', user: 'Administration' },
      { stepName: 'Agreement Signing', section: 'Agreement Signing', lineItem: 'Process deposit', user: 'Administration' },
      { stepName: 'Agreement Signing', section: 'Agreement Signing', lineItem: 'Collect signed disclaimers', user: 'Administration' }
    ],
    'Prospect: Non-Insurance': [
      { stepName: 'Write Estimate', section: 'Write Estimate', lineItem: 'Fill out Estimate Forms', user: 'Project Manager' },
      { stepName: 'Write Estimate', section: 'Write Estimate', lineItem: 'Write initial estimate in AL and send customer for approval', user: 'Project Manager' },
      { stepName: 'Write Estimate', section: 'Write Estimate', lineItem: 'Follow up with customer for approval', user: 'Project Manager' },
      { stepName: 'Write Estimate', section: 'Write Estimate', lineItem: 'Let Office know the agreement is ready to sign', user: 'Project Manager' },
      { stepName: 'Agreement Signing', section: 'Agreement Signing', lineItem: 'Review agreement with customer and send a signature request', user: 'Administration' },
      { stepName: 'Agreement Signing', section: 'Agreement Signing', lineItem: 'Record in QuickBooks', user: 'Administration' },
      { stepName: 'Agreement Signing', section: 'Agreement Signing', lineItem: 'Process deposit', user: 'Administration' },
      { stepName: 'Agreement Signing', section: 'Agreement Signing', lineItem: 'Send and collect signatures for any applicable disclaimers', user: 'Administration' }
    ],
    'Approved': [
      { stepName: 'Administrative Setup', section: 'Administrative Setup', lineItem: 'Confirm shingle choice', user: 'Administration' },
      { stepName: 'Administrative Setup', section: 'Administrative Setup', lineItem: 'Order materials', user: 'Administration' },
      { stepName: 'Administrative Setup', section: 'Administrative Setup', lineItem: 'Create labor orders', user: 'Administration' },
      { stepName: 'Administrative Setup', section: 'Administrative Setup', lineItem: 'Send labor order to roofing crew', user: 'Administration' },
      { stepName: 'Pre Job Actions', section: 'Pre Job Actions', lineItem: 'Pull permits', user: 'Office' },
      { stepName: 'Prepare for Production', section: 'Prepare for Production', lineItem: 'All pictures in Job (Gutter, Ventilation, Elevation)', user: 'Administration' },
      { stepName: 'Verify Labor Order in Scheduler', section: 'Verify Labor Order in Scheduler', lineItem: 'Correct Dates', user: 'Administration' },
      { stepName: 'Verify Labor Order in Scheduler', section: 'Verify Labor Order in Scheduler', lineItem: 'Correct crew', user: 'Administration' },
      { stepName: 'Verify Labor Order in Scheduler', section: 'Verify Labor Order in Scheduler', lineItem: 'Send install schedule email to customer', user: 'Administration' },
      { stepName: 'Verify Material Orders', section: 'Verify Material Orders', lineItem: 'Confirmations from supplier', user: 'Administration' },
      { stepName: 'Verify Material Orders', section: 'Verify Material Orders', lineItem: 'Call if no confirmation', user: 'Administration' },
      { stepName: 'Verify Material Orders', section: 'Verify Material Orders', lineItem: 'Provide special crew instructions', user: 'Administration' },
      { stepName: 'Subcontractor Work', section: 'Subcontractor Work', lineItem: 'Work order in scheduler', user: 'Administration' },
      { stepName: 'Subcontractor Work', section: 'Subcontractor Work', lineItem: 'Schedule subcontractor', user: 'Administration' },
      { stepName: 'Subcontractor Work', section: 'Subcontractor Work', lineItem: 'Communicate with customer', user: 'Administration' }
    ],
    'Execution': [
      { stepName: 'Installation', section: 'Installation', lineItem: 'Document work start', user: 'Field Director' },
      { stepName: 'Installation', section: 'Installation', lineItem: 'Capture progress photos', user: 'Field Director' },
      { stepName: 'Installation', section: 'Installation', lineItem: 'Upload Pictures', user: 'Field Director' },
      { stepName: 'Daily Job Progress Note', section: 'Daily Job Progress Note', lineItem: 'Work started/finished', user: 'Field Director' },
      { stepName: 'Daily Job Progress Note', section: 'Daily Job Progress Note', lineItem: 'Days and people needed', user: 'Field Director' },
      { stepName: 'Daily Job Progress Note', section: 'Daily Job Progress Note', lineItem: 'Format: 2 Guys for 4 hours', user: 'Field Director' },
      { stepName: 'Quality Check', section: 'Quality Check', lineItem: 'Completion photos', user: 'Roof Supervisor' },
      { stepName: 'Quality Check', section: 'Quality Check', lineItem: 'Complete inspection', user: 'Roof Supervisor' },
      { stepName: 'Quality Check', section: 'Quality Check', lineItem: 'Upload Roof Packet', user: 'Administration' },
      { stepName: 'Quality Check', section: 'Quality Check', lineItem: 'Verify Packet is complete – Admin', user: 'Administration' },
      { stepName: 'Multiple Trades', section: 'Multiple Trades', lineItem: 'Confirm start date', user: 'Administration' },
      { stepName: 'Multiple Trades', section: 'Multiple Trades', lineItem: 'Confirm material/labor for all trades', user: 'Administration' },
      { stepName: 'Subcontractor Work', section: 'Subcontractor Work', lineItem: 'Confirm dates', user: 'Administration' },
      { stepName: 'Subcontractor Work', section: 'Subcontractor Work', lineItem: 'Communicate with customer', user: 'Administration' },
      { stepName: 'Update Customer', section: 'Update Customer', lineItem: 'Notify of completion', user: 'Administration' },
      { stepName: 'Update Customer', section: 'Update Customer', lineItem: 'Share photos', user: 'Administration' },
      { stepName: 'Update Customer', section: 'Update Customer', lineItem: 'Send 2nd half payment link', user: 'Administration' }
    ],
    '2nd Supp': [
      { stepName: 'Create Supp in Xactimate', section: 'Create Supp in Xactimate', lineItem: 'Check Roof Packet & Checklist', user: 'Administration' },
      { stepName: 'Create Supp in Xactimate', section: 'Create Supp in Xactimate', lineItem: 'Label photos', user: 'Administration' },
      { stepName: 'Create Supp in Xactimate', section: 'Create Supp in Xactimate', lineItem: 'Add to Xactimate', user: 'Administration' },
      { stepName: 'Create Supp in Xactimate', section: 'Create Supp in Xactimate', lineItem: 'Submit to insurance', user: 'Administration' },
      { stepName: 'Follow Up Calls', section: 'Follow Up Calls', lineItem: 'Call 2x/week until updated estimate', user: 'Administration' },
      { stepName: 'Review Approved Supp', section: 'Review Approved Supp', lineItem: 'Update trade cost', user: 'Administration' },
      { stepName: 'Review Approved Supp', section: 'Review Approved Supp', lineItem: 'Prepare counter-supp or email', user: 'Administration' },
      { stepName: 'Review Approved Supp', section: 'Review Approved Supp', lineItem: 'Add to AL Estimate', user: 'Administration' },
      { stepName: 'Customer Update', section: 'Customer Update', lineItem: 'Share 2 items minimum', user: 'Administration' },
      { stepName: 'Customer Update', section: 'Customer Update', lineItem: 'Let them know next steps', user: 'Administration' }
    ],
    'Completion': [
      { stepName: 'Financial Processing', section: 'Financial Processing', lineItem: 'Verify worksheet', user: 'Administration' },
      { stepName: 'Financial Processing', section: 'Financial Processing', lineItem: 'Final invoice & payment link', user: 'Administration' },
      { stepName: 'Financial Processing', section: 'Financial Processing', lineItem: 'AR follow-up calls', user: 'Administration' },
      { stepName: 'Project Closeout', section: 'Project Closeout', lineItem: 'Register warranty', user: 'Office' },
      { stepName: 'Project Closeout', section: 'Project Closeout', lineItem: 'Send documentation', user: 'Office' },
      { stepName: 'Project Closeout', section: 'Project Closeout', lineItem: 'Submit insurance paperwork', user: 'Office' },
      { stepName: 'Project Closeout', section: 'Project Closeout', lineItem: 'Send final receipt and close job', user: 'Office' }
    ]
  };

  // Get all line items for the selected user assignment
  const getUserLineItems = (userType) => {
    const allLineItems = [];
    Object.entries(workflowStructure).forEach(([phase, items]) => {
      items.forEach(item => {
        if (item.user === userType) {
          allLineItems.push({
            ...item,
            phase
          });
        }
      });
    });
    return allLineItems;
  };

  const userAssignmentOptions = [
    { value: 'Office', label: 'Office', description: 'Handle customer information, scheduling, and administrative tasks' },
    { value: 'Administration', label: 'Admin', description: 'Manage estimates, agreements, and financial processing' },
    { value: 'Project Manager', label: 'Project Manager', description: 'Lead site inspections, estimates, and customer coordination' },
    { value: 'Field Crew', label: 'Field Crew', description: 'Execute installation and field work' },
    { value: 'Roof Supervisor', label: 'Roof Supervisor', description: 'Oversee quality checks and completion inspections' },
    { value: 'Field Director', label: 'Field Director', description: 'Manage field operations and progress documentation' }
  ];

  const handleUserRoleChange = (userId, newRole) => {
    setUserAssignments(prev => ({
      ...prev,
      [userId]: newRole
    }));
  };

  const handleSaveUserRole = async (userId) => {
    try {
      setSavingUser(userId);
      
      const newRole = userAssignments[userId];
      
      // Convert user-friendly role to database format
      const assignmentMap = {
        'Office': 'OFFICE',
        'Admin': 'ADMIN', 
        'Project Manager': 'PROJECT_MANAGER',
        'Field Crew': 'FIELD_CREW',
        'Roof Supervisor': 'ROOF_SUPERVISOR',
        'Field Director': 'FIELD_DIRECTOR'
      };
      
      const dbRole = assignmentMap[newRole] || 'OFFICE';
      
      // Call the API to update the other user's role
      await authService.updateOtherUserWorkflowAssignment(userId, dbRole);
      
      setEditingUser(null);
      setSuccessMessage('User role updated successfully!');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating user role:', error);
      setSuccessMessage('Error updating user role. Please try again.');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setSavingUser(null);
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      'Office': 'bg-blue-100 text-blue-800',
      'Admin': 'bg-purple-100 text-purple-800',
      'Project Manager': 'bg-green-100 text-green-800',
      'Field Crew': 'bg-orange-100 text-orange-800',
      'Roof Supervisor': 'bg-red-100 text-red-800',
      'Field Director': 'bg-indigo-100 text-indigo-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const renderProfileTab = () => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${colorMode ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'}`}>
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
            className={`w-full p-1.5 rounded border focus:ring-1 focus:ring-blue-400 transition-all text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
          />
        </div>
        <div>
          <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={`w-full p-1.5 rounded border focus:ring-1 focus:ring-blue-400 transition-all text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
          />
        </div>
        <div>
          <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className={`w-full p-1.5 rounded border focus:ring-1 focus:ring-blue-400 transition-all text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
          />
        </div>
        <div>
          <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Company</label>
          <input
            type="text"
            value={company}
            onChange={e => setCompany(e.target.value)}
            className={`w-full p-1.5 rounded border focus:ring-1 focus:ring-blue-400 transition-all text-sm ${colorMode ? 'bg-[#181f3a] border-[#3b82f6] text-white' : 'border-gray-300 bg-white'}`}
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
      <div className="space-y-2">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between p-1.5 rounded border border-gray-200">
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

        <div className="flex items-center justify-between p-1.5 rounded border border-gray-200">
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

        <div className="flex items-center justify-between p-1.5 rounded border border-gray-200">
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

        <div className="flex items-center justify-between p-1.5 rounded border border-gray-200">
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

        <div className="flex items-center justify-between p-1.5 rounded border border-gray-200">
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

  const renderWorkflowAssignmentTab = () => (
    <div className="space-y-2">
      {/* Compact Role Assignment Section */}
      <div className={`p-2 rounded-lg border ${colorMode ? 'bg-[#1e293b] border-[#3b82f6]/30' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className={`text-sm font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
              📋 Your Workflow Role
            </h3>
            <p className={`text-xs mt-1 ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Choose your primary role to see relevant alerts and tasks
            </p>
          </div>
          <button
            onClick={handleWorkflowAssignmentSave}
            className="bg-blue-600 text-white text-xs font-semibold py-1 px-2 rounded hover:bg-blue-700 transition-colors"
          >
            Save Role
          </button>
        </div>

        {/* Role Selection Grid */}
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          {userAssignmentOptions.map((option) => (
            <div 
              key={option.value}
              className={`p-1.5 rounded-lg border transition-all duration-200 cursor-pointer ${
                userAssignment === option.value 
                  ? colorMode 
                    ? 'bg-blue-600 border-blue-500' 
                    : 'bg-blue-50 border-blue-300'
                  : colorMode 
                    ? 'bg-[#0f172a] border-[#3b82f6]/20 hover:border-[#3b82f6]/40' 
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setUserAssignment(option.value)}
            >
              <div className="flex items-center gap-1.5">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold ${
                  colorMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                }`}>
                  {option.label.charAt(0)}
                </div>
                <div>
                  <div className={`text-xs font-semibold ${
                    userAssignment === option.value 
                      ? colorMode ? 'text-white' : 'text-blue-800'
                      : colorMode ? 'text-white' : 'text-gray-800'
                  }`}>
                    {option.label}
                  </div>
                  <div className={`text-xs ${
                    userAssignment === option.value 
                      ? colorMode ? 'text-blue-100' : 'text-blue-600'
                      : colorMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {option.description}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Enhanced Task Preview */}
        <div className={`p-1.5 rounded-lg ${colorMode ? 'bg-[#0f172a] border border-[#3b82f6]/20' : 'bg-blue-50 border border-blue-200'}`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
              Your Assigned Tasks ({getUserLineItems(userAssignment).length})
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showAssignmentDetails}
                onChange={e => setShowAssignmentDetails(e.target.checked)}
                className="sr-only peer"
              />
              <div className={`w-6 h-3 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-2 after:w-2 after:transition-all ${showAssignmentDetails ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            </label>
          </div>
          
          {showAssignmentDetails && (
            <div className="grid grid-cols-1 gap-1">
              {getUserLineItems(userAssignment).map((item, index) => (
                <div key={index} className={`text-xs p-1 rounded border-l-2 ${
                  colorMode ? 'bg-[#1e293b] text-gray-300 border-l-blue-500' : 'bg-white text-gray-600 border-l-blue-400'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.stepName}</div>
                      <div className="text-xs opacity-75 truncate">{item.lineItem}</div>
                    </div>
                    <div className={`ml-1 px-1 py-0.5 rounded text-xs font-semibold ${
                      colorMode ? 'bg-[#3b82f6]/20 text-blue-300' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {item.phase}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderWorkflowAdminTab = () => {
    // Mock user data for demonstration - in real app this would come from API
    const mockUsers = [
      { id: 'user-1', name: 'Sarah Owner', email: 'sarah@company.com', currentRole: 'Office', avatar: 'SO' },
      { id: 'user-2', name: 'John Manager', email: 'john@company.com', currentRole: 'Project Manager', avatar: 'JM' },
      { id: 'user-3', name: 'Lisa Admin', email: 'lisa@company.com', currentRole: 'Admin', avatar: 'LA' },
      { id: 'user-4', name: 'Mike Crew', email: 'mike@company.com', currentRole: 'Field Crew', avatar: 'MC' },
      { id: 'user-5', name: 'Tom Supervisor', email: 'tom@company.com', currentRole: 'Roof Supervisor', avatar: 'TS' },
      { id: 'user-6', name: 'Alex Director', email: 'alex@company.com', currentRole: 'Field Director', avatar: 'AD' }
    ];

    return (
      <div className="space-y-1">
        {/* Role Distribution Summary - Moved to top */}
        <div className={`p-1 rounded-lg border ${colorMode ? 'bg-[#1e293b] border-[#3b82f6]/30' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <span className="text-sm">📊</span>
              <span className={`text-xs font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                Role Distribution
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-0.5">
            {userAssignmentOptions.map((role) => {
              const count = Object.values(userAssignments).filter(assignment => assignment === role.value).length;
              return (
                <div key={role.value} className={`p-0.5 rounded text-center ${
                  colorMode ? 'bg-[#0f172a]' : 'bg-gray-50'
                }`}>
                  <div className={`text-sm font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                    {count}
                  </div>
                  <div className={`text-xs ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {role.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Header */}
        <div className={`p-1 rounded-lg border ${colorMode ? 'bg-[#1e293b] border-[#3b82f6]/30' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-sm">👥</span>
              <div>
                <div className={`text-xs font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                  User Workflow Management
                </div>
                <div className={`text-xs ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Manage role assignments
                </div>
              </div>
            </div>
            <div className={`px-1 py-0.5 rounded text-xs font-semibold ${colorMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'}`}>
              {mockUsers.length} Users
            </div>
          </div>
        </div>

        {/* Compact User List */}
        <div className={`p-1 rounded-lg border ${colorMode ? 'bg-[#1e293b] border-[#3b82f6]/30' : 'bg-white border-gray-200'}`}>
          <div className="space-y-0.5">
            {mockUsers.map((user) => (
              <div key={user.id} className={`p-0.5 rounded border transition-all duration-200 ${
                colorMode ? 'bg-[#0f172a] border-[#3b82f6]/20' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <div className={`w-3 h-3 rounded-full flex items-center justify-center text-xs font-bold ${
                      colorMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                    }`}>
                      {user.avatar}
                    </div>
                    <div>
                      <div className={`text-xs font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                        {user.name}
                      </div>
                      <div className={`text-xs ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {user.email}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-0.5">
                    {editingUser === user.id ? (
                      <div className="flex items-center gap-0.5">
                        <select
                          value={userAssignments[user.id]}
                          onChange={(e) => handleUserRoleChange(user.id, e.target.value)}
                          className={`text-xs px-0.5 py-0.5 rounded border ${
                            colorMode ? 'bg-[#1e293b] border-[#3b82f6] text-white' : 'bg-white border-gray-300'
                          }`}
                        >
                          {userAssignmentOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleSaveUserRole(user.id)}
                          disabled={savingUser === user.id}
                          className={`text-xs px-0.5 py-0.5 rounded ${
                            savingUser === user.id
                              ? 'bg-gray-400 text-white cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {savingUser === user.id ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => setEditingUser(null)}
                          className="text-xs px-0.5 py-0.5 rounded bg-gray-500 text-white hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-0.5">
                        <span className={`px-0.5 py-0.5 rounded text-xs font-semibold ${getRoleColor(userAssignments[user.id])}`}>
                          {userAssignments[user.id]}
                        </span>
                        <button
                          onClick={() => setEditingUser(user.id)}
                          className={`text-xs px-0.5 py-0.5 rounded ${
                            colorMode ? 'bg-[#3b82f6] text-white hover:bg-[#2563eb]' : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

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
      case 'workflow':
        return renderWorkflowAssignmentTab();
      case 'workflow-admin':
        return renderWorkflowAdminTab();
      default:
        return renderProfileTab();
    }
  };

  return (
    <div className={`${colorMode ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto p-2">
        <div className={`rounded-lg shadow-sm border ${colorMode ? 'bg-[#232b4d]/80 border-[#3b82f6]/40' : 'bg-white border-gray-200'}`}>
          {/* Ultra Compact Tab Navigation */}
          <div className="flex border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 px-2 py-1.5 text-xs font-semibold transition-all duration-200 ${
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
          <div className="p-3">
            <form onSubmit={handleSave}>
              {renderTabContent()}
            </form>

            {success && (
              <div className={`fixed top-4 right-4 p-3 rounded shadow-sm z-50 ${colorMode ? 'bg-green-800 text-white' : 'bg-green-100 text-green-800'}`}>
                {successMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage; 