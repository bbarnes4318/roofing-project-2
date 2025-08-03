import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowImportService } from '../../services/api';
import { ArrowUpTrayIcon, DocumentTextIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const WorkflowImportPage = ({ projects = [], onImportComplete }) => {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState('upload'); // upload, preview, mapping, confirm
  const [uploadedFile, setUploadedFile] = useState(null);
  const [importId, setImportId] = useState(null);
  const [selectedProject, setSelectedProject] = useState('');
  const [startingPhase, setStartingPhase] = useState('LEAD');
  const [clearExisting, setClearExisting] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [fieldMapping, setFieldMapping] = useState({
    phase: 'phase',
    section: 'section',
    lineItem: 'line_item'
  });

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return await workflowImportService.uploadFile(formData);
    },
    onSuccess: (data) => {
      setImportId(data.data.importId);
      setPreviewData(data.data);
      setCurrentStep('preview');
    },
    onError: (error) => {
      alert(`Upload failed: ${error.response?.data?.message || error.message}`);
    }
  });

  // Import confirmation mutation
  const confirmMutation = useMutation({
    mutationFn: async (params) => {
      return await workflowImportService.confirmImport(params.importId, {
        projectId: params.projectId,
        startingPhase: params.startingPhase,
        clearExisting: params.clearExisting
      });
    },
    onSuccess: (data) => {
      alert('Workflow imported successfully!');
      queryClient.invalidateQueries(['projects']);
      queryClient.invalidateQueries(['workflows']);
      if (onImportComplete) {
        onImportComplete(data.data);
      }
      // Reset state
      setCurrentStep('upload');
      setUploadedFile(null);
      setImportId(null);
      setPreviewData(null);
    },
    onError: (error) => {
      alert(`Import failed: ${error.response?.data?.message || error.message}`);
    }
  });

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const validExtensions = ['.xlsx', '.xls', '.csv'];
      const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      if (!validExtensions.includes(fileExt)) {
        alert('Invalid file format. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.');
        return;
      }
      
      setUploadedFile(file);
      uploadMutation.mutate(file);
    }
  };

  const handleConfirmImport = () => {
    if (!selectedProject) {
      alert('Please select a project to import the workflow into.');
      return;
    }
    
    confirmMutation.mutate({
      importId,
      projectId: selectedProject,
      startingPhase,
      clearExisting
    });
  };

  const downloadTemplate = (format) => {
    workflowImportService.downloadTemplate(format);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg">
          {/* Header */}
          <div className="border-b px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Import Workflow Data</h1>
            <p className="mt-1 text-sm text-gray-600">
              Upload an Excel or CSV file with Phase, Section, and Line Item data
            </p>
          </div>

          {/* Progress Steps */}
          <div className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div className={`flex items-center ${currentStep === 'upload' ? 'text-blue-600' : 'text-gray-400'}`}>
                <span className="flex items-center justify-center w-8 h-8 border-2 rounded-full">1</span>
                <span className="ml-2 font-medium">Upload File</span>
              </div>
              <div className="flex-1 h-0.5 mx-4 bg-gray-300"></div>
              <div className={`flex items-center ${currentStep === 'preview' ? 'text-blue-600' : 'text-gray-400'}`}>
                <span className="flex items-center justify-center w-8 h-8 border-2 rounded-full">2</span>
                <span className="ml-2 font-medium">Preview & Validate</span>
              </div>
              <div className="flex-1 h-0.5 mx-4 bg-gray-300"></div>
              <div className={`flex items-center ${currentStep === 'mapping' ? 'text-blue-600' : 'text-gray-400'}`}>
                <span className="flex items-center justify-center w-8 h-8 border-2 rounded-full">3</span>
                <span className="ml-2 font-medium">Configure Import</span>
              </div>
              <div className="flex-1 h-0.5 mx-4 bg-gray-300"></div>
              <div className={`flex items-center ${currentStep === 'confirm' ? 'text-blue-600' : 'text-gray-400'}`}>
                <span className="flex items-center justify-center w-8 h-8 border-2 rounded-full">4</span>
                <span className="ml-2 font-medium">Confirm</span>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-6">
            {currentStep === 'upload' && (
              <div className="space-y-6">
                {/* Download Templates */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">Download Template</h3>
                  <p className="text-sm text-blue-700 mb-3">
                    Use our template to ensure your data is formatted correctly
                  </p>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => downloadTemplate('xlsx')}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <DocumentTextIcon className="w-4 h-4 inline mr-2" />
                      Excel Template
                    </button>
                    <button
                      onClick={() => downloadTemplate('csv')}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      <DocumentTextIcon className="w-4 h-4 inline mr-2" />
                      CSV Template
                    </button>
                  </div>
                </div>

                {/* Upload Area */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <ArrowUpTrayIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <label className="cursor-pointer">
                    <span className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                      Choose File
                    </span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                  <p className="mt-2 text-sm text-gray-600">
                    or drag and drop your Excel/CSV file here
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Supported formats: .xlsx, .xls, .csv (max 10MB)
                  </p>
                </div>

                {/* Requirements */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-medium text-yellow-900 mb-2">
                    <ExclamationTriangleIcon className="w-5 h-5 inline mr-2" />
                    File Requirements
                  </h3>
                  <ul className="text-sm text-yellow-700 space-y-1 ml-7">
                    <li>• Must contain headers: Phase, Section, Line Item</li>
                    <li>• Optional headers: Description, Responsible Role, Estimated Duration, Alert Priority</li>
                    <li>• Phases must be: LEAD, PROSPECT, APPROVED, EXECUTION, SUPPLEMENT, or COMPLETION</li>
                    <li>• No empty rows between data</li>
                  </ul>
                </div>
              </div>
            )}

            {currentStep === 'preview' && previewData && (
              <div className="space-y-6">
                {/* File Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">File Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">File Name</p>
                      <p className="font-medium">{previewData.fileName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Rows</p>
                      <p className="font-medium">{previewData.totalRows}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Valid Rows</p>
                      <p className="font-medium text-green-600">{previewData.validRows}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Error Rows</p>
                      <p className="font-medium text-red-600">{previewData.errorRows}</p>
                    </div>
                  </div>
                </div>

                {/* Data Preview */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Data Preview (First 10 Rows)</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phase</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Section</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Line Item</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {previewData.preview.map((row, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 text-sm text-gray-900">{row.rowNumber}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{row.phase}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{row.section}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{row.lineItem}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{row.responsibleRole}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Errors */}
                {previewData.errors && previewData.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="font-medium text-red-900 mb-2">
                      <XCircleIcon className="w-5 h-5 inline mr-2" />
                      Validation Errors
                    </h3>
                    <ul className="text-sm text-red-700 space-y-1">
                      {previewData.errors.map((error, index) => (
                        <li key={index}>Row {error.rowNumber}: {error.error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep('upload')}
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setCurrentStep('mapping')}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    disabled={previewData.validRows === 0}
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {currentStep === 'mapping' && (
              <div className="space-y-6">
                {/* Project Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Target Project
                  </label>
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">-- Select a Project --</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.projectNumber} - {project.projectName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Starting Phase */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Starting Phase
                  </label>
                  <select
                    value={startingPhase}
                    onChange={(e) => setStartingPhase(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="LEAD">Lead</option>
                    <option value="PROSPECT">Prospect</option>
                    <option value="APPROVED">Approved</option>
                    <option value="EXECUTION">Execution</option>
                    <option value="SUPPLEMENT">Supplement</option>
                    <option value="COMPLETION">Completion</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    Import will begin from this phase and include all subsequent phases
                  </p>
                </div>

                {/* Clear Existing Option */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="clearExisting"
                    checked={clearExisting}
                    onChange={(e) => setClearExisting(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <label htmlFor="clearExisting" className="ml-2 text-sm text-gray-700">
                    Clear existing workflow data before importing
                  </label>
                </div>

                {/* Warning */}
                {clearExisting && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-700">
                      <ExclamationTriangleIcon className="w-5 h-5 inline mr-2" />
                      Warning: This will permanently delete all existing workflow data for this project
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep('preview')}
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setCurrentStep('confirm')}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    disabled={!selectedProject}
                  >
                    Review Import
                  </button>
                </div>
              </div>
            )}

            {currentStep === 'confirm' && previewData && (
              <div className="space-y-6">
                {/* Import Summary */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-900 mb-3">
                    <CheckCircleIcon className="w-5 h-5 inline mr-2" />
                    Ready to Import
                  </h3>
                  <div className="text-sm text-green-700 space-y-2">
                    <p>• {previewData.validRows} workflow items will be imported</p>
                    <p>• Phases: {previewData.summary.phases.join(', ')}</p>
                    <p>• {previewData.summary.sections} unique sections</p>
                    <p>• Starting from: {startingPhase} phase</p>
                    {clearExisting && <p className="text-yellow-700">• Existing workflow will be cleared</p>}
                  </div>
                </div>

                {/* Selected Project */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Target Project</h4>
                  <p className="text-sm text-gray-700">
                    {projects.find(p => p.id === selectedProject)?.projectNumber} - 
                    {projects.find(p => p.id === selectedProject)?.projectName}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep('mapping')}
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    disabled={confirmMutation.isLoading}
                  >
                    {confirmMutation.isLoading ? 'Importing...' : 'Confirm Import'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowImportPage;