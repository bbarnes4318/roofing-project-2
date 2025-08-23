import React from 'react';

const ProjectDocumentsPage = ({ project, onBack, colorMode }) => {
    return (
        <div className="p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Project Documents</h2>
                <p className="text-gray-600">Manage documents and files for {project?.name || project?.projectName || 'this project'}</p>
            </div>

            <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Document Management</h3>
                <p className="text-gray-500 mb-4">Upload and manage project documents, contracts, and files.</p>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Upload Documents
                </button>
            </div>

            {/* Placeholder for future document list */}
            <div className="space-y-4">
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8">
                    <div className="text-center">
                        <p className="text-gray-500">No documents uploaded yet</p>
                        <p className="text-sm text-gray-400 mt-1">Documents will appear here once uploaded</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDocumentsPage;
