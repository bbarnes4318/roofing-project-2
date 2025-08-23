import React, { useState } from 'react';

const WorkflowImportPage = () => {
    const [dragOver, setDragOver] = useState(false);

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        // Handle file drop logic here
    };

    return (
        <div className="p-6 space-y-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Workflow Import</h2>
                <p className="text-gray-600">Import workflow data and project templates</p>
            </div>

            {/* Upload Area */}
            <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragOver 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Workflow Files</h3>
                <p className="text-gray-500 mb-4">
                    Drag and drop files here, or click to browse
                </p>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Choose Files
                </button>
            </div>

            {/* Supported Formats */}
            <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Supported Formats</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Excel files (.xlsx, .xls)</li>
                    <li>• CSV files (.csv)</li>
                    <li>• JSON workflow templates (.json)</li>
                </ul>
            </div>

            {/* Recent Imports */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Imports</h3>
                <div className="text-center py-8">
                    <p className="text-gray-500">No recent imports</p>
                    <p className="text-sm text-gray-400 mt-1">Import history will appear here</p>
                </div>
            </div>
        </div>
    );
};

export default WorkflowImportPage;
