import React from 'react';
import { formatPhoneNumber } from '../../utils/helpers';

const ProjectProfileTab = ({ project, colorMode, onProjectSelect }) => {
    if (!project) {
        return <div className="p-6 text-center text-gray-500">No project data available</div>;
    }

    const client = project.client || project.customer || {};
    const contacts = project.contacts || [];

    return (
        <div className="p-6 space-y-6">
            {/* Project Header */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    {project.name || project.projectName || 'Project Profile'}
                </h2>
                
                {/* Project Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Project Information</h3>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-medium text-gray-600">Project Number</label>
                                <p className="text-gray-900">{project.projectNumber || 'Not assigned'}</p>
                            </div>
                            
                            <div>
                                <label className="text-sm font-medium text-gray-600">Status</label>
                                <p className="text-gray-900">{project.status || 'Active'}</p>
                            </div>
                            
                            <div>
                                <label className="text-sm font-medium text-gray-600">Job Type</label>
                                <p className="text-gray-900">{project.jobType || project.type || 'Not specified'}</p>
                            </div>
                            
                            <div>
                                <label className="text-sm font-medium text-gray-600">Priority</label>
                                <p className="text-gray-900">{project.priority || 'Medium'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Client Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Client Information</h3>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-medium text-gray-600">Client Name</label>
                                <p className="text-gray-900">{client.name || project.customerName || 'Not specified'}</p>
                            </div>
                            
                            <div>
                                <label className="text-sm font-medium text-gray-600">Email</label>
                                <p className="text-gray-900">{client.email || 'Not provided'}</p>
                            </div>
                            
                            <div>
                                <label className="text-sm font-medium text-gray-600">Phone</label>
                                <p className="text-gray-900">{formatPhoneNumber(client.phone) || 'Not provided'}</p>
                            </div>
                            
                            <div>
                                <label className="text-sm font-medium text-gray-600">Address</label>
                                <p className="text-gray-900">{project.address || client.address || 'Not specified'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Project Timeline */}
            {(project.startDate || project.endDate) && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Timeline</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-600">Start Date</label>
                            <p className="text-gray-900">{project.startDate || 'Not set'}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-600">End Date</label>
                            <p className="text-gray-900">{project.endDate || 'Not set'}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Project Description */}
            {project.description && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Description</h3>
                    <p className="text-gray-700 leading-relaxed">{project.description}</p>
                </div>
            )}

            {/* Additional Contacts */}
            {contacts && contacts.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Additional Contacts</h3>
                    <div className="space-y-3">
                        {contacts.map((contact, index) => (
                            <div key={index} className="border-l-4 border-blue-500 pl-4">
                                <p className="font-medium text-gray-900">{contact.name}</p>
                                <p className="text-sm text-gray-600">{contact.email}</p>
                                <p className="text-sm text-gray-600">{formatPhoneNumber(contact.phone)}</p>
                                {contact.isPrimary && (
                                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mt-1">
                                        Primary Contact
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectProfileTab;
