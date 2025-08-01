import React, { useState, useMemo, useEffect } from 'react';
import { ClockIcon } from '../common/Icons';
import { projectsService } from '../../services/api';

const ArchivedProjectsPage = ({ colorMode, onProjectSelect }) => {
    const [sortConfig, setSortConfig] = useState({ key: 'archivedAt', direction: 'desc' });
    const [searchTerm, setSearchTerm] = useState('');
    const [filterYear, setFilterYear] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [expanded] = useState(true);
    const [archivedProjects, setArchivedProjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Load archived projects
    useEffect(() => {
        loadArchivedProjects();
    }, []);

    const loadArchivedProjects = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await projectsService.getArchived({ limit: 100 });
            setArchivedProjects(response.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load archived projects');
        } finally {
            setLoading(false);
        }
    };

    // Handle unarchive
    const handleUnarchive = async (project) => {
        try {
            await projectsService.archive(project._id || project.id);
            console.log('✅ Project unarchived successfully');
            // Reload the archived projects list
            loadArchivedProjects();
        } catch (err) {
            console.error('❌ Error unarchiving project:', err);
            setError(err.response?.data?.message || 'Failed to unarchive project');
        }
    };

    // Filter and sort projects
    const filteredProjects = useMemo(() => {
        let filtered = archivedProjects;

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(project => 
                project.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                project.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                project.address?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Year filter
        if (filterYear !== 'all') {
            filtered = filtered.filter(project => {
                const archiveYear = new Date(project.archivedAt || project.endDate).getFullYear().toString();
                return archiveYear === filterYear;
            });
        }

        // Type filter
        if (filterType !== 'all') {
            filtered = filtered.filter(project => project.projectType === filterType);
        }

        // Sort
        filtered.sort((a, b) => {
            let aValue, bValue;
            
            switch (sortConfig.key) {
                case 'projectName':
                    aValue = (a.projectName || '').toLowerCase();
                    bValue = (b.projectName || '').toLowerCase();
                    break;
                case 'customer':
                    aValue = (a.customer?.name || '').toLowerCase();
                    bValue = (b.customer?.name || '').toLowerCase();
                    break;
                case 'projectType':
                    aValue = (a.projectType || '').toLowerCase();
                    bValue = (b.projectType || '').toLowerCase();
                    break;
                case 'budget':
                    aValue = a.budget || 0;
                    bValue = b.budget || 0;
                    break;
                case 'endDate':
                    aValue = new Date(a.endDate);
                    bValue = new Date(b.endDate);
                    break;
                case 'archivedAt':
                    aValue = new Date(a.archivedAt || a.endDate);
                    bValue = new Date(b.archivedAt || b.endDate);
                    break;
                case 'projectManager':
                    aValue = (a.projectManager?.firstName || '').toLowerCase();
                    bValue = (b.projectManager?.firstName || '').toLowerCase();
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [archivedProjects, searchTerm, filterYear, filterType, sortConfig]);

    // Get unique years for filter
    const availableYears = useMemo(() => {
        const years = [...new Set((archivedProjects || []).map(project => 
            new Date(project.archivedAt || project.endDate).getFullYear().toString()
        ))];
        return years.sort((a, b) => b - a);
    }, [archivedProjects]);

    // Get unique project types for filter
    const availableTypes = useMemo(() => {
        const types = [...new Set((archivedProjects || []).map(project => project.projectType))];
        return types.filter(Boolean);
    }, [archivedProjects]);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getProjectTypeColor = (type) => {
        switch (type?.toLowerCase()) {
            case 'roof replacement': return 'bg-gradient-to-r from-blue-500 to-blue-600';
            case 'siding installation': return 'bg-gradient-to-r from-green-500 to-green-600';
            case 'window replacement': return 'bg-gradient-to-r from-purple-500 to-purple-600';
            case 'kitchen remodel': return 'bg-gradient-to-r from-orange-500 to-orange-600';
            case 'bathroom renovation': return 'bg-gradient-to-r from-teal-500 to-teal-600';
            case 'flooring': return 'bg-gradient-to-r from-indigo-500 to-indigo-600';
            case 'painting': return 'bg-gradient-to-r from-pink-500 to-pink-600';
            case 'deck construction': return 'bg-gradient-to-r from-amber-500 to-amber-600';
            default: return 'bg-gradient-to-r from-gray-500 to-gray-600';
        }
    };

    const getProjectTypeTextColor = (type) => {
        switch (type?.toLowerCase()) {
            case 'roof replacement': return 'text-blue-700 dark:text-blue-300';
            case 'siding installation': return 'text-green-700 dark:text-green-300';
            case 'window replacement': return 'text-purple-700 dark:text-purple-300';
            case 'kitchen remodel': return 'text-orange-700 dark:text-orange-300';
            case 'bathroom renovation': return 'text-teal-700 dark:text-teal-300';
            case 'flooring': return 'text-indigo-700 dark:text-indigo-300';
            case 'painting': return 'text-pink-700 dark:text-pink-300';
            case 'deck construction': return 'text-amber-700 dark:text-amber-300';
            default: return 'text-gray-700 dark:text-gray-300';
        }
    };

    const getArchiveBadge = (project) => {
        const archiveDate = new Date(project.archivedAt);
        const now = new Date();
        const daysSinceArchive = Math.floor((now - archiveDate) / (1000 * 60 * 60 * 24));
        
        if (daysSinceArchive <= 30) {
            return { text: 'Recently Archived', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' };
        } else {
            return { text: 'Archived', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' };
        }
    };

    const TableHeader = ({ children, sortKey, className = "" }) => (
        <th 
            className={`px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${className}`}
            onClick={() => handleSort(sortKey)}
        >
            <div className="flex items-center gap-1">
                {children}
                {sortConfig.key === sortKey && (
                    <span className="text-blue-600">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                )}
            </div>
        </th>
    );

    if (loading) {
        return (
            <div className="animate-fade-in w-full max-w-full">
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Loading archived projects...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in w-full max-w-full">
            {/* Header */}
            <div className="mb-6">
                <h1 className={`text-lg font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                    Archived Projects ({archivedProjects.length})
                </h1>
                <p className={`text-sm ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Projects that have been archived and moved out of active management
                </p>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    {error}
                </div>
            )}

            {/* Filters and Search */}
            <div className={`mb-6 p-4 rounded-lg ${colorMode ? 'bg-[#1e293b] border border-[#3b82f6]/20' : 'bg-white border border-gray-200'}`}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search */}
                    <div>
                        <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Search Projects
                        </label>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by name, client, or address..."
                            className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                colorMode 
                                    ? 'bg-[#232b4d] border-[#3b82f6]/30 text-white placeholder-gray-400' 
                                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                            }`}
                        />
                    </div>

                    {/* Year Filter */}
                    <div>
                        <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Archive Year
                        </label>
                        <select
                            value={filterYear}
                            onChange={(e) => setFilterYear(e.target.value)}
                            className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                colorMode 
                                    ? 'bg-[#232b4d] border-[#3b82f6]/30 text-white' 
                                    : 'bg-white border-gray-300 text-gray-900'
                            }`}
                        >
                            <option value="all">All Years</option>
                            {availableYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>

                    {/* Type Filter */}
                    <div>
                        <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Project Type
                        </label>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                colorMode 
                                    ? 'bg-[#232b4d] border-[#3b82f6]/30 text-white' 
                                    : 'bg-white border-gray-300 text-gray-900'
                            }`}
                        >
                            <option value="all">All Types</option>
                            {availableTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    {/* Results Count */}
                    <div className="flex items-end">
                        <div className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {filteredProjects.length} of {archivedProjects.length} projects
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content - Archived Projects Table */}
            <div className={`shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-[8px] overflow-hidden ${colorMode ? 'bg-[#232b4d]/80' : 'bg-white'}`}>
                {/* Table Content */}
                {expanded && (
                    <div className="overflow-x-auto">
                        {filteredProjects.length > 0 ? (
                            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700" role="table">
                                <thead className={`${colorMode ? 'bg-[#1e293b]' : 'bg-gray-50'}`}>
                                    <tr role="row">
                                        <TableHeader sortKey="projectName" className={colorMode ? 'text-gray-200' : 'text-gray-700'}>
                                            Project Name
                                        </TableHeader>
                                        <TableHeader sortKey="customer" className={colorMode ? 'text-gray-200' : 'text-gray-700'}>
                                            Customer
                                        </TableHeader>
                                        <TableHeader sortKey="projectType" className={colorMode ? 'text-gray-200' : 'text-gray-700'}>
                                            Type
                                        </TableHeader>
                                        <TableHeader sortKey="budget" className={colorMode ? 'text-gray-200' : 'text-gray-700'}>
                                            Budget
                                        </TableHeader>
                                        <TableHeader sortKey="archivedAt" className={colorMode ? 'text-gray-200' : 'text-gray-700'}>
                                            Archived Date
                                        </TableHeader>
                                        <TableHeader sortKey="projectManager" className={colorMode ? 'text-gray-200' : 'text-gray-700'}>
                                            Project Manager
                                        </TableHeader>
                                        <th className={`px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider ${colorMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${colorMode ? 'bg-[#1e293b] divide-[#3b82f6]/40' : 'bg-white divide-gray-200'}`}>
                                    {filteredProjects.map((project, index) => {
                                        const archiveBadge = getArchiveBadge(project);
                                        return (
                                            <tr 
                                                key={project._id || project.id}
                                                className={`
                                                    ${index % 2 === 0 ? (colorMode ? 'bg-[#1e293b]' : 'bg-white') : (colorMode ? 'bg-[#232b4d]' : 'bg-gray-50')}
                                                    hover:bg-blue-50 dark:hover:bg-gray-700 hover:shadow-sm transition-all duration-200 cursor-pointer
                                                `}
                                                role="row"
                                                onClick={() => onProjectSelect && onProjectSelect(project, 'Project Workflow', null, 'Archived Projects')}
                                            >
                                                <td className={`px-3 py-3 text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`} role="cell">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 bg-gradient-to-r ${getProjectTypeColor(project.projectType)} rounded-lg flex items-center justify-center text-white font-bold text-xs`}>
                                                            {project.projectType?.charAt(0)?.toUpperCase() || 'P'}
                                                        </div>
                                                        <div>
                                                            <div className="truncate max-w-48" title={project.projectName}>{project.projectName}</div>
                                                            <div className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                                {project.address}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className={`px-3 py-3 text-sm ${colorMode ? 'text-white' : 'text-gray-900'}`} role="cell">
                                                    <div className="font-medium">{project.customer?.name || 'Unknown'}</div>
                                                    <div className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                        {project.customer?.email || 'No email'}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3" role="cell">
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 ${getProjectTypeTextColor(project.projectType)} border`}>
                                                        {project.projectType || 'Unknown'}
                                                    </span>
                                                </td>
                                                <td className={`px-3 py-3 text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`} role="cell">
                                                    {formatCurrency(project.budget || 0)}
                                                </td>
                                                <td className="px-3 py-3" role="cell">
                                                    <div className="flex flex-col gap-1">
                                                        <div className={`text-sm ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                                                            {formatDate(project.archivedAt)}
                                                        </div>
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${archiveBadge.color}`}>
                                                            {archiveBadge.text}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className={`px-3 py-3 text-sm ${colorMode ? 'text-white' : 'text-gray-900'}`} role="cell">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                                                            {project.projectManager?.firstName?.charAt(0) || 'P'}
                                                        </div>
                                                        <span className="font-medium">
                                                            {project.projectManager 
                                                                ? `${project.projectManager.firstName} ${project.projectManager.lastName}` 
                                                                : 'Unknown'
                                                            }
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3" role="cell">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onProjectSelect && onProjectSelect(project, 'Project Workflow', null, 'Archived Projects');
                                                            }}
                                                            className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded transition-all duration-200 ${
                                                                colorMode 
                                                                    ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 border border-blue-400/30 hover:border-blue-400/50' 
                                                                    : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 hover:border-blue-300'
                                                            }`}
                                                        >
                                                            View
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleUnarchive(project);
                                                            }}
                                                            className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded transition-all duration-200 ${
                                                                colorMode 
                                                                    ? 'text-green-400 hover:text-green-300 hover:bg-green-900/20 border border-green-400/30 hover:border-green-400/50' 
                                                                    : 'text-green-600 hover:text-green-700 hover:bg-green-50 border border-green-200 hover:border-green-300'
                                                            }`}
                                                        >
                                                            Unarchive
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-8 text-center">
                                <div className="text-6xl mb-4">📦</div>
                                <h3 className={`text-lg font-semibold mb-2 ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                                    No Archived Projects Found
                                </h3>
                                <p className={`text-sm ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {searchTerm || filterYear !== 'all' || filterType !== 'all' 
                                        ? 'Try adjusting your search criteria or filters.'
                                        : 'No projects have been archived yet. Archive projects from the main projects page to see them here.'
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ArchivedProjectsPage; 