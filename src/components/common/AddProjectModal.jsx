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

  // Available trade types
  const TRADE_TYPES = [
    { value: 'ROOFING', label: 'Roofing' },
    { value: 'GUTTERS', label: 'Gutters' },
    { value: 'INTERIOR_PAINT', label: 'Interior Paint' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTradeTypeChange = (tradeType) => {
    setFormData(prev => ({
      ...prev,
      projectTypes: prev.projectTypes.includes(tradeType)
        ? prev.projectTypes.filter(type => type !== tradeType)
        : [...prev.projectTypes, tradeType]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.projectTypes.length === 0) {
      alert('Please select at least one trade type');
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Add New Project</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Project Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name *
              </label>
              <input
                type="text"
                name="projectName"
                value={formData.projectName}
                onChange={handleInputChange}
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter project name"
              />
            </div>

            {/* Trade Types - Multiple Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trade Types * (Select multiple)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {TRADE_TYPES.map(trade => (
                  <label
                    key={trade.value}
                    className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.projectTypes.includes(trade.value)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.projectTypes.includes(trade.value)}
                      onChange={() => handleTradeTypeChange(trade.value)}
                      className="mr-3 h-4 w-4 text-blue-600"
                    />
                    <span className="font-medium">{trade.label}</span>
                  </label>
                ))}
              </div>
              {formData.projectTypes.length > 0 && (
                <p className="mt-2 text-sm text-blue-600">
                  Selected: {formData.projectTypes.join(', ')}
                </p>
              )}
            </div>

            {/* Customer Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Customer name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Email
                </label>
                <input
                  type="email"
                  name="customerEmail"
                  value={formData.customerEmail}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="customer@email.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Phone
                </label>
                <input
                  type="tel"
                  name="customerPhone"
                  value={formData.customerPhone}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="(555) 123-4567"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget
                </label>
                <input
                  type="number"
                  name="budget"
                  value={formData.budget}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="10000"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address *
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Project address"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Project description..."
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddProjectModal;