import React, { useState } from 'react';
import { 
  DocumentArrowUpIcon, 
  DocumentArrowDownIcon, 
  TableCellsIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CloudIcon
} from '@heroicons/react/24/outline';

const ExcelDataManagerPage = ({ colorMode }) => {
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState('');

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadFile(file);
      setError('');
      setUploadResult(null);
    }
  };

  // Handle Excel upload to DigitalOcean database
  const handleUpload = async () => {
    if (!uploadFile) {
      setError('Please select an Excel file first');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await fetch('/api/excel-data/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      setUploadResult(data.data);
      setUploadFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('excel-file-input');
      if (fileInput) fileInput.value = '';

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Download Excel template
  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/excel-data/template', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'project-data-template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download template: ' + err.message);
    }
  };

  // Export current database to Excel
  const exportDatabase = async () => {
    try {
      const response = await fetch('/api/excel-data/export', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `projects-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to export data: ' + err.message);
    }
  };

  return (
    <div className={`min-h-screen p-6 ${colorMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${colorMode ? 'text-white' : 'text-gray-900'} mb-2`}>
            Excel Data Manager
          </h1>
          <p className={`text-lg ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Directly control your project data with Excel integration to DigitalOcean PostgreSQL
          </p>
        </div>

        {/* Database Connection Status */}
        <div className={`mb-6 p-4 rounded-lg border ${colorMode ? 'bg-gray-800 border-gray-700' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-center gap-3">
            <CloudIcon className="w-6 h-6 text-green-500" />
            <span className={`font-semibold ${colorMode ? 'text-green-400' : 'text-green-800'}`}>
              Connected to DigitalOcean PostgreSQL Database
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Upload Section */}
          <div className={`p-6 rounded-xl border ${colorMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-lg`}>
            <h2 className={`text-xl font-semibold ${colorMode ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
              <DocumentArrowUpIcon className="w-6 h-6 text-blue-500" />
              Upload Project Data
            </h2>
            
            <div className="space-y-4">
              {/* File Upload Area */}
              <div className={`border-2 border-dashed rounded-lg p-6 text-center ${
                uploadFile 
                  ? colorMode ? 'border-green-500 bg-green-900/20' : 'border-green-400 bg-green-50'
                  : colorMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-50'
              }`}>
                {uploadFile ? (
                  <div className="space-y-2">
                    <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto" />
                    <p className={`font-medium ${colorMode ? 'text-green-400' : 'text-green-800'}`}>
                      {uploadFile.name}
                    </p>
                    <p className={`text-sm ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <TableCellsIcon className={`w-12 h-12 mx-auto ${colorMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    <div>
                      <p className={`font-medium ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                        Choose Excel File
                      </p>
                      <p className={`text-sm ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        .xlsx or .xls files only
                      </p>
                    </div>
                  </div>
                )}
                
                <input
                  id="excel-file-input"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <label
                  htmlFor="excel-file-input"
                  className={`inline-block mt-4 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                    colorMode 
                      ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {uploadFile ? 'Choose Different File' : 'Select Excel File'}
                </label>
              </div>

              {/* Upload Button */}
              <button
                onClick={handleUpload}
                disabled={!uploadFile || isUploading}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                  !uploadFile || isUploading
                    ? colorMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : colorMode ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {isUploading ? 'Syncing to DigitalOcean...' : 'Upload to Database'}
              </button>
            </div>
          </div>

          {/* Download/Export Section */}
          <div className={`p-6 rounded-xl border ${colorMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-lg`}>
            <h2 className={`text-xl font-semibold ${colorMode ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
              <DocumentArrowDownIcon className="w-6 h-6 text-green-500" />
              Download & Export
            </h2>
            
            <div className="space-y-4">
              {/* Template Download */}
              <div className={`p-4 rounded-lg ${colorMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <h3 className={`font-medium ${colorMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                  Excel Template
                </h3>
                <p className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'} mb-3`}>
                  Download the Excel template with all required fields and sample data
                </p>
                <button
                  onClick={downloadTemplate}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                    colorMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  Download Template
                </button>
              </div>

              {/* Database Export */}
              <div className={`p-4 rounded-lg ${colorMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <h3 className={`font-medium ${colorMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                  Export Database
                </h3>
                <p className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'} mb-3`}>
                  Export all current project data from DigitalOcean to Excel
                </p>
                <button
                  onClick={exportDatabase}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                    colorMode ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  Export to Excel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className={`mt-6 p-4 rounded-lg border ${colorMode ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
              <span className={`font-medium ${colorMode ? 'text-red-400' : 'text-red-800'}`}>
                {error}
              </span>
            </div>
          </div>
        )}

        {/* Upload Results */}
        {uploadResult && (
          <div className={`mt-6 p-6 rounded-xl border ${colorMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-lg`}>
            <h3 className={`text-lg font-semibold ${colorMode ? 'text-white' : 'text-gray-900'} mb-4`}>
              Upload Results
            </h3>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className={`text-center p-3 rounded-lg ${colorMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                <p className={`text-2xl font-bold ${colorMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  {uploadResult.total}
                </p>
                <p className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Total</p>
              </div>
              <div className={`text-center p-3 rounded-lg ${colorMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
                <p className={`text-2xl font-bold ${colorMode ? 'text-green-400' : 'text-green-600'}`}>
                  {uploadResult.successful}
                </p>
                <p className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Successful</p>
              </div>
              <div className={`text-center p-3 rounded-lg ${colorMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
                <p className={`text-2xl font-bold ${colorMode ? 'text-red-400' : 'text-red-600'}`}>
                  {uploadResult.failed}
                </p>
                <p className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Failed</p>
              </div>
            </div>

            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <div className={`mt-4 p-4 rounded-lg ${colorMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
                <h4 className={`font-medium ${colorMode ? 'text-red-400' : 'text-red-800'} mb-2`}>
                  Errors:
                </h4>
                <div className="space-y-1">
                  {uploadResult.errors.slice(0, 5).map((error, index) => (
                    <p key={index} className={`text-sm ${colorMode ? 'text-red-300' : 'text-red-700'}`}>
                      Row {error.row}: {error.error}
                    </p>
                  ))}
                  {uploadResult.errors.length > 5 && (
                    <p className={`text-sm ${colorMode ? 'text-red-300' : 'text-red-700'}`}>
                      ... and {uploadResult.errors.length - 5} more errors
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className={`mt-8 p-6 rounded-xl border ${colorMode ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-200'}`}>
          <h3 className={`text-lg font-semibold ${colorMode ? 'text-white' : 'text-blue-900'} mb-4`}>
            How to Use Excel Data Manager
          </h3>
          <div className="space-y-3">
            <div className="flex gap-3">
              <span className={`flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-bold flex items-center justify-center`}>1</span>
              <p className={`${colorMode ? 'text-gray-300' : 'text-blue-800'}`}>
                Download the Excel template to see the required format and fields
              </p>
            </div>
            <div className="flex gap-3">
              <span className={`flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-bold flex items-center justify-center`}>2</span>
              <p className={`${colorMode ? 'text-gray-300' : 'text-blue-800'}`}>
                Fill in your project data using the same column names and formats
              </p>
            </div>
            <div className="flex gap-3">
              <span className={`flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-bold flex items-center justify-center`}>3</span>
              <p className={`${colorMode ? 'text-gray-300' : 'text-blue-800'}`}>
                Upload your Excel file - data will sync directly to DigitalOcean PostgreSQL
              </p>
            </div>
            <div className="flex gap-3">
              <span className={`flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-bold flex items-center justify-center`}>4</span>
              <p className={`${colorMode ? 'text-gray-300' : 'text-blue-800'}`}>
                Changes appear immediately on all screens - Dashboard, Projects, etc.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExcelDataManagerPage;

