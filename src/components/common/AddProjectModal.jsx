import React, { useState } from 'react';
import api from '../../services/api';

const AddProjectModal = ({ isOpen, onClose, onProjectCreated }) => {
  const [formData, setFormData] = useState({
    projectName: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    address: '',
    projectTypes: [], // Multiple trade types
    description: '',
    budget: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState({});

  // Available trade types with icons
  const TRADE_TYPES = [
    { value: 'ROOFING', label: 'Roofing', icon: '🏠', description: 'Roof installation and repair' },
    { value: 'GUTTERS', label: 'Gutters', icon: '🌧️', description: 'Gutter installation and maintenance' },
    { value: 'INTERIOR_PAINT', label: 'Interior Paint', icon: '🎨', description: 'Interior painting services' }
  ];

  const STEPS = [
    { id: 1, title: 'Project Details', description: 'Basic project information' },
    { id: 2, title: 'Customer Information', description: 'Customer contact details' },
    { id: 3, title: 'Review & Create', description: 'Final review and submission' }
  ];

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

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.projectName.trim()) {
        newErrors.projectName = 'Project name is required';
      }
      if (formData.projectTypes.length === 0) {
        newErrors.projectTypes = 'Please select at least one trade type';
      }
    }

    if (step === 2) {
      if (!formData.customerName.trim()) {
        newErrors.customerName = 'Customer name is required';
      }
      if (!formData.address.trim()) {
        newErrors.address = 'Address is required';
      }
      if (formData.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) {
        newErrors.customerEmail = 'Please enter a valid email address';
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
      // Create customer first
      const customerResponse = await api.post('/customers', {
        primaryName: formData.customerName,
        primaryEmail: formData.customerEmail,
        primaryPhone: formData.customerPhone,
        address: formData.address
      });

      if (!customerResponse.data.success) {
        throw new Error('Failed to create customer');
      }

      const customerId = customerResponse.data.data.id;

      // Create project with multiple trade types
      const projectResponse = await api.post('/projects', {
        projectName: formData.projectName,
        projectType: formData.projectTypes[0], // Main trade type
        additionalTrades: formData.projectTypes.slice(1), // Additional trades
        tradeTypes: formData.projectTypes, // All trade types
        description: formData.description,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        customerId: customerId
      });

      if (projectResponse.data.success) {
        console.log('✅ Project created successfully with trades:', formData.projectTypes);
        onProjectCreated && onProjectCreated(projectResponse.data.data);
        
        // Reset form
        setFormData({
          projectName: '',
          customerName: '',
          customerEmail: '',
          customerPhone: '',
          address: '',
          projectTypes: [],
          description: '',
          budget: ''
        });
        setCurrentStep(1);
        setErrors({});
        
        onClose();
      } else {
        throw new Error(projectResponse.data.message || 'Failed to create project');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Error creating project: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      projectName: '',
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      address: '',
      projectTypes: [],
      description: '',
      budget: ''
    });
    setCurrentStep(1);
    setErrors({});
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
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
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            {/* Step 1: Project Details */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-slide-up">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Project Information</h3>
                  <p className="text-gray-600">Tell us about your new project</p>
                </div>

                {/* Project Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="projectName"
                    value={formData.projectName}
                    onChange={handleInputChange}
                    className={`w-full p-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 ${
                      errors.projectName ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    placeholder="Enter project name (e.g., Smith Residence Roof Replacement)"
                  />
                  {errors.projectName && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.projectName}
                    </p>
                  )}
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

            {/* Step 2: Customer Information */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-slide-up">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Customer Information</h3>
                  <p className="text-gray-600">Enter customer contact details</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Customer Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="customerName"
                      value={formData.customerName}
                      onChange={handleInputChange}
                      className={`w-full p-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 ${
                        errors.customerName ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      placeholder="Full customer name"
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

                  {/* Customer Email */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="customerEmail"
                      value={formData.customerEmail}
                      onChange={handleInputChange}
                      className={`w-full p-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 ${
                        errors.customerEmail ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      placeholder="customer@email.com"
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

                  {/* Customer Phone */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone Number
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

                  {/* Address */}
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
                      <h4 className="font-semibold text-gray-900 mb-3">Project Information</h4>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm text-gray-500">Project Name:</span>
                          <p className="font-medium">{formData.projectName || 'Not specified'}</p>
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
                          <span className="text-sm text-gray-500">Budget:</span>
                          <p className="font-medium">{formData.budget ? `$${parseFloat(formData.budget).toLocaleString()}` : 'Not specified'}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Customer Information</h4>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm text-gray-500">Name:</span>
                          <p className="font-medium">{formData.customerName || 'Not specified'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Email:</span>
                          <p className="font-medium">{formData.customerEmail || 'Not specified'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Phone:</span>
                          <p className="font-medium">{formData.customerPhone || 'Not specified'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Address:</span>
                          <p className="font-medium">{formData.address || 'Not specified'}</p>
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
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
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