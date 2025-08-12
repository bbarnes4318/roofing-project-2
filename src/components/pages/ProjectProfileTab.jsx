import React, { useState } from 'react';
import { formatPhoneNumber } from '../../utils/helpers';

const ProjectProfileTab = ({ project, colorMode }) => {
  const [activeSection, setActiveSection] = useState('overview');

  if (!project) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Project Selected</h3>
          <p className="text-gray-500">Please select a project to view its profile information.</p>
        </div>
      </div>
    );
  }

  const formatAddress = (address) => {
    if (!address) return 'Address not provided';
    
    const parts = address.split(',');
    if (parts.length >= 2) {
      return (
        <div className="text-sm text-gray-700">
          <div className="font-medium">{parts[0]?.trim()}</div>
          <div className="text-gray-600">{parts.slice(1).join(',').trim()}</div>
        </div>
      );
    }
    return <div className="text-sm text-gray-700">{address}</div>;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'on hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {project.name || project.projectName || 'Project Profile'}
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-lg font-semibold text-blue-600">
                #{String(project.projectNumber || project.id || '').padStart(5, '0')}
              </span>
              <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(project.status)}`}>
                {project.status || 'Pending'}
              </span>
              <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${getPriorityColor(project.priority)}`}>
                {project.priority || 'Normal'} Priority
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: '📋' },
              { id: 'customer', label: 'Customer', icon: '👥' },
              { id: 'team', label: 'Team', icon: '🏗️' },
              { id: 'details', label: 'Details', icon: '📊' }
            ].map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeSection === section.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{section.icon}</span>
                {section.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content Sections */}
      {activeSection === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Key Metrics */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Job Type</label>
                  <p className="text-base text-gray-900">{project.jobType || 'Not specified'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Budget</label>
                  <p className="text-base font-semibold text-gray-900">
                    {project.budget ? `$${project.budget.toLocaleString()}` : 'Not set'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Start Date</label>
                  <p className="text-base text-gray-900">
                    {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Not scheduled'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Target Completion</label>
                  <p className="text-base text-gray-900">
                    {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Not scheduled'}
                  </p>
                </div>
              </div>
              {project.description && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-600 mb-2">Project Description</label>
                  <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg">
                    {project.description}
                  </p>
                </div>
              )}
            </div>

            {/* Project Address */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span>📍</span>
                Project Location
              </h3>
              <div className="bg-blue-50 p-4 rounded-lg">
                {formatAddress(project.customer?.address || project.clientAddress || project.address)}
              </div>
            </div>
          </div>

          {/* Quick Stats Sidebar */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm text-white p-6">
              <h3 className="text-lg font-semibold mb-4">Project Health</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-blue-100">Progress</span>
                  <span className="font-semibold">{project.progress || 0}%</span>
                </div>
                <div className="w-full bg-blue-400 rounded-full h-2">
                  <div 
                    className="bg-white rounded-full h-2 transition-all duration-300" 
                    style={{ width: `${project.progress || 0}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full text-left p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">📞</span>
                    <span className="font-medium text-gray-900">Contact Customer</span>
                  </div>
                </button>
                <button className="w-full text-left p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">📅</span>
                    <span className="font-medium text-gray-900">Schedule Meeting</span>
                  </div>
                </button>
                <button className="w-full text-left p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">📝</span>
                    <span className="font-medium text-gray-900">Add Notes</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'customer' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Primary Customer */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>👤</span>
              Primary Customer
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
                <p className="text-lg font-semibold text-gray-900">
                  {project.customer?.primaryName || project.customer?.name || project.clientName || 'Not provided'}
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
                  {project.customer?.primaryPhone || project.customer?.phone || project.clientPhone ? (
                    <a 
                      href={`tel:${(project.customer?.primaryPhone || project.customer?.phone || project.clientPhone).replace(/[^\d+]/g, '')}`}
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <span>📞</span>
                      {formatPhoneNumber(project.customer?.primaryPhone || project.customer?.phone || project.clientPhone)}
                    </a>
                  ) : (
                    <p className="text-gray-500">Not provided</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                  {project.customer?.primaryEmail || project.customer?.email || project.clientEmail ? (
                    <a 
                      href={`mailto:${project.customer?.primaryEmail || project.customer?.email || project.clientEmail}`}
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <span>✉️</span>
                      {project.customer?.primaryEmail || project.customer?.email || project.clientEmail}
                    </a>
                  ) : (
                    <p className="text-gray-500">Not provided</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Customer */}
          {(project.customer?.secondaryName || project.customer?.secondaryPhone || project.customer?.secondaryEmail) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span>👥</span>
                Secondary Customer
              </h3>
              <div className="space-y-4">
                {project.customer?.secondaryName && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
                    <p className="text-lg font-semibold text-gray-900">{project.customer.secondaryName}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 gap-4">
                  {project.customer?.secondaryPhone && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
                      <a 
                        href={`tel:${project.customer.secondaryPhone.replace(/[^\d+]/g, '')}`}
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                      >
                        <span>📞</span>
                        {formatPhoneNumber(project.customer.secondaryPhone)}
                      </a>
                    </div>
                  )}
                  
                  {project.customer?.secondaryEmail && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                      <a 
                        href={`mailto:${project.customer.secondaryEmail}`}
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                      >
                        <span>✉️</span>
                        {project.customer.secondaryEmail}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSection === 'team' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <span>🏗️</span>
            Project Team
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { 
                role: 'Project Manager', 
                name: project.projectManager?.name || project.projectManager || 'Not assigned',
                email: project.projectManager?.email,
                icon: '👨‍💼'
              },
              { 
                role: 'Field Director', 
                name: project.fieldDirector?.name || project.fieldDirector || 'Not assigned',
                email: project.fieldDirector?.email,
                icon: '🏗️'
              },
              { 
                role: 'Sales Representative', 
                name: project.salesRep?.name || project.salesRep || 'Not assigned',
                email: project.salesRep?.email,
                icon: '💼'
              },
              { 
                role: 'Quality Inspector', 
                name: project.qualityInspector?.name || project.qualityInspector || 'Not assigned',
                email: project.qualityInspector?.email,
                icon: '🔍'
              },
              { 
                role: 'Admin Assistant', 
                name: project.adminAssistant?.name || project.adminAssistant || 'Not assigned',
                email: project.adminAssistant?.email,
                icon: '📋'
              }
            ].map((member, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{member.icon}</span>
                  <div>
                    <h4 className="font-medium text-gray-900">{member.role}</h4>
                    <p className="text-sm text-gray-600">{member.name}</p>
                  </div>
                </div>
                {member.email && (
                  <a 
                    href={`mailto:${member.email}`}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {member.email}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Timeline</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="font-medium text-gray-700">Created</span>
                <span className="text-gray-600">
                  {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="font-medium text-gray-700">Last Updated</span>
                <span className="text-gray-600">
                  {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="font-medium text-gray-700">Duration</span>
                <span className="text-gray-600">
                  {project.startDate && project.endDate 
                    ? `${Math.ceil((new Date(project.endDate) - new Date(project.startDate)) / (1000 * 60 * 60 * 24))} days`
                    : 'Not calculated'
                  }
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Project ID</label>
                <p className="text-sm text-gray-700 font-mono bg-gray-100 px-2 py-1 rounded">
                  {project.id}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Estimated Value</label>
                <p className="text-base font-semibold text-gray-900">
                  {project.estimatedCost ? `$${project.estimatedCost.toLocaleString()}` : 'Not estimated'}
                </p>
              </div>
              {project.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Notes</label>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {project.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectProfileTab;