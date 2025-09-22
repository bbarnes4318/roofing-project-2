import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  Squares2X2Icon, 
  ListBulletIcon,
  PlusIcon,
  HeartIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  DocumentTextIcon,
  CalendarIcon,
  UserIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import DocumentCard from '../Documents/DocumentCard';
import DocumentFilters from '../Documents/DocumentFilters';
import DocumentUploadModal from '../Documents/DocumentUploadModal';
import DocumentPreviewModal from '../Documents/DocumentPreviewModal';
import { documentService } from '../../services/documentService';
import { toast } from 'react-hot-toast';

export default function DocumentsResourcesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    fileType: '',
    accessLevel: '',
    isPublic: null,
    isTemplate: null,
    tags: [],
    region: '',
    state: ''
  });
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewDocument, setPreviewDocument] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const queryClient = useQueryClient();

  // Fetch documents
  const { data: documentsData, isLoading, error, refetch } = useQuery({
    queryKey: ['documents', { 
      search: searchTerm, 
      ...filters, 
      sortBy, 
      sortOrder, 
      page: currentPage 
    }],
    queryFn: () => documentService.getDocuments({
      search: searchTerm,
      ...filters,
      sortBy,
      sortOrder,
      page: currentPage,
      limit: 20
    }),
    keepPreviousData: true
  });

  // Fetch categories for filter
  const { data: categoriesData } = useQuery({
    queryKey: ['document-categories'],
    queryFn: documentService.getCategories
  });

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: documentService.toggleFavorite,
    onSuccess: () => {
      queryClient.invalidateQueries(['documents']);
      toast.success('Favorite updated');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update favorite');
    }
  });

  // Download document mutation
  const downloadMutation = useMutation({
    mutationFn: documentService.downloadDocument,
    onSuccess: (data) => {
      // Create download link
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = '';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download started');
    },
    onError: (error) => {
      toast.error(error.message || 'Download failed');
    }
  });

  const handleSearch = useCallback((value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  }, []);

  const handleSortChange = useCallback((field, order) => {
    setSortBy(field);
    setSortOrder(order);
    setCurrentPage(1);
  }, []);

  const handleFavoriteToggle = useCallback((documentId) => {
    toggleFavoriteMutation.mutate(documentId);
  }, [toggleFavoriteMutation]);

  const handleDownload = useCallback((documentId) => {
    downloadMutation.mutate(documentId);
  }, [downloadMutation]);

  const handlePreview = useCallback((document) => {
    setPreviewDocument(document);
  }, []);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const documents = documentsData?.data?.documents || [];
  const pagination = documentsData?.data?.pagination || {};

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Error loading documents</div>
          <button 
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Documents & Resources</h1>
                <p className="mt-2 text-gray-600">
                  Access contracts, warranties, forms, and project documents
                </p>
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Upload Document
              </button>
            </div>

            {/* Search and Controls */}
            <div className="mt-6 flex flex-col sm:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <FunnelIcon className="w-5 h-5 mr-2" />
                Filters
              </button>

              {/* View Toggle */}
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <Squares2X2Icon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <ListBulletIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Sort Dropdown */}
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  handleSortChange(field, order);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="title-asc">Title A-Z</option>
                <option value="title-desc">Title Z-A</option>
                <option value="downloadCount-desc">Most Downloaded</option>
                <option value="fileSize-desc">Largest Files</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Filters */}
          <div className={`w-64 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <DocumentFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              categories={categoriesData?.data || []}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {isLoading ? 'Loading...' : `${pagination.total || 0} documents found`}
                </h2>
                {searchTerm && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    "{searchTerm}"
                  </span>
                )}
              </div>
            </div>

            {/* Documents Grid/List */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-sm border animate-pulse">
                    <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                    <div className="p-4">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded mb-4"></div>
                      <div className="flex justify-between">
                        <div className="h-3 bg-gray-200 rounded w-16"></div>
                        <div className="h-3 bg-gray-200 rounded w-12"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12">
                <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm || Object.values(filters).some(f => f) 
                    ? 'Try adjusting your search or filters'
                    : 'Get started by uploading your first document'
                  }
                </p>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Upload Document
                </button>
              </div>
            ) : (
              <>
                <div className={
                  viewMode === 'grid' 
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                    : 'space-y-4'
                }>
                  {documents.map((document) => (
                    <DocumentCard
                      key={document.id}
                      document={document}
                      viewMode={viewMode}
                      onFavoriteToggle={handleFavoriteToggle}
                      onDownload={handleDownload}
                      onPreview={handlePreview}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="mt-8 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                      {pagination.total} results
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page <= 1}
                        className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      {[...Array(pagination.pages)].map((_, i) => (
                        <button
                          key={i + 1}
                          onClick={() => handlePageChange(i + 1)}
                          className={`px-3 py-2 border rounded-lg ${
                            pagination.page === i + 1
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page >= pagination.pages}
                        className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showUploadModal && (
        <DocumentUploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            queryClient.invalidateQueries(['documents']);
            toast.success('Document uploaded successfully');
          }}
        />
      )}

      {previewDocument && (
        <DocumentPreviewModal
          document={previewDocument}
          onClose={() => setPreviewDocument(null)}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
}
