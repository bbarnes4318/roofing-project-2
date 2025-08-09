import React, { useState, useEffect } from 'react';
import { 
  UserGroupIcon, 
  PlusIcon, 
  ChevronDownIcon, 
  ChevronUpIcon,
  UserIcon,
  XCircleIcon,
  CheckCircleIcon,
  PencilIcon,
  TrashIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon
} from '../common/Icons';
import { useCustomers, useCreateCustomer } from '../../hooks/useQueryApi';
import { customersService } from '../../services/api';
import Modal from '../common/Modal';

const CustomersPage = ({ colorMode }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);

  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  const { createCustomer, loading: createLoading, error: createError } = useCreateCustomer();

  // Load customers
  useEffect(() => {
    loadCustomers();
  }, []);

  // Filter customers based on search
  useEffect(() => {
    if (!searchTerm) {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCustomers(filtered);
    }
  }, [searchTerm, customers]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await customersService.getAll({ 
        limit: 100,
        sortBy,
        sortOrder,
        withProjects: true
      });
      setCustomers(response.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const response = await createCustomer(newCustomer);
      setCustomers(prev => [response.data.customer, ...prev]);
      setNewCustomer({ name: '', email: '', phone: '', address: '' });
      setIsAddModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create customer');
    }
  };

  const handleEditCustomer = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const response = await customersService.update(selectedCustomer._id, selectedCustomer);
      setCustomers(prev => prev.map(c => c._id === selectedCustomer._id ? response.data.customer : c));
      setIsEditModalOpen(false);
      setSelectedCustomer(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update customer');
    }
  };

  const handleDeleteCustomer = async () => {
    try {
      setError('');
      await customersService.delete(customerToDelete._id);
      setCustomers(prev => prev.filter(c => c._id !== customerToDelete._id));
      setIsDeleteModalOpen(false);
      setCustomerToDelete(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete customer');
    }
  };

  const toggleCustomerExpansion = (customerId) => {
    setExpandedCustomer(expandedCustomer === customerId ? null : customerId);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return 'No phone';
    // Simple formatting for display
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const renderCustomerCard = (customer) => {
    const isExpanded = expandedCustomer === customer._id;
    const projectCount = customer.associatedProjects?.length || 0;
    
    return (
      <div key={customer._id} className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-soft rounded-2xl hover:shadow-medium transition-all duration-300 overflow-hidden hover:-translate-y-1">
        
        {/* Customer header */}
        <div 
          className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50/50 transition-all duration-300"
          onClick={() => toggleCustomerExpansion(customer._id)}
        >
          {/* Customer avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-red-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm">
              <UserIcon className="w-6 h-6" />
            </div>
            {/* Project count indicator */}
            <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold ${
              projectCount > 0 ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'
            }`}>
              {projectCount}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            {/* Customer name and status */}
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-bold text-gray-900 truncate">
                {customer.name}
              </h3>
              <span className={`px-3 py-1 rounded-xl text-sm font-medium ${
                projectCount > 0 
                  ? 'bg-green-100 text-green-800 border-2 border-green-200' 
                  : 'bg-gray-100 text-gray-600 border-2 border-gray-200'
              }`}>
                {projectCount} {projectCount === 1 ? 'Project' : 'Projects'}
              </span>
            </div>
            
            {/* Contact info */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <EnvelopeIcon className="w-4 h-4 text-gray-500" />
                <a 
                  href={`mailto:${customer.email}`}
                  className="hover:underline cursor-pointer transition-all duration-300 truncate max-w-48 text-brand-600 hover:text-brand-700"
                  onClick={(e) => e.stopPropagation()}
                >
                  {customer.email}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">
                  Added {formatDate(customer.createdAt)}
                </span>
              </div>
            </div>
          </div>
          
          {/* Expand/collapse arrow */}
          <div className={`transform transition-transform duration-300 p-2 rounded-xl text-gray-500 hover:bg-gray-100 ${isExpanded ? 'rotate-180' : ''}`}>
            <ChevronDownIcon className="w-5 h-5" />
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className={`border-t ${colorMode ? 'border-slate-600/50 bg-slate-800/50' : 'border-gray-100 bg-gray-50/50'}`}>
            <div className="p-2 space-y-3">
              
              {/* Contact Information */}
              <div className={`rounded border p-2 ${colorMode ? 'bg-slate-700/50 border-slate-600/30' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center gap-1 mb-2">
                  <UserIcon className="w-3 h-3 text-blue-600" />
                  <h4 className={`text-xs font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                    Contact Information
                  </h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded ${colorMode ? 'bg-slate-600/50' : 'bg-gray-100'}`}>
                      <PhoneIcon className="w-3 h-3 text-blue-600" />
                    </div>
                    <div>
                      <p className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'} mb-0.5`}>Phone</p>
                      <a 
                        href={`tel:${customer.phone?.replace(/[^\d+]/g, '') || ''}`}
                        className={`text-xs font-medium hover:underline cursor-pointer transition-all duration-200 ${
                          colorMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                        }`}
                      >
                        {formatPhoneNumber(customer.phone)}
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded ${colorMode ? 'bg-slate-600/50' : 'bg-gray-100'}`}>
                      <EnvelopeIcon className="w-3 h-3 text-blue-600" />
                    </div>
                    <div>
                      <p className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'} mb-0.5`}>Email</p>
                      <a 
                        href={`mailto:${customer.email}`}
                        className={`text-xs font-medium hover:underline cursor-pointer transition-all duration-200 truncate block ${
                          colorMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                        }`}
                      >
                        {customer.email}
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2 md:col-span-2">
                    <div className={`p-1 rounded ${colorMode ? 'bg-slate-600/50' : 'bg-gray-100'}`}>
                      <MapPinIcon className="w-3 h-3 text-blue-600" />
                    </div>
                    <div>
                      <p className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'} mb-0.5`}>Address</p>
                      <p className={`text-xs font-medium ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                        {customer.address}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Associated Projects */}
              {customer.associatedProjects?.length > 0 && (
                <div className={`rounded border p-2 ${colorMode ? 'bg-slate-700/50 border-slate-600/30' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center gap-1 mb-2">
                    <CheckCircleIcon className="w-3 h-3 text-green-600" />
                    <h4 className={`text-xs font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                      Associated Projects ({customer.associatedProjects.length})
                    </h4>
                  </div>
                  
                  <div className="grid gap-1">
                    {(customer.associatedProjects || []).map((project) => (
                      <div 
                        key={project._id} 
                        className={`p-1 rounded border transition-all duration-200 hover:shadow-sm ${
                          colorMode 
                            ? 'bg-slate-600/30 border-slate-500/30 hover:bg-slate-600/50' 
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className={`font-medium text-xs ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                              {project.projectName}
                            </h5>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className={`px-1 py-0.5 rounded text-xs font-medium ${
                                project.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                project.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                project.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {project.status}
                              </span>
                              {project.budget && (
                                <span className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  ${project.budget?.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                          {project.progress && (
                            <div className="text-right">
                              <div className={`text-xs font-medium ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {project.progress}%
                              </div>
                              <div className={`w-16 h-1 rounded-full mt-0.5 ${colorMode ? 'bg-slate-500' : 'bg-gray-200'}`}>
                                <div 
                                  className="h-1 bg-blue-500 rounded-full transition-all duration-300"
                                  style={{ width: `${project.progress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCustomer(customer);
                    setIsEditModalOpen(true);
                  }}
                  className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <PencilIcon className="w-3 h-3" />
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCustomerToDelete(customer);
                    setIsDeleteModalOpen(true);
                  }}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors shadow-sm ${
                    customer.associatedProjects?.length > 0
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                  disabled={customer.associatedProjects?.length > 0}
                  title={customer.associatedProjects?.length > 0 ? 'Cannot delete customer with active projects' : 'Delete customer'}
                >
                  <TrashIcon className="w-3 h-3" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAddModal = () => (
    <Modal
      isOpen={isAddModalOpen}
      onClose={() => setIsAddModalOpen(false)}
      title="Add New Customer"
      colorMode={colorMode}
    >
      <form onSubmit={handleAddCustomer} className="space-y-2">
        {(error || createError) && (
          <div className="bg-red-50 border border-red-200 rounded p-2">
            <div className="text-red-700 text-xs">{error || createError}</div>
          </div>
        )}
        
        <div>
          <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Customer Name *
          </label>
          <input
            type="text"
            value={newCustomer.name}
            onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
            className={`w-full p-1 border rounded text-xs transition-colors focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
              colorMode
                ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 placeholder-gray-500'
            }`}
            placeholder="Enter customer name"
            required
          />
        </div>
        
        <div>
          <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Email Address *
          </label>
          <input
            type="email"
            value={newCustomer.email}
            onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
            className={`w-full p-1 border rounded text-xs transition-colors focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
              colorMode
                ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 placeholder-gray-500'
            }`}
            placeholder="Enter email address"
            required
          />
        </div>
        
        <div>
          <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Phone Number *
          </label>
          <input
            type="tel"
            value={newCustomer.phone}
            onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
            className={`w-full p-1 border rounded text-xs transition-colors focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
              colorMode
                ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 placeholder-gray-500'
            }`}
            placeholder="Enter phone number"
            required
          />
        </div>
        
        <div>
          <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Address *
          </label>
          <textarea
            value={newCustomer.address}
            onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
            className={`w-full p-1 border rounded text-xs transition-colors focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
              colorMode
                ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 placeholder-gray-500'
            }`}
            rows={2}
            placeholder="Enter customer address"
            required
          />
        </div>
        
        <div className="flex justify-end space-x-2 pt-2">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(false)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              colorMode
                ? 'bg-slate-600 hover:bg-slate-700 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createLoading}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              colorMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {createLoading ? 'Adding...' : 'Add Customer'}
          </button>
        </div>
      </form>
    </Modal>
  );

  const renderEditModal = () => (
    <Modal
      isOpen={isEditModalOpen}
      onClose={() => setIsEditModalOpen(false)}
      title="Edit Customer"
      colorMode={colorMode}
    >
      <form onSubmit={handleEditCustomer} className="space-y-2">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-2">
            <div className="text-red-700 text-xs">{error}</div>
          </div>
        )}
        
        <div>
          <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Customer Name *
          </label>
          <input
            type="text"
            value={selectedCustomer?.name || ''}
            onChange={(e) => setSelectedCustomer({ ...selectedCustomer, name: e.target.value })}
            className={`w-full p-1 border rounded text-xs transition-colors focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
              colorMode
                ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 placeholder-gray-500'
            }`}
            required
          />
        </div>
        
        <div>
          <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Email Address *
          </label>
          <input
            type="email"
            value={selectedCustomer?.email || ''}
            onChange={(e) => setSelectedCustomer({ ...selectedCustomer, email: e.target.value })}
            className={`w-full p-1 border rounded text-xs transition-colors focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
              colorMode
                ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 placeholder-gray-500'
            }`}
            required
          />
        </div>
        
        <div>
          <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Phone Number *
          </label>
          <input
            type="tel"
            value={selectedCustomer?.phone || ''}
            onChange={(e) => setSelectedCustomer({ ...selectedCustomer, phone: e.target.value })}
            className={`w-full p-1 border rounded text-xs transition-colors focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
              colorMode
                ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 placeholder-gray-500'
            }`}
            required
          />
        </div>
        
        <div>
          <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Address *
          </label>
          <textarea
            value={selectedCustomer?.address || ''}
            onChange={(e) => setSelectedCustomer({ ...selectedCustomer, address: e.target.value })}
            className={`w-full p-1 border rounded text-xs transition-colors focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
              colorMode
                ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 placeholder-gray-500'
            }`}
            rows={2}
            required
          />
        </div>
        
        <div className="flex justify-end space-x-2 pt-2">
          <button
            type="button"
            onClick={() => setIsEditModalOpen(false)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              colorMode
                ? 'bg-slate-600 hover:bg-slate-700 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              colorMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? 'Updating...' : 'Update Customer'}
          </button>
        </div>
      </form>
    </Modal>
  );

  const renderDeleteModal = () => (
    <Modal
      isOpen={isDeleteModalOpen}
      onClose={() => setIsDeleteModalOpen(false)}
      title="Delete Customer"
      colorMode={colorMode}
    >
      <div className="space-y-2">
        <p className={`text-xs ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Are you sure you want to delete <strong>{customerToDelete?.name}</strong>? This action cannot be undone.
        </p>
        
        {customerToDelete?.associatedProjects?.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
            <div className="text-yellow-700 text-xs">
              <strong>Warning:</strong> This customer has {customerToDelete.associatedProjects.length} associated project(s). 
              Please reassign or delete these projects before deleting the customer.
            </div>
          </div>
        )}
        
        <div className="flex justify-end space-x-2 pt-2">
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(false)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              colorMode
                ? 'bg-slate-600 hover:bg-slate-700 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteCustomer}
            disabled={loading || customerToDelete?.associatedProjects?.length > 0}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              colorMode
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? 'Deleting...' : 'Delete Customer'}
          </button>
        </div>
      </div>
    </Modal>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 text-gray-900">
      <div className="w-full max-w-7xl mx-auto py-6 px-6">
        <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-soft rounded-2xl p-6 overflow-hidden relative">
          
          {/* Header with controls */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
                  Customer Management
                </h1>
                <p className="text-lg text-gray-600 font-medium">
                  {filteredCustomers.length} customers • {customers.reduce((acc, customer) => acc + (customer.associatedProjects?.length || 0), 0)} total projects
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 bg-gradient-to-r from-brand-500 to-red-500 text-white shadow-soft hover:shadow-medium hover:-translate-y-0.5"
              >
                <PlusIcon className="w-5 h-5" />
                Add Customer
              </button>
            </div>
          
          {/* Search control */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm transition-all duration-300 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 bg-white/80 placeholder-gray-500 hover:bg-white hover:border-gray-300"
            />
          </div>
        </div>

        {/* Customer list */}
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-center text-gray-600">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mx-auto mb-4"></div>
                <p className="text-lg font-medium">Loading customers...</p>
              </div>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-6 opacity-60">👥</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {searchTerm ? 'No customers found' : 'No customers yet'}
              </h3>
              <p className="text-lg text-gray-600 mb-8">
                {searchTerm 
                  ? 'Try adjusting your search terms' 
                  : 'Get started by adding your first customer'
                }
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-8 py-4 bg-gradient-to-r from-brand-500 to-red-500 text-white rounded-xl text-lg font-semibold transition-all duration-300 shadow-soft hover:shadow-medium hover:-translate-y-0.5"
                >
                  Add Your First Customer
                </button>
              )}
            </div>
          ) : (
            filteredCustomers.map(customer => renderCustomerCard(customer))
          )}
        </div>
      </div>

      {/* Modals */}
      {renderAddModal()}
      {renderEditModal()}
      {renderDeleteModal()}
    </div>
  );
};

export default CustomersPage; 