import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ProjectDocumentsPage = ({ project, onBack, colorMode }) => {
  const queryClient = useQueryClient();
  
  // Local state for UI
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadCategory, setUploadCategory] = useState('Technical');
  const [uploadDescription, setUploadDescription] = useState('');
  const fileInputRef = useRef(null);
  
  // Fetch documents from database
  const { data: documentsData, isLoading, error } = useQuery({
    queryKey: ['projectDocuments', project?.id],
    queryFn: async () => {
      if (!project?.id) return [];
      const response = await api.get(`/documents/project/${project.id}`);
      return response.data?.data || [];
    },
    enabled: !!project?.id
  });
  
  // Use real documents from database instead of mock data
  const documents = documentsData || [];
  
  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData) => {
      const response = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projectDocuments', project?.id]);
      toast.success('Documents uploaded successfully!');
      setUploadModalOpen(false);
      setSelectedFiles([]);
      setUploadCategory('Technical');
      setUploadDescription('');
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.response?.data?.message || error.message}`);
    }
  });
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (documentId) => {
      const response = await api.delete(`/documents/${documentId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projectDocuments', project?.id]);
      toast.success('Document deleted successfully!');
    },
    onError: (error) => {
      toast.error(`Delete failed: ${error.response?.data?.message || error.message}`);
    }
  });

  const categories = [
    { id: 'All', name: 'All Documents', icon: '📁', count: documents.length },
    { id: 'Legal', name: 'Legal Documents', icon: '⚖️', count: documents.filter(d => d.category === 'Legal').length },
    { id: 'Technical', name: 'Technical Specs', icon: '🔧', count: documents.filter(d => d.category === 'Technical').length },
    { id: 'Safety', name: 'Safety & Compliance', icon: '🛡️', count: documents.filter(d => d.category === 'Safety').length },
    { id: 'Visual', name: 'Photos & Videos', icon: '📸', count: documents.filter(d => d.category === 'Visual').length },
    { id: 'Financial', name: 'Financial Records', icon: '💰', count: documents.filter(d => d.category === 'Financial').length },
    { id: 'Communication', name: 'Communication', icon: '💬', count: documents.filter(d => d.category === 'Communication').length }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved': return '✅ Approved';
      case 'pending': return '⏳ Pending';
      case 'rejected': return '❌ Rejected';
      default: return '❓ Unknown';
    }
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return '📄';
      case 'doc':
      case 'docx': return '📝';
      case 'xls':
      case 'xlsx': return '📊';
      case 'ppt':
      case 'pptx': return '📑';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return '🖼️';
      case 'zip':
      case 'rar': return '📦';
      default: return '📎';
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
  };

  const handleUpload = () => {
    if (selectedFiles.length === 0) return;
    
    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });
    formData.append('projectId', project.id);
    formData.append('category', uploadCategory);
    formData.append('description', uploadDescription || 'No description provided');
    
    uploadMutation.mutate(formData);
  };

  const handleDelete = (documentId) => {
    deleteMutation.mutate(documentId);
  };

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${colorMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 ${colorMode ? 'bg-gray-800 border-b border-gray-700' : 'bg-white border-b border-gray-200'} shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className={`text-xl font-bold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                  Project Documents
                </h1>
                <p className={`text-sm ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>{project?.name || 'Project Name'}</p>
              </div>
            </div>
            
            <button
              onClick={() => setUploadModalOpen(true)}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm transition-colors duration-200 ${
                colorMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              📤 Upload Documents
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className={`relative ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2">🔍</span>
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg transition-colors duration-200 ${
                    colorMode
                      ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="sm:w-64">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg transition-colors duration-200 ${
                  colorMode
                    ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500'
                }`}
              >
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name} ({category.count})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  selectedCategory === category.id
                    ? colorMode
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-blue-600 text-white shadow-lg'
                    : colorMode
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <span className="mr-2">{category.icon}</span>
                {category.name}
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  selectedCategory === category.id
                    ? 'bg-white bg-opacity-20'
                    : colorMode
                      ? 'bg-gray-700'
                      : 'bg-gray-100'
                }`}>
                  {category.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className={`ml-4 text-lg ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Loading documents...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className={`text-center py-12 ${colorMode ? 'text-red-400' : 'text-red-600'}`}>
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold mb-2">Error Loading Documents</h3>
            <p className="mb-4">{error.response?.data?.message || error.message || 'Failed to load documents'}</p>
            <button
              onClick={() => queryClient.invalidateQueries(['projectDocuments', project?.id])}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm bg-red-600 hover:bg-red-700 text-white transition-colors duration-200"
            >
              🔄 Retry
            </button>
          </div>
        )}

        {/* Documents Grid */}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map(doc => (
            <div
              key={doc.id}
              className={`group relative rounded-xl border-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] overflow-hidden ${
                colorMode
                  ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Document Header */}
              <div className={`p-4 border-b ${colorMode ? 'border-gray-700' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{getFileIcon(doc.name)}</span>
                      <h3 className={`text-sm font-bold truncate ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                        {doc.name}
                      </h3>
                    </div>
                    <p className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-600'} line-clamp-2`}>
                      {doc.description}
                    </p>
                  </div>
                  <div className={`ml-2 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(doc.status)}`}>
                    {getStatusText(doc.status)}
                  </div>
                </div>

                {/* Document Info */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className={colorMode ? 'text-gray-400' : 'text-gray-600'}>Size:</span>
                    <span className={colorMode ? 'text-gray-300' : 'text-gray-700'}>{doc.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={colorMode ? 'text-gray-400' : 'text-gray-600'}>Category:</span>
                    <span className={colorMode ? 'text-gray-300' : 'text-gray-700'}>{doc.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={colorMode ? 'text-gray-400' : 'text-gray-600'}>Uploaded by:</span>
                    <span className={colorMode ? 'text-gray-300' : 'text-gray-700'}>{doc.uploadedBy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={colorMode ? 'text-gray-400' : 'text-gray-600'}>Date:</span>
                    <span className={colorMode ? 'text-gray-300' : 'text-gray-700'}>{doc.uploadDate}</span>
                  </div>
                </div>
              </div>

              {/* Document Actions */}
              <div className={`p-4 ${colorMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className="flex gap-2">
                  <button className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-200 ${
                    colorMode
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}>
                    📥 Download
                  </button>
                  <button className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-200 ${
                    colorMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}>
                    👁️ View
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-200 ${
                      colorMode
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                    title="Delete Document"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
            
            {/* Empty State */}
            {filteredDocuments.length === 0 && (
              <div className={`col-span-full text-center py-12 ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <div className="text-6xl mb-4">📁</div>
                <h3 className="text-lg font-semibold mb-2">No documents found</h3>
                <p className="mb-4">No documents match your current search criteria.</p>
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm transition-colors duration-200 ${
                    colorMode
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  📤 Upload Your First Document
                </button>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-xl shadow-xl ${colorMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                Upload Documents
              </h3>
              <button
                onClick={() => setUploadModalOpen(false)}
                className={`p-1 rounded-lg transition-colors duration-200 ${
                  colorMode
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* File Upload */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Select Files
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors duration-200 ${
                    colorMode
                      ? 'border-gray-600 hover:border-gray-500 text-gray-400 hover:text-gray-300'
                      : 'border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-700'
                  }`}
                >
                  <div className="text-3xl mb-2">📤</div>
                  <p className="text-sm">Click to select files or drag and drop</p>
                  <p className="text-xs mt-1">Supports PDF, DOC, XLS, images, and more</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {selectedFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Category Selection */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Category
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg transition-colors duration-200 ${
                    colorMode
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500'
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                >
                  {categories.slice(1).map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Description (Optional)
                </label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Brief description of the documents..."
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg transition-colors duration-200 resize-none ${
                    colorMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setUploadModalOpen(false)}
                  className={`flex-1 px-4 py-2 border rounded-lg text-sm font-medium transition-colors duration-200 ${
                    colorMode
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={selectedFiles.length === 0 || uploadMutation.isPending}
                  className={`flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm transition-colors duration-200 ${
                    selectedFiles.length === 0 || uploadMutation.isPending
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {uploadMutation.isPending ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </span>
                  ) : (
                    `Upload ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDocumentsPage;