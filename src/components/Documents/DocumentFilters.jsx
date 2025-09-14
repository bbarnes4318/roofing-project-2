import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const DocumentFilters = ({ filters, onFilterChange, categories = [] }) => {
  const fileTypes = [
    { value: 'CONTRACT', label: 'Contract', count: 0 },
    { value: 'WARRANTY', label: 'Warranty', count: 0 },
    { value: 'PERMIT', label: 'Permit', count: 0 },
    { value: 'INVOICE', label: 'Invoice', count: 0 },
    { value: 'PHOTO', label: 'Photo', count: 0 },
    { value: 'REPORT', label: 'Report', count: 0 },
    { value: 'FORM', label: 'Form', count: 0 },
    { value: 'CHECKLIST', label: 'Checklist', count: 0 },
    { value: 'MANUAL', label: 'Manual', count: 0 },
    { value: 'OTHER', label: 'Other', count: 0 }
  ];

  const accessLevels = [
    { value: 'PUBLIC', label: 'Public', count: 0 },
    { value: 'AUTHENTICATED', label: 'Authenticated', count: 0 },
    { value: 'PRIVATE', label: 'Private', count: 0 },
    { value: 'INTERNAL', label: 'Internal', count: 0 },
    { value: 'ADMIN', label: 'Admin', count: 0 }
  ];

  const regions = [
    { value: 'north', label: 'North Region' },
    { value: 'south', label: 'South Region' },
    { value: 'east', label: 'East Region' },
    { value: 'west', label: 'West Region' },
    { value: 'central', label: 'Central Region' }
  ];

  const states = [
    { value: 'CO', label: 'Colorado' },
    { value: 'CA', label: 'California' },
    { value: 'TX', label: 'Texas' },
    { value: 'FL', label: 'Florida' },
    { value: 'NY', label: 'New York' }
  ];

  const handleFilterChange = (key, value) => {
    onFilterChange({ [key]: value });
  };

  const handleTagToggle = (tag) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    onFilterChange({ tags: newTags });
  };

  const clearAllFilters = () => {
    onFilterChange({
      category: '',
      fileType: '',
      accessLevel: '',
      isPublic: null,
      isTemplate: null,
      tags: [],
      region: '',
      state: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== '' && value !== null && (Array.isArray(value) ? value.length > 0 : true)
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Category
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="category"
                value=""
                checked={filters.category === ''}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">All Categories</span>
            </label>
            {categories.map((category) => (
              <label key={category.category} className="flex items-center">
                <input
                  type="radio"
                  name="category"
                  value={category.category}
                  checked={filters.category === category.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700 capitalize">
                  {category.category.toLowerCase().replace('_', ' ')}
                </span>
                <span className="ml-auto text-xs text-gray-500">
                  ({category.count})
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* File Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            File Type
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="fileType"
                value=""
                checked={filters.fileType === ''}
                onChange={(e) => handleFilterChange('fileType', e.target.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">All Types</span>
            </label>
            {fileTypes.map((type) => (
              <label key={type.value} className="flex items-center">
                <input
                  type="radio"
                  name="fileType"
                  value={type.value}
                  checked={filters.fileType === type.value}
                  onChange={(e) => handleFilterChange('fileType', e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">{type.label}</span>
                <span className="ml-auto text-xs text-gray-500">
                  ({type.count})
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Access Level Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Access Level
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="accessLevel"
                value=""
                checked={filters.accessLevel === ''}
                onChange={(e) => handleFilterChange('accessLevel', e.target.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">All Levels</span>
            </label>
            {accessLevels.map((level) => (
              <label key={level.value} className="flex items-center">
                <input
                  type="radio"
                  name="accessLevel"
                  value={level.value}
                  checked={filters.accessLevel === level.value}
                  onChange={(e) => handleFilterChange('accessLevel', e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">{level.label}</span>
                <span className="ml-auto text-xs text-gray-500">
                  ({level.count})
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Document Type Filters */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Document Type
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.isPublic === true}
                onChange={(e) => handleFilterChange('isPublic', e.target.checked ? true : null)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Public Documents</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.isTemplate === true}
                onChange={(e) => handleFilterChange('isTemplate', e.target.checked ? true : null)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Templates</span>
            </label>
          </div>
        </div>

        {/* Region Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Region
          </label>
          <select
            value={filters.region}
            onChange={(e) => handleFilterChange('region', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Regions</option>
            {regions.map((region) => (
              <option key={region.value} value={region.value}>
                {region.label}
              </option>
            ))}
          </select>
        </div>

        {/* State Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            State
          </label>
          <select
            value={filters.state}
            onChange={(e) => handleFilterChange('state', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All States</option>
            {states.map((state) => (
              <option key={state.value} value={state.value}>
                {state.label}
              </option>
            ))}
          </select>
        </div>

        {/* Popular Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Popular Tags
          </label>
          <div className="flex flex-wrap gap-2">
            {['urgent', 'contract', 'warranty', 'permit', 'inspection', 'estimate', 'invoice', 'photo'].map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagToggle(tag)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filters.tags?.includes(tag)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentFilters;
