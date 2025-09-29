import React, { useState, useEffect } from 'react';
import { FaUpload, FaDownload, FaTable, FaFileExcel, FaDatabase, FaInfoCircle, FaCheck, FaTimes, FaSpinner } from 'react-icons/fa';
import { API_BASE_URL } from '../../services/api';

const CompleteExcelDataManager = ({ colorMode = false }) => {
  // State management
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadResults, setUploadResults] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [autoDetect, setAutoDetect] = useState(true);
  const [showFieldInfo, setShowFieldInfo] = useState(false);
  const [selectedTableInfo, setSelectedTableInfo] = useState(null);
  const [expandedSheets, setExpandedSheets] = useState({});

  // Fetch all tables on component mount
  useEffect(() => {
    fetchTables();
  }, []);

  const getAuthToken = () =>
    sessionStorage.getItem('authToken') ||
    localStorage.getItem('authToken') ||
    sessionStorage.getItem('token') ||
    localStorage.getItem('token');

  const fetchTables = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/complete-excel-data/tables`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tables');
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error('Server returned non-JSON response (likely a proxy or auth redirect).');
      }
      const data = await response.json();
      setTables(data.data.tables);
      console.log('📋 Loaded tables:', data.data.tables.length);
    } catch (err) {
      console.error('Error fetching tables:', err);
      setError('Failed to load database tables: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadFile(file);
      setError('');
      setUploadResults(null);
      setSuccess('');
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      setError('Please select a file first');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      if (selectedTable && !autoDetect) {
        formData.append('tableName', selectedTable);
      }
      formData.append('autoDetect', autoDetect.toString());

      const response = await fetch(`${API_BASE_URL}/complete-excel-data/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: formData
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error('Server returned non-JSON response for upload.');
      }
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      setUploadResults(data.data);
      setSuccess(`Upload completed: ${data.data.overall.totalSuccessful}/${data.data.overall.totalRecords} records processed. Note: Existing records with duplicate unique fields (project numbers, emails) will be updated.`);
      setUploadFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('complete-excel-file-input');
      if (fileInput) fileInput.value = '';

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload failed');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = async (tableName = null) => {
    try {
      const endpoint = tableName 
        ? `${API_BASE_URL}/complete-excel-data/template/${tableName}`
        : `${API_BASE_URL}/complete-excel-data/template/all`;

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = tableName 
        ? `${tableName}-template.xlsx`
        : 'complete-database-template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(`Template downloaded: ${tableName || 'Complete database'}`);
    } catch (err) {
      setError('Failed to download template: ' + err.message);
    }
  };

  const exportData = async (tableName = null) => {
    try {
      setIsLoading(true);
      const endpoint = tableName 
        ? `${API_BASE_URL}/complete-excel-data/export/${tableName}`
        : `${API_BASE_URL}/complete-excel-data/export/all`;

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = tableName 
        ? `${tableName}-export.xlsx`
        : 'complete-database-export.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(`Data exported: ${tableName || 'Complete database'}`);
    } catch (err) {
      setError('Failed to export data: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const showTableDetails = (table) => {
    setSelectedTableInfo(table);
    setShowFieldInfo(true);
  };

  const toggleSheetExpand = (sheetName) => {
    setExpandedSheets(prev => ({ ...prev, [sheetName]: !prev[sheetName] }));
  };

  return (
    <div className={`space-y-6 ${colorMode ? 'text-gray-100' : 'text-gray-800'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FaDatabase className="text-2xl text-blue-500" />
          <div>
            <h3 className="text-xl font-bold">Complete Database Manager</h3>
            <p className={`text-sm ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Upload, download, and manage data for all {tables.length} database tables
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-sm ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Total Tables: {tables.length} | Total Fields: {tables.reduce((sum, t) => sum + t.totalFields, 0)}
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center">
          <FaTimes className="mr-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center">
          <FaCheck className="mr-2" />
          {success}
        </div>
      )}

      {/* Upload Section */}
      <div className={`border rounded-lg p-6 ${colorMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-white'}`}>
        <h4 className="text-lg font-semibold mb-4 flex items-center">
          <FaUpload className="mr-2 text-blue-500" />
          Upload Data
        </h4>
        
        <div className="space-y-4">
          {/* Auto-detect toggle */}
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoDetect}
                onChange={(e) => setAutoDetect(e.target.checked)}
                className="mr-2"
              />
              Auto-detect table from file
            </label>
          </div>

          {/* Manual table selection */}
          {!autoDetect && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Target Table
              </label>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className={`w-full p-2 border rounded-md ${
                  colorMode 
                    ? 'bg-gray-700 border-gray-600 text-gray-100' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="">Select a table...</option>
                {tables.map(table => (
                  <option key={table.name} value={table.name}>
                    {table.displayName} ({table.uploadableFields} uploadable fields)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* File selection */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Select File (.xlsx, .xls, .csv)
            </label>
            <input
              type="file"
              id="complete-excel-file-input"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className={`w-full p-2 border rounded-md ${
                colorMode 
                  ? 'bg-gray-700 border-gray-600 text-gray-100' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
            {uploadFile && (
              <div className="mt-2 text-sm text-green-600 flex items-center">
                <FaFileExcel className="mr-1" />
                {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </div>

          {/* Upload button */}
          <button
            onClick={handleUpload}
            disabled={!uploadFile || isLoading}
            className={`w-full py-2 px-4 rounded-md font-medium flex items-center justify-center ${
              !uploadFile || isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-[var(--color-primary-blueprint-blue)]'
            }`}
          >
            {isLoading ? (
              <>
                <FaSpinner className="animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <FaUpload className="mr-2" />
                Upload Data
              </>
            )}
          </button>
        </div>
      </div>

      {/* Upload Results */}
      {uploadResults && (
        <div className={`border rounded-lg p-6 ${colorMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-white'}`}>
          <h4 className="text-lg font-semibold mb-4">Upload Results</h4>
          
          {/* Overall stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className={`p-3 rounded ${colorMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="text-2xl font-bold text-blue-500">{uploadResults.overall.totalSheets}</div>
              <div className="text-sm">Sheets Processed</div>
            </div>
            <div className={`p-3 rounded ${colorMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="text-2xl font-bold text-gray-600">{uploadResults.overall.totalRecords}</div>
              <div className="text-sm">Total Records</div>
            </div>
            <div className={`p-3 rounded ${colorMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="text-2xl font-bold text-green-500">{uploadResults.overall.totalSuccessful}</div>
              <div className="text-sm">Successful</div>
            </div>
            <div className={`p-3 rounded ${colorMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="text-2xl font-bold text-red-500">{uploadResults.overall.totalFailed}</div>
              <div className="text-sm">Failed</div>
            </div>
          </div>

          {/* Sheet details */}
          {Object.entries(uploadResults.sheetResults || {}).length > 0 && (
            <div>
              <h5 className="font-medium mb-2">Sheet Details:</h5>
              <div className="space-y-2">
                {Object.entries(uploadResults.sheetResults).map(([sheetName, result]) => (
                  <div key={sheetName} className={`p-3 border rounded ${colorMode ? 'border-gray-600' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleSheetExpand(sheetName)}
                          className={`px-2 py-1 text-xs rounded ${colorMode ? 'bg-gray-700 text-gray-100' : 'bg-gray-100 text-gray-700'}`}
                        >
                          {expandedSheets[sheetName] ? 'Hide Details' : 'View Details'}
                        </button>
                        <span className="font-medium">{sheetName}</span>
                      </div>
                      <span className="text-sm">→ {result.targetTable}</span>
                    </div>
                    <div className="text-sm flex justify-between">
                      <span className="text-green-600">✓ {result.successful} successful</span>
                      <span className="text-red-600">✗ {result.failed} failed</span>
                    </div>

                    {expandedSheets[sheetName] && (
                      <div className={`mt-3 text-sm ${colorMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        {Array.isArray(result.transformWarnings) && result.transformWarnings.length > 0 && (
                          <div className="mb-2">
                            <div className="font-medium mb-1">Transform warnings:</div>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {result.transformWarnings.map((w, idx) => (
                                <div key={idx} className={`${colorMode ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-50 text-yellow-700'} p-2 rounded`}>
                                  {w}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {Array.isArray(result.errors) && result.errors.length > 0 && (
                          <div>
                            <div className="font-medium mb-1 text-red-600">Row errors:</div>
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                              {result.errors.map((e, idx) => (
                                <div key={idx} className={`${colorMode ? 'bg-red-900 text-red-200' : 'bg-red-50 text-red-700'} p-2 rounded`}>
                                  {e.row ? `Row ${e.row}: ` : ''}{e.error}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Errors */}
          {uploadResults.overall.errors && uploadResults.overall.errors.length > 0 && (
            <div className="mt-4">
              <h5 className="font-medium mb-2 text-red-600">Errors:</h5>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {uploadResults.overall.errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {error.sheet}: {error.error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Templates Section */}
      <div className={`border rounded-lg p-6 ${colorMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-white'}`}>
        <h4 className="text-lg font-semibold mb-4 flex items-center">
          <FaDownload className="mr-2 text-green-500" />
          Download Templates & Export Data
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <button
            onClick={() => downloadTemplate()}
            className="py-2 px-4 bg-green-500 text-white rounded-md hover:bg-[var(--color-success-green)] flex items-center justify-center"
          >
            <FaDownload className="mr-2" />
            Download All Templates
          </button>
          <button
            onClick={() => exportData()}
            className="py-2 px-4 bg-purple-500 text-white rounded-md hover:bg-purple-600 flex items-center justify-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <FaSpinner className="animate-spin mr-2" />
            ) : (
              <FaDownload className="mr-2" />
            )}
            Export All Data
          </button>
        </div>
      </div>

      {/* Tables Overview */}
      <div className={`border rounded-lg p-6 ${colorMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-white'}`}>
        <h4 className="text-lg font-semibold mb-4 flex items-center">
          <FaTable className="mr-2 text-indigo-500" />
          Database Tables ({tables.length})
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map(table => (
            <div 
              key={table.name} 
              className={`border rounded-lg p-4 ${colorMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'} hover:shadow-md transition-all cursor-pointer`}
            >
              <div className="flex justify-between items-start mb-2">
                <h5 className="font-medium text-sm">{table.displayName}</h5>
                <button
                  onClick={() => showTableDetails(table)}
                  className="text-blue-500 hover:text-blue-600"
                >
                  <FaInfoCircle />
                </button>
              </div>
              
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Total Fields:</span>
                  <span className="font-medium">{table.totalFields}</span>
                </div>
                <div className="flex justify-between">
                  <span>Uploadable:</span>
                  <span className="font-medium text-green-600">{table.uploadableFields}</span>
                </div>
                <div className="flex justify-between">
                  <span>Relations:</span>
                  <span className="font-medium text-blue-600">{table.relationships}</span>
                </div>
              </div>

              <div className="flex space-x-2 mt-3">
                <button
                  onClick={() => downloadTemplate(table.name)}
                  className="flex-1 py-1 px-2 text-xs bg-green-500 text-white rounded hover:bg-[var(--color-success-green)]"
                >
                  Template
                </button>
                <button
                  onClick={() => exportData(table.name)}
                  className="flex-1 py-1 px-2 text-xs bg-purple-500 text-white rounded hover:bg-purple-600"
                  disabled={isLoading}
                >
                  Export
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Field Info Modal */}
      {showFieldInfo && selectedTableInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto rounded-lg ${colorMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">{selectedTableInfo.displayName} Fields</h3>
                <button
                  onClick={() => setShowFieldInfo(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes />
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className={`w-full text-sm ${colorMode ? 'text-gray-100' : 'text-gray-800'}`}>
                  <thead>
                    <tr className={`border-b ${colorMode ? 'border-gray-600' : 'border-gray-200'}`}>
                      <th className="text-left p-2">Field Name</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">Required</th>
                      <th className="text-left p-2">Enum Values</th>
                      <th className="text-left p-2">Constraint</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTableInfo.fields.map((field, index) => (
                      <tr key={index} className={`border-b ${colorMode ? 'border-gray-700' : 'border-gray-100'}`}>
                        <td className="p-2 font-medium">{field.name}</td>
                        <td className="p-2">{field.type}</td>
                        <td className="p-2">
                          {field.required ? (
                            <span className="text-red-500">✓</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-2">
                          {field.enumValues ? (
                            <div className="max-w-xs overflow-x-auto">
                              <div className="text-xs space-y-1">
                                {field.enumValues.map(value => (
                                  <span key={value} className="inline-block bg-blue-100 text-blue-800 px-1 rounded mr-1">
                                    {value}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-2 text-xs max-w-xs truncate" title={field.constraint}>
                          {field.constraint}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompleteExcelDataManager;