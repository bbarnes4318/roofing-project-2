import React from 'react';
import { formatPhoneNumber } from '../../utils/helpers';

const ProjectProfileTab = ({ project, colorMode }) => {
  if (!project) {
    return <div className="text-red-600 font-bold p-8">No project data available.</div>;
  }

  const formatAddress = (address) => {
    if (!address) return 'Address not available';
    
    const parts = address.split(',');
    if (parts.length >= 2) {
      return (
        <div>
          <div>{parts[0]?.trim()}</div>
          <div>{parts.slice(1).join(',').trim()}</div>
        </div>
      );
    }
    return address;
  };

  return (
    <div className="p-6 space-y-8">
      {/* Project Overview Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
          Project Information
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Project Info */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Project Number</label>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                #{String(project.projectNumber || project.id || '').padStart(5, '0')}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">Project Name</label>
              <p className="mt-1 text-base text-gray-900">
                {project.name || project.projectName || 'Unnamed Project'}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">Status</label>
              <p className="mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  project.status === 'Active' 
                    ? 'bg-green-100 text-green-800'
                    : project.status === 'Completed'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {project.status || 'Pending'}
                </span>
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">Job Type</label>
              <p className="mt-1 text-base text-gray-900">
                {project.jobType || 'Not specified'}
              </p>
            </div>
          </div>
          
          {/* Dates and Budget */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Start Date</label>
              <p className="mt-1 text-base text-gray-900">
                {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Not set'}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">End Date</label>
              <p className="mt-1 text-base text-gray-900">
                {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Not set'}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">Budget</label>
              <p className="mt-1 text-base text-gray-900">
                {project.budget ? `$${project.budget.toLocaleString()}` : 'Not set'}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">Priority</label>
              <p className="mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  project.priority === 'High'
                    ? 'bg-red-100 text-red-800'
                    : project.priority === 'Medium'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {project.priority || 'Low'}
                </span>
              </p>
            </div>
          </div>
        </div>
        
        {project.description && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <label className="text-sm font-medium text-gray-600">Description</label>
            <p className="mt-2 text-base text-gray-700 leading-relaxed">
              {project.description}
            </p>
          </div>
        )}
      </div>

      {/* Customer Information Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
          Customer Information
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Primary Customer */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Primary Customer</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Name</label>
                <p className="mt-1 text-base font-semibold text-gray-900">
                  {project.customer?.primaryName || project.customer?.name || project.clientName || 'Not provided'}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">Phone</label>
                <p className="mt-1">
                  {project.customer?.primaryPhone || project.customer?.phone || project.clientPhone ? (
                    <a 
                      href={`tel:${(project.customer?.primaryPhone || project.customer?.phone || project.clientPhone).replace(/[^\d+]/g, '')}`}
                      className="text-base text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {formatPhoneNumber(project.customer?.primaryPhone || project.customer?.phone || project.clientPhone)}
                    </a>
                  ) : (
                    <span className="text-base text-gray-500">Not provided</span>
                  )}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">Email</label>
                <p className="mt-1">
                  {project.customer?.primaryEmail || project.customer?.email || project.clientEmail ? (
                    <a 
                      href={`mailto:${project.customer?.primaryEmail || project.customer?.email || project.clientEmail}`}
                      className="text-base text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {project.customer?.primaryEmail || project.customer?.email || project.clientEmail}
                    </a>
                  ) : (
                    <span className="text-base text-gray-500">Not provided</span>
                  )}
                </p>
              </div>
            </div>
          </div>
          
          {/* Secondary Customer */}
          {(project.customer?.secondaryName || project.customer?.secondaryPhone || project.customer?.secondaryEmail) && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Secondary Customer</h3>
              <div className="space-y-3">
                {project.customer?.secondaryName && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Name</label>
                    <p className="mt-1 text-base font-semibold text-gray-900">
                      {project.customer.secondaryName}
                    </p>
                  </div>
                )}
                
                {project.customer?.secondaryPhone && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone</label>
                    <p className="mt-1">
                      <a 
                        href={`tel:${project.customer.secondaryPhone.replace(/[^\d+]/g, '')}`}
                        className="text-base text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {formatPhoneNumber(project.customer.secondaryPhone)}
                      </a>
                    </p>
                  </div>
                )}
                
                {project.customer?.secondaryEmail && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p className="mt-1">
                      <a 
                        href={`mailto:${project.customer.secondaryEmail}`}
                        className="text-base text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {project.customer.secondaryEmail}
                      </a>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Project Address */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <label className="text-sm font-medium text-gray-600">Project Address</label>
          <div className="mt-2 text-base text-gray-700">
            {formatAddress(project.customer?.address || project.clientAddress || project.address)}
          </div>
        </div>
      </div>

      {/* Team Information Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
          Project Team
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { label: 'Project Manager', value: project.projectManager?.name || project.projectManager || 'Not assigned' },
            { label: 'Field Director', value: project.fieldDirector?.name || project.fieldDirector || 'Not assigned' },
            { label: 'Sales Representative', value: project.salesRep?.name || project.salesRep || 'Not assigned' },
            { label: 'Quality Inspector', value: project.qualityInspector?.name || project.qualityInspector || 'Not assigned' },
            { label: 'Admin Assistant', value: project.adminAssistant?.name || project.adminAssistant || 'Not assigned' },
          ].map((role) => (
            <div key={role.label}>
              <label className="text-sm font-medium text-gray-600">{role.label}</label>
              <p className="mt-1 text-base text-gray-900">
                {role.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProjectProfileTab;