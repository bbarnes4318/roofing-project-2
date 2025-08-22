import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const AddProjectModal = ({ isOpen, onClose, onProjectCreated }) => {
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    secondaryName: '',
    secondaryEmail: '',
    secondaryPhone: '',
    primaryContact: 'PRIMARY', // PRIMARY or SECONDARY
    address: '',
    projectTypes: [], // Multiple trade types
    description: '',
    budget: '',
    startingPhase: 'LEAD', // Starting phase selection
    projectManagerId: '' // Project manager assignment
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // Available trade types with icons
  const TRADE_TYPES = [
    { value: 'ROOFING', label: 'Roofing', icon: '🏠', description: 'Roof installation and repair' },
    { value: 'GUTTERS', label: 'Gutters', icon: '🌧️', description: 'Gutter installation and maintenance' },
    { value: 'INTERIOR_PAINT', label: 'Interior Paint', icon: '🎨', description: 'Interior painting services' }
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

  // Fetch users for project manager assignment
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get('/users');
        if (response.data.success) {
          setUsers(response.data.data || []);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setUsersLoading(false);
      }
    };

    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
        budget: formData.budget ? parseFloat(formData.budget) : 1000, // Default budget
        customerId: customerId,
        projectManagerId: formData.projectManagerId, // Assign project manager
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
        startingPhase: formData.startingPhase // New field for starting phase
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
      secondaryName: '',
      secondaryEmail: '',
      secondaryPhone: '',
      primaryContact: 'PRIMARY',
      address: '',
      projectTypes: [],
      description: '',
      budget: '',
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
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Create New Project</h2>
              <p className="text-blue-100 mt-1">Add a new project to your portfolio</p>
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
          <div className="flex items-center justify-center mt-6">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                  currentStep >= step.id 
                    ? 'bg-white text-blue-600 border-white' 
                    : 'border-white/30 text-white/30'
                }`}>
                  {currentStep > step.id ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="font-semibold">{step.id}</span>
                  )}
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`w-16 h-0.5 mx-2 transition-all duration-300 ${
                    currentStep > step.id ? 'bg-white' : 'bg-white/30'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit}>
            {/* Step 1: Customer Information */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-slide-up">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Customer Information</h3>
                  <p className="text-gray-600">Enter primary and secondary customer details</p>
                </div>

                {/* Primary Customer Section */}
                <div className="bg-blue-50 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    Primary Customer
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="customerName"
                        value={formData.customerName}
                        onChange={handleInputChange}
                        className={`w-full p-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 ${
                          errors.customerName ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        placeholder="Primary customer full name"
                      />
                      {errors.customerName && (
                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.customerName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="customerEmail"
                        value={formData.customerEmail}
                        onChange={handleInputChange}
                        className={`w-full p-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 ${
                          errors.customerEmail ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        placeholder="primary@email.com"
                      />
                      {errors.customerEmail && (
                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.customerEmail}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        name="customerPhone"
                        value={formData.customerPhone}
                        onChange={handleInputChange}
                        className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 hover:border-gray-300"
                        placeholder="(555) 123-4567"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Project Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className={`w-full p-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 ${
                          errors.address ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        placeholder="Full project address"
                      />
                      {errors.address && (
                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.address}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Secondary Customer Section */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                    </svg>
                    Secondary Customer (Optional)
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        name="secondaryName"
                        value={formData.secondaryName}
                        onChange={handleInputChange}
                        className={`w-full p-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 ${
                          errors.secondaryName ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        placeholder="Secondary customer name"
                      />
                      {errors.secondaryName && (
                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.secondaryName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        name="secondaryEmail"
                        value={formData.secondaryEmail}
                        onChange={handleInputChange}
                        className={`w-full p-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 ${
                          errors.secondaryEmail ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        placeholder="secondary@email.com"
                      />
                      {errors.secondaryEmail && (
                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.secondaryEmail}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        name="secondaryPhone"
                        value={formData.secondaryPhone}
                        onChange={handleInputChange}
                        className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 hover:border-gray-300"
                        placeholder="(555) 123-4567"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Primary Contact
                      </label>
                      <select
                        name="primaryContact"
                        value={formData.primaryContact}
                        onChange={handleInputChange}
                        className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 hover:border-gray-300"
                      >
                        <option value="PRIMARY">Primary Customer</option>
                        <option value="SECONDARY">Secondary Customer</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Project Details */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-slide-up">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Project Configuration</h3>
                  <p className="text-gray-600">Select project type and starting phase</p>
                </div>

                {/* Trade Types */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Trade Types <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {TRADE_TYPES.map(trade => (
                      <label
                        key={trade.value}
                        className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 group ${
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
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all duration-200 ${
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

                {/* Budget */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Project Budget
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      name="budget"
                      value={formData.budget}
                      onChange={handleInputChange}
                      className="w-full p-4 pl-8 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 hover:border-gray-300"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
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
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} - {user.role || 'No role'}
                      </option>
                    ))}
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
              <div className="space-y-6 animate-slide-up">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Review Project Details</h3>
                  <p className="text-gray-600">Please review all information before creating the project</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Customer Information</h4>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm text-gray-500">Primary Customer:</span>
                          <p className="font-medium">{formData.customerName || 'Not specified'}</p>
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
                      <h4 className="font-semibold text-gray-900 mb-3">Project Configuration</h4>
                      <div className="space-y-2">
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
                          <span className="text-sm text-gray-500">Budget:</span>
                          <p className="font-medium">{formData.budget ? `$${parseFloat(formData.budget).toLocaleString()}` : 'Not specified'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Project Manager:</span>
                          <p className="font-medium">
                            {formData.projectManagerId 
                              ? users.find(u => u.id === formData.projectManagerId)?.firstName + ' ' + 
                                users.find(u => u.id === formData.projectManagerId)?.lastName
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
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
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

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                className="px-6 py-3 text-gray-700 bg-white border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200"
              >
                Cancel
              </button>
              
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all duration-200 flex items-center gap-2"
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
                  className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
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