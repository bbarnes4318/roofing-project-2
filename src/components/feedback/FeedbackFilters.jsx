import React from 'react';
import { Filter, X, Calendar, Tag, User, AlertCircle } from 'lucide-react';

const FeedbackFilters = ({ filters, onFiltersChange, colorMode }) => {
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'OPEN', label: 'Open' },
    { value: 'IN_REVIEW', label: 'In Review' },
    { value: 'PLANNED', label: 'Planned' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'DONE', label: 'Done' },
    { value: 'CLOSED', label: 'Closed' }
  ];

  const severityOptions = [
    { value: 'all', label: 'All Severity' },
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'CRITICAL', label: 'Critical' }
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'most_voted', label: 'Most Voted' },
    { value: 'most_commented', label: 'Most Commented' },
    { value: 'recent_activity', label: 'Recent Activity' }
  ];

  const dateRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' }
  ];

  const handleFilterChange = (key, value) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      status: 'all',
      severity: 'all',
      tags: [],
      dateRange: 'all',
      sortBy: 'newest'
    });
  };

  const hasActiveFilters = filters.status !== 'all' || 
                          filters.severity !== 'all' || 
                          filters.tags.length > 0 || 
                          filters.dateRange !== 'all' || 
                          filters.sortBy !== 'newest';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
          Filters
        </h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className={`flex items-center space-x-1 text-sm ${colorMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
          >
            <X className="h-4 w-4" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* Status Filter */}
      <div>
        <label className={`block text-sm font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Status
        </label>
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className={`w-full px-3 py-2 rounded-lg border ${
            colorMode 
              ? 'bg-slate-700 border-slate-600 text-white' 
              : 'bg-white border-gray-300 text-gray-900'
          } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Severity Filter */}
      <div>
        <label className={`block text-sm font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Severity
        </label>
        <select
          value={filters.severity}
          onChange={(e) => handleFilterChange('severity', e.target.value)}
          className={`w-full px-3 py-2 rounded-lg border ${
            colorMode 
              ? 'bg-slate-700 border-slate-600 text-white' 
              : 'bg-white border-gray-300 text-gray-900'
          } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
        >
          {severityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Date Range Filter */}
      <div>
        <label className={`block text-sm font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Date Range
        </label>
        <select
          value={filters.dateRange}
          onChange={(e) => handleFilterChange('dateRange', e.target.value)}
          className={`w-full px-3 py-2 rounded-lg border ${
            colorMode 
              ? 'bg-slate-700 border-slate-600 text-white' 
              : 'bg-white border-gray-300 text-gray-900'
          } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
        >
          {dateRangeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Sort By */}
      <div>
        <label className={`block text-sm font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Sort By
        </label>
        <select
          value={filters.sortBy}
          onChange={(e) => handleFilterChange('sortBy', e.target.value)}
          className={`w-full px-3 py-2 rounded-lg border ${
            colorMode 
              ? 'bg-slate-700 border-slate-600 text-white' 
              : 'bg-white border-gray-300 text-gray-900'
          } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Quick Filters */}
      <div>
        <label className={`block text-sm font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Quick Filters
        </label>
        <div className="space-y-2">
          <button
            onClick={() => handleFilterChange('status', 'OPEN')}
            className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors ${
              filters.status === 'OPEN'
                ? colorMode ? 'bg-green-600 text-white' : 'bg-green-500 text-white'
                : colorMode ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Open Issues</span>
          </button>
          
          <button
            onClick={() => handleFilterChange('severity', 'CRITICAL')}
            className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors ${
              filters.severity === 'CRITICAL'
                ? colorMode ? 'bg-red-600 text-white' : 'bg-red-500 text-white'
                : colorMode ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Critical Issues</span>
          </button>
          
          <button
            onClick={() => handleFilterChange('dateRange', 'week')}
            className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors ${
              filters.dateRange === 'week'
                ? colorMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                : colorMode ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span className="text-sm">This Week</span>
          </button>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div>
          <h4 className={`text-sm font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Active Filters
          </h4>
          <div className="flex flex-wrap gap-2">
            {filters.status !== 'all' && (
              <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                colorMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'
              }`}>
                Status: {statusOptions.find(opt => opt.value === filters.status)?.label}
                <button
                  onClick={() => handleFilterChange('status', 'all')}
                  className="ml-1 hover:text-red-300"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            
            {filters.severity !== 'all' && (
              <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                colorMode ? 'bg-orange-600 text-white' : 'bg-orange-100 text-orange-800'
              }`}>
                Severity: {severityOptions.find(opt => opt.value === filters.severity)?.label}
                <button
                  onClick={() => handleFilterChange('severity', 'all')}
                  className="ml-1 hover:text-red-300"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            
            {filters.dateRange !== 'all' && (
              <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                colorMode ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800'
              }`}>
                Date: {dateRangeOptions.find(opt => opt.value === filters.dateRange)?.label}
                <button
                  onClick={() => handleFilterChange('dateRange', 'all')}
                  className="ml-1 hover:text-red-300"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackFilters;
