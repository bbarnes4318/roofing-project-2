import React, { useState, useEffect } from 'react';
import api, { API_BASE_URL } from '../../services/api';

const AddProjectModal = ({ isOpen, onClose, onProjectCreated }) => {
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerTypeOfContact: 'PRIMARY_CONTACT',
    secondaryName: '',
    secondaryEmail: '',
    secondaryPhone: '',
    secondaryTypeOfContact: 'SECONDARY_CONTACT',
    primaryContact: 'PRIMARY', // PRIMARY or SECONDARY
    address: '',
    projectTypes: [], // Multiple trade types
    description: '',
    startingPhase: 'LEAD', // Starting phase selection
    projectManagerId: '', // Project manager assignment
    leadSourceId: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [projectManagers, setProjectManagers] = useState([]);
  const [showSecondaryCustomer, setShowSecondaryCustomer] = useState(false);
  const [showSecondHousehold, setShowSecondHousehold] = useState(false);
  const [leadSources, setLeadSources] = useState([]);
  const [leadSourcesLoading, setLeadSourcesLoading] = useState(true);

  // Available trade types with icons
  const TRADE_TYPES = [
    { value: 'ROOFING', label: 'Roofing', icon: '🏠', description: 'Roof installation and repair' },
    { value: 'GUTTERS', label: 'Gutters', icon: '🌧️', description: 'Gutter installation and maintenance' },
    { value: 'INTERIOR_PAINT', label: 'Interior Paint', icon: '🎨', description: 'Interior painting services' },
    { value: 'FENCE', label: 'Fence', icon: '🔲', description: 'Fence installation and repair' },
    { value: 'WATER_LEAK', label: 'Water Leak', icon: '💧', description: 'Water leak detection and repair' },
    { value: 'MOLD', label: 'Mold', icon: '🦠', description: 'Mold remediation and prevention' },
    { value: 'WINDOWS', label: 'Windows', icon: '🪟', description: 'Window installation and replacement' },
    { value: 'SIDING', label: 'Siding', icon: '🏘️', description: 'Siding installation and repair' },
    { value: 'REPAIR_EXTERIOR', label: 'Repair - Exterior', icon: '🔧', description: 'Exterior repairs and maintenance' },
    { value: 'REPAIR_INTERIOR', label: 'Repair - Interior', icon: '🛠️', description: 'Interior repairs and maintenance' }
  ];

  // Available phases for starting phase selection
  const WORKFLOW_PHASES = [
    { value: 'LEAD', label: 'Lead', description: 'Initial lead capture and qualification', icon: '📋' },
    { value: 'PROSPECT', label: 'Prospect', description: 'Prospect development and estimation', icon: '🔍' },
    { value: 'APPROVED', label: 'Approved', description: 'Approved projects ready for execution', icon: '✅' },
    { value: 'EXECUTION', label: 'Execution', description: 'Active project execution', icon: '🚧' },
    { value: 'SECOND_SUPPLEMENT', label: '2nd Supplement', description: 'Supplemental estimates and approvals', icon: '📝' },
    { value: 'COMPLETION', label: 'Completion', description: 'Financial processing and project closeout', icon: '🎉' }
  ];

  const STEPS = [
    { id: 1, title: 'Customer Information', description: 'Primary and secondary customer details' },
    { id: 2, title: 'Project Details', description: 'Project type and configuration' },
    { id: 3, title: 'Review & Create', description: 'Final review and submission' }
  ];

  // Fetch users for project manager assignment and handle form reset
  useEffect(() => {
    const fetchUsersAndRoles = async () => {
      try {
        const { usersService } = await import('../../services/api');
        const result = await usersService.getTeamMembers();
        const teamMembers = Array.isArray(result?.data?.teamMembers) ? result.data.teamMembers : [];
        setUsers(teamMembers);

        // Fetch role assignments to get Project Managers
        try {
          const token = localStorage.getItem('authToken') || localStorage.getItem('token');
          const rolesResponse = await fetch(`${API_BASE_URL}/roles`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` })
            }
          });

          if (rolesResponse.ok) {
            const rolesData = await rolesResponse.json();
            if (rolesData.success && rolesData.data) {
              // Extract project managers from role assignments
              const projectManagerUsers = [];
              
              // Handle both old single-user format and new multi-user format
              if (rolesData.data.projectManager) {
                if (Array.isArray(rolesData.data.projectManager)) {
                  projectManagerUsers.push(...rolesData.data.projectManager);
                } else if (rolesData.data.projectManager.userId) {
                  // Find user by ID
                  const manager = teamMembers.find(u => u.id === rolesData.data.projectManager.userId);
                  if (manager) projectManagerUsers.push(manager);
                }
              }
              
              // Also check productManager for backwards compatibility
              if (rolesData.data.productManager && rolesData.data.productManager.userId) {
                const manager = teamMembers.find(u => u.id === rolesData.data.productManager.userId);
                if (manager && !projectManagerUsers.find(pm => pm.id === manager.id)) {
                  projectManagerUsers.push(manager);
                }
              }

              setProjectManagers(projectManagerUsers);
            }
          }
        } catch (roleError) {
          console.error('Error fetching role assignments:', roleError);
          // Fallback to all users if roles fetch fails
          setProjectManagers(teamMembers);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setUsersLoading(false);
      }
    };

    if (isOpen) {
      fetchUsersAndRoles();
    } else {
      // Reset form and secondary customer state when modal is closed
      resetForm();
      setShowSecondaryCustomer(false);
      setShowSecondHousehold(false);
    }
  }, [isOpen]);

  // Load lead sources when modal opens
  useEffect(() => {
    const loadLeadSources = async () => {
      try {
        setLeadSourcesLoading(true);
        const res = await api.get('/lead-sources');
        const items = Array.isArray(res?.data?.data) ? res.data.data : [];
        setLeadSources(items.filter(ls => ls.isActive !== false));
      } catch (e) {
        console.error('Error fetching lead sources:', e);
        setLeadSources([]);
      } finally {
        setLeadSourcesLoading(false);
      }
    };
    if (isOpen) {
      loadLeadSources();
    } else {
      setLeadSources([]);
    }
  }, [isOpen]);

  // Phone number formatting function
  const formatPhoneNumber = (value) => {
    if (!value) return value;
    
    // Remove all non-numeric characters
    const phoneNumber = value.replace(/[^\d]/g, '');
    
    // Don't format if there are no digits
    if (phoneNumber.length === 0) return '';
    
    // Format based on length
    if (phoneNumber.length < 4) {
      return phoneNumber;
    } else if (phoneNumber.length < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Apply phone formatting to phone fields
    let formattedValue = value;
    if (name === 'customerPhone' || name === 'secondaryPhone') {
      formattedValue = formatPhoneNumber(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleTradeTypeChange = (tradeType) => {
    setFormData(prev => ({
      ...prev,
      projectTypes: prev.projectTypes.includes(tradeType)
        ? prev.projectTypes.filter(type => type !== tradeType)
        : [...prev.projectTypes, tradeType]
    }));
    // Clear error when user selects a trade type
    if (errors.projectTypes) {
      setErrors(prev => ({ ...prev, projectTypes: '' }));
    }
  };

  const handleStartingPhaseChange = (phase) => {
    setFormData(prev => ({
      ...prev,
      startingPhase: phase
    }));
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      // Validate primary customer
      if (!formData.customerName.trim()) {
        newErrors.customerName = 'Primary customer name is required';
      }
      if (!formData.customerEmail.trim()) {
        newErrors.customerEmail = 'Primary customer email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) {
        newErrors.customerEmail = 'Please enter a valid email address';
      }
      if (!formData.address.trim()) {
        newErrors.address = 'Project address is required';
      }

      // Validate secondary customer if provided
      const hasSecondaryInfo = formData.secondaryName || formData.secondaryEmail || formData.secondaryPhone;
      if (hasSecondaryInfo) {
        if (!formData.secondaryName.trim()) {
          newErrors.secondaryName = 'Secondary customer name is required when secondary info is provided';
        }
        if (formData.secondaryEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.secondaryEmail)) {
          newErrors.secondaryEmail = 'Please enter a valid secondary email address';
        }
      }
    }

    if (step === 2) {
      if (formData.projectTypes.length === 0) {
        newErrors.projectTypes = 'Please select at least one trade type';
      }
      if (!formData.projectManagerId) {
        newErrors.projectManagerId = 'Please select a project manager';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep(currentStep)) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create customer first - ensure all fields match backend expectations
      const customerData = {
        primaryName: formData.customerName.trim(),
        primaryEmail: formData.customerEmail.trim(),
        primaryPhone: formData.customerPhone ? formData.customerPhone.trim() : '555-555-5555',
        primaryContact: formData.primaryContact,
        address: formData.address.trim()
      };
      
      // Only add secondary fields if they have values
      if (formData.secondaryName && formData.secondaryName.trim()) {
        customerData.secondaryName = formData.secondaryName.trim();
      }
      if (formData.secondaryEmail && formData.secondaryEmail.trim()) {
        customerData.secondaryEmail = formData.secondaryEmail.trim();
      }
      if (formData.secondaryPhone && formData.secondaryPhone.trim()) {
        customerData.secondaryPhone = formData.secondaryPhone.trim();
      }

      console.log('🔍 Sending customer data:', customerData);
      const customerResponse = await api.post('/customers', customerData);

      if (!customerResponse.data.success) {
        const errorMessage = customerResponse.data.errors 
          ? Object.values(customerResponse.data.errors).join(', ')
          : customerResponse.data.message || 'Failed to create customer';
        throw new Error(errorMessage);
      }

      const customerId = customerResponse.data.data.id;

      // Auto-generate project name from customer address
      const projectName = formData.address;

      // Create project with starting phase
      const projectData = {
        projectName: formData.address || 'New Project', // Use address as project name
        projectType: formData.projectTypes[0], // Main trade type
        additionalTrades: formData.projectTypes.slice(1), // Additional trades
        tradeTypes: formData.projectTypes, // All trade types
        description: formData.description,
        budget: 1000, // Default budget
        customerId: customerId,
        projectManagerId: formData.projectManagerId, // Assign project manager
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
        startingPhase: formData.startingPhase, // New field for starting phase
        leadSourceId: formData.leadSourceId || undefined
      };

      const projectResponse = await api.post('/projects', projectData);

      if (projectResponse.data.success) {
        console.log('✅ Project created successfully with trades:', formData.projectTypes);
        onProjectCreated && onProjectCreated(projectResponse.data.data);
        
        // Reset form
        resetForm();
        onClose();
      } else {
        throw new Error(projectResponse.data.message || 'Failed to create project');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      // Check if it's an axios error with response data
      if (error.response && error.response.data) {
        console.error('Server validation error:', error.response.data);
        const serverError = error.response.data;
        let errorMessage = serverError.message || 'Failed to create customer';
        
        if (serverError.errors) {
          // Format validation errors
          errorMessage = Object.entries(serverError.errors)
            .map(([field, msg]) => `${field}: ${msg}`)
            .join('\n');
        }
        
        alert('Error creating project:\n' + errorMessage);
      } else {
        alert('Error creating project: ' + error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      customerTypeOfContact: 'PRIMARY_CONTACT',
      secondaryName: '',
      secondaryEmail: '',
      secondaryPhone: '',
      secondaryTypeOfContact: 'SECONDARY_CONTACT',
      primaryContact: 'PRIMARY',
      address: '',
      projectTypes: [],
      description: '',
      startingPhase: 'LEAD',
      projectManagerId: ''
    });
    setCurrentStep(1);
    setErrors({});
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Create New Project</h2>
              <p className="text-blue-100 mt-0.5 text-sm">Add a new project to your portfolio</p>
            </div>
            <button
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-center mt-3">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 ${
                  currentStep >= step.id 
                    ? 'bg-white text-blue-600 border-white' 
                    : 'border-white/30 text-white/30'
                }`}>
                  {currentStep > step.id ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="font-semibold text-sm">{step.id}</span>
                  )}
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`w-12 h-0.5 mx-2 transition-all duration-300 ${
                    currentStep > step.id ? 'bg-white' : 'bg-white/30'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="p-3 flex-1 overflow-y-auto modal-content">
          <form onSubmit={handleSubmit}>
            {/* Step 1: Customer Information */}
            {currentStep === 1 && (
              <div className="space-y-3 animate-slide-up">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Customer Information</h3>
                  <p className="text-gray-600 text-sm">Enter primary and secondary customer details</p>
                </div>

                {/* Primary Customer Section */}
                <div className="bg-blue-50 rounded-lg p-3">
                  <h4 className="text-base font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    Primary Customer
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="customerName"
                        value={formData.customerName}
                        onChange={handleInputChange}
                        className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-sm ${
                          errors.customerName ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        placeholder="Primary customer full name"
                      />
                      {errors.customerName && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.customerName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="customerEmail"
                        value={formData.customerEmail}
                        onChange={handleInputChange}
                        className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-sm ${
                          errors.customerEmail ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        placeholder="primary@email.com"
                      />
                      {errors.customerEmail && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.customerEmail}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        name="customerPhone"
                        value={formData.customerPhone}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 hover:border-gray-300 text-sm"
                        placeholder="(865) 555-1212"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Type of Contact
                      </label>
                      <select
                        name="customerTypeOfContact"
                        value={formData.customerTypeOfContact}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 hover:border-gray-300 text-sm"
                      >
                        <option value="PRIMARY_CONTACT">Primary Contact</option>
                        <option value="SECONDARY_CONTACT">Secondary Contact</option>
                        <option value="TENANT">Tenant</option>
                        <option value="PROPERTY_MANAGER">Property Manager Contact</option>
                        <option value="GENERAL_CONTRACTOR">General Contractor</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Project Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-sm ${
                          errors.address ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        placeholder="Full project address"
                      />
                      {errors.address && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.address}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Add Secondary Customer Button */}
                {!showSecondaryCustomer ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowSecondaryCustomer(true)}
                      className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Secondary Customer
                    </button>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                        </svg>
                        Secondary Customer
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSecondaryCustomer(false);
                          setFormData(prev => ({
                            ...prev,
                            secondaryName: '',
                            secondaryEmail: '',
                            secondaryPhone: '',
                            secondaryTypeOfContact: 'SECONDARY_CONTACT'
                          }));
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Name
                        </label>
                        <input
                          type="text"
                          name="secondaryName"
                          value={formData.secondaryName}
                          onChange={handleInputChange}
                          className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-sm ${
                            errors.secondaryName ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                          }`}
                          placeholder="Secondary customer name"
                        />
                        {errors.secondaryName && (
                          <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {errors.secondaryName}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          name="secondaryEmail"
                          value={formData.secondaryEmail}
                          onChange={handleInputChange}
                          className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-sm ${
                            errors.secondaryEmail ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                          }`}
                          placeholder="secondary@email.com"
                        />
                        {errors.secondaryEmail && (
                          <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {errors.secondaryEmail}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Phone
                        </label>
                        <input
                          type="tel"
                          name="secondaryPhone"
                          value={formData.secondaryPhone}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 hover:border-gray-300 text-sm"
                          placeholder="(865) 555-1212"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Type of Contact
                        </label>
                        <select
                          name="secondaryTypeOfContact"
                          value={formData.secondaryTypeOfContact}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 hover:border-gray-300 text-sm"
                        >
                          <option value="PRIMARY_CONTACT">Primary Contact</option>
                          <option value="SECONDARY_CONTACT">Secondary Contact</option>
                          <option value="TENANT">Tenant</option>
                          <option value="PROPERTY_MANAGER">Property Manager Contact</option>
                          <option value="GENERAL_CONTRACTOR">General Contractor</option>
                        </select>
                      </div>

                      {/* Hide Primary Contact field when secondary customer is added */}
                      {!showSecondaryCustomer && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Primary Contact
                          </label>
                          <select
                            name="primaryContact"
                            value={formData.primaryContact}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 hover:border-gray-300 text-sm"
                          >
                            <option value="PRIMARY">Primary Customer</option>
                            <option value="SECONDARY">Secondary Customer</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Project Details */}
            {currentStep === 2 && (
              <div className="space-y-3 animate-slide-up">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Project Configuration</h3>
                  <p className="text-gray-600 text-sm">Select project type and starting phase</p>
                </div>

                {/* Trade Types */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Trade Types <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {TRADE_TYPES.map(trade => (
                      <label
                        key={trade.value}
                        className={`relative p-2 border rounded-lg cursor-pointer transition-all duration-200 group ${
                          formData.projectTypes.includes(trade.value)
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        } ${errors.projectTypes ? 'border-red-300 bg-red-50' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.projectTypes.includes(trade.value)}
                          onChange={() => handleTradeTypeChange(trade.value)}
                          className="sr-only"
                        />
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded flex items-center justify-center text-sm transition-all duration-200 ${
                            formData.projectTypes.includes(trade.value)
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                          }`}>
                            {trade.icon}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{trade.label}</div>
                            <div className="text-sm text-gray-500">{trade.description}</div>
                          </div>
                        </div>
                        {formData.projectTypes.includes(trade.value) && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </label>
                    ))}
                  </div>
                  {errors.projectTypes && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.projectTypes}
                    </p>
                  )}
                </div>

                {/* Starting Phase Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Starting Phase <span className="text-red-500">*</span>
                  </label>
                  <p className="text-sm text-gray-600 mb-4">
                    Select the phase to start the project. All previous phases will be automatically marked as completed.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {WORKFLOW_PHASES.map(phase => (
                      <label
                        key={phase.value}
                        className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 group ${
                          formData.startingPhase === phase.value
                            ? 'border-green-500 bg-green-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                      >
                        <input
                          type="radio"
                          name="startingPhase"
                          value={phase.value}
                          checked={formData.startingPhase === phase.value}
                          onChange={() => handleStartingPhaseChange(phase.value)}
                          className="sr-only"
                        />
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all duration-200 ${
                            formData.startingPhase === phase.value
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                          }`}>
                            {phase.icon}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{phase.label}</div>
                            <div className="text-sm text-gray-500">{phase.description}</div>
                          </div>
                        </div>
                        {formData.startingPhase === phase.value && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </label>
                    ))}
                  </div>
                </div>


                {/* Project Manager */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Project Manager <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="projectManagerId"
                    value={formData.projectManagerId}
                    onChange={handleInputChange}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 hover:border-gray-300"
                    disabled={usersLoading}
                  >
                    <option value="">Select a project manager</option>
                    {projectManagers.length > 0 ? (
                      projectManagers.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.firstName} {user.lastName}
                        </option>
                      ))
                    ) : (
                      users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.firstName} {user.lastName}
                        </option>
                      ))
                    )}
                  </select>
                  {usersLoading && (
                    <p className="mt-2 text-sm text-gray-500">Loading users...</p>
                  )}
                  {errors.projectManagerId && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.projectManagerId}
                    </p>
                  )}
                </div>

                {/* Lead Source */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Lead Source
                  </label>
                  <select
                    name="leadSourceId"
                    value={formData.leadSourceId}
                    onChange={handleInputChange}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 hover:border-gray-300"
                    disabled={leadSourcesLoading}
                  >
                    <option value="">Select a lead source (optional)</option>
                    {leadSources.map(ls => (
                      <option key={ls.id} value={ls.id}>{ls.name}</option>
                    ))}
                  </select>
                  {leadSourcesLoading && (
                    <p className="mt-2 text-sm text-gray-500">Loading lead sources...</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Project Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 hover:border-gray-300 resize-none"
                    placeholder="Describe the project scope, special requirements, or additional notes..."
                  />
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {currentStep === 3 && (
              <div className="space-y-3 animate-slide-up">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Review Project Details</h3>
                  <p className="text-gray-600 text-sm">Please review all information before creating the project</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900 mb-2">Customer Information</h4>
                      <div className="space-y-1">
                        <div>
                          <span className="text-xs text-gray-500">Primary Customer:</span>
                          <p className="font-medium text-sm">{formData.customerName || 'Not specified'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Primary Email:</span>
                          <p className="font-medium">{formData.customerEmail || 'Not specified'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Primary Phone:</span>
                          <p className="font-medium">{formData.customerPhone || 'Not specified'}</p>
                        </div>
                        {formData.secondaryName && (
                          <>
                            <div>
                              <span className="text-sm text-gray-500">Secondary Customer:</span>
                              <p className="font-medium">{formData.secondaryName}</p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">Secondary Email:</span>
                              <p className="font-medium">{formData.secondaryEmail || 'Not specified'}</p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">Secondary Phone:</span>
                              <p className="font-medium">{formData.secondaryPhone || 'Not specified'}</p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">Primary Contact:</span>
                              <p className="font-medium">{formData.primaryContact === 'PRIMARY' ? 'Primary Customer' : 'Secondary Customer'}</p>
                            </div>
                          </>
                        )}
                        <div>
                          <span className="text-sm text-gray-500">Project Address:</span>
                          <p className="font-medium">{formData.address || 'Not specified'}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm text-gray-900 mb-2">Project Configuration</h4>
                      <div className="space-y-1">
                        <div>
                          <span className="text-sm text-gray-500">Project Name:</span>
                          <p className="font-medium">{formData.address || 'Auto-generated from address'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Trade Types:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {formData.projectTypes.map(type => {
                              const trade = TRADE_TYPES.find(t => t.value === type);
                              return (
                                <span key={type} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm">
                                  {trade?.icon} {trade?.label}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Starting Phase:</span>
                          <div className="flex items-center gap-1 mt-1">
                            {(() => {
                              const phase = WORKFLOW_PHASES.find(p => p.value === formData.startingPhase);
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-lg text-sm">
                                  {phase?.icon} {phase?.label}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Project Manager:</span>
                          <p className="font-medium">
                            {formData.projectManagerId 
                              ? (() => {
                                  const manager = [...projectManagers, ...users].find(u => u.id === formData.projectManagerId);
                                  return manager ? `${manager.firstName} ${manager.lastName}` : 'Not found';
                                })()
                              : 'Not assigned'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {formData.description && (
                    <div>
                      <span className="text-sm text-gray-500">Description:</span>
                      <p className="mt-1 text-gray-900">{formData.description}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 px-3 py-2 border-t border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 text-sm ${
                currentStep === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200 text-sm"
              >
                Cancel
              </button>
              
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 flex items-center gap-2 text-sm"
                >
                  Next
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 text-sm"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Create Project
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddProjectModal;