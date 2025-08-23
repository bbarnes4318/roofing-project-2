import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronUpIcon, ChevronLeftIcon, ChevronRightIcon } from '../common/Icons';
import { formatPhoneNumber } from '../../utils/helpers';
import Modal from '../common/Modal';
import { useProjects, useCustomers, useCreateProject } from '../../hooks/useQueryApi';
import { projectsService, customersService, usersService } from '../../services/api';
import { ProjectCardSkeleton, ErrorState, EmptyState } from '../ui/SkeletonLoaders';
import { useWorkflowStates } from '../../hooks/useWorkflowState';
import WorkflowProgressService from '../../services/workflowProgress';
import { ResponsiveBackButton } from '../common/BackButton';
import { useNavigationHistory } from '../../hooks/useNavigationHistory';
import { formatProjectType, getProjectTypeColor, getProjectTypeColorDark } from '../../utils/projectTypeFormatter';
import WorkflowDataService from '../../services/workflowDataService';

// Default form structure for new projects (reused from existing ProjectsPage)
const defaultNewProject = {
    projectNumber: '',
    projectName: '',
    customerName: '',
    jobType: '',
    tradeTypes: [],
    projectManager: '',
    fieldDirector: '',
    salesRep: '',
    qualityInspector: '',
    adminAssistant: '',
    status: 'Pending',
    budget: '',
    startDate: '',
    endDate: '',
    customer: '',
    address: '',
    priority: 'Low',
    description: '',
    contacts: [
        { name: '', phone: '', email: '', isPrimary: false },
        { name: '', phone: '', email: '', isPrimary: false },
        { name: '', phone: '', email: '', isPrimary: false }
    ]
};

const ProjectProfilePage = ({ 
    onProjectSelect, 
    onProjectActionSelect, 
    onCreateProject, 
    projects, 
    colorMode, 
    projectSourceSection, 
    onNavigateBack, 
    scrollToProject 
}) => {
    const { pushNavigation } = useNavigationHistory();
    const [selectedProject, setSelectedProject] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newProject, setNewProject] = useState(defaultNewProject);
    const [error, setError] = useState('');
    const [expandedProjects, setExpandedProjects] = useState({});
    const [currentProjectsPage, setCurrentProjectsPage] = useState(0);
    const [pastProjectsPage, setPastProjectsPage] = useState(0);
    const [searchFilter, setSearchFilter] = useState('');
    const [sortBy, setSortBy] = useState('projectNumber');
    const [sortOrder, setSortOrder] = useState('desc');
    
    // Available trade types for multi-trade projects
    const TRADE_TYPES = [
        { value: 'ROOFING', label: 'Roofing' },
        { value: 'GUTTERS', label: 'Gutters' },
        { value: 'INTERIOR_PAINT', label: 'Interior Paint' }
    ];
    
    // API hooks
    const createProjectMutation = useCreateProject();
    const { data: customersData, isLoading: customersLoading, error: customersError } = useCustomers({ limit: 100 });
    const { data: projectsFromDb, isLoading: projectsLoading, error: projectsError, refetch } = useProjects({ 
        limit: 100, 
        retry: 3,
        retryDelay: 1000,
        refetchOnWindowFocus: true 
    });
    
    // Role management state
    const [availableUsers, setAvailableUsers] = useState([]);
    const [defaultRoles, setDefaultRoles] = useState({});
    const [usersLoading, setUsersLoading] = useState(true);
    
    // Use centralized workflow states
    const { workflowStates, getWorkflowState, getPhaseForProject, getPhaseColorForProject, getPhaseInitialForProject, getProgressForProject } = useWorkflowStates(projectsFromDb);
    
    // Always use database projects (handle paginated response shape)
    const projectsData = Array.isArray(projectsFromDb?.data)
        ? projectsFromDb.data
        : (Array.isArray(projectsFromDb) ? projectsFromDb : []);
    const projectsArray = projectsData;
    const customers = Array.isArray(customersData) ? customersData : [];
    
    const projectsPerPage = 6;
    
    // Track page navigation
    useEffect(() => {
        pushNavigation('Project Profile', {
            projectSourceSection,
            scrollToProject
        });
    }, [pushNavigation, projectSourceSection]);

    // Auto-select first project if none selected
    useEffect(() => {
        if (!selectedProject && projectsArray.length > 0) {
            setSelectedProject(projectsArray[0]);
        }
    }, [projectsArray, selectedProject]);

    // Fetch available users for role assignments
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await usersService.getTeamMembers();
                // Response shape: { success, data: { teamMembers }, message }
                const teamMembers = Array.isArray(response?.data?.teamMembers)
                    ? response.data.teamMembers
                    : Array.isArray(response?.data)
                        ? response.data
                        : Array.isArray(response)
                            ? response
                            : [];
                setAvailableUsers(teamMembers);

                // Set default roles from teamMembers
                const roles = {};
                teamMembers.forEach(user => {
                    if (user.role && user.role.permissions && user.role.permissions.includes('project_manager')) {
                        if (!roles.projectManager) roles.projectManager = user.id;
                    }
                    if (user.role && user.role.name === 'Field Director' && !roles.fieldDirector) {
                        roles.fieldDirector = user.id;
                    }
                    if (user.role && user.role.name === 'Sales Rep' && !roles.salesRep) {
                        roles.salesRep = user.id;
                    }
                });
                setDefaultRoles(roles);
            } catch (error) {
                console.error('Error fetching users:', error);
                setAvailableUsers([]);
            } finally {
                setUsersLoading(false);
            }
        };

        fetchUsers();
    }, []);
    
    // Filter and sort projects
    const getFilteredAndSortedProjects = () => {
        let filteredProjects = [...projectsArray];
        
        // Apply search filter
        if (searchFilter.trim()) {
            const searchTerm = searchFilter.toLowerCase();
            filteredProjects = filteredProjects.filter(project => 
                ((project.name || project.projectName || '')).toLowerCase().includes(searchTerm) ||
                (project.projectNumber || '').toString().toLowerCase().includes(searchTerm) ||
                (project.customer?.primaryName || '').toLowerCase().includes(searchTerm) ||
                (project.customer?.address || '').toLowerCase().includes(searchTerm)
            );
        }
        
        // Sort projects
        filteredProjects.sort((a, b) => {
            let aValue, bValue;
            
            switch (sortBy) {
                case 'projectNumber':
                    aValue = parseInt(a.projectNumber) || 0;
                    bValue = parseInt(b.projectNumber) || 0;
                    break;
                case 'customer':
                    aValue = a.customer?.primaryName || '';
                    bValue = b.customer?.primaryName || '';
                    break;
                case 'phase':
                    aValue = getPhaseForProject(a.id) || '';
                    bValue = getPhaseForProject(b.id) || '';
                    break;
                case 'progress':
                    aValue = getProgressForProject(a.id) || 0;
                    bValue = getProgressForProject(b.id) || 0;
                    break;
                case 'startDate':
                    aValue = new Date(a.startDate || 0);
                    bValue = new Date(b.startDate || 0);
                    break;
                case 'name':
                default:
                    aValue = (a.name || a.projectName || '').toLowerCase();
                    bValue = (b.name || b.projectName || '').toLowerCase();
                    break;
            }
            
            if (typeof aValue === 'string') {
                const comparison = aValue.localeCompare(bValue);
                return sortOrder === 'asc' ? comparison : -comparison;
            } else {
                const comparison = aValue - bValue;
                return sortOrder === 'asc' ? comparison : -comparison;
            }
        });
        
        return filteredProjects;
    };
    
    // Separate current and past projects
    const getCurrentAndPastProjects = () => {
        const filtered = getFilteredAndSortedProjects();
        const currentProjects = filtered.filter(project => {
            const phase = getPhaseForProject(project.id);
            return phase !== 'completion' && phase !== 'archived';
        });
        const pastProjects = filtered.filter(project => {
            const phase = getPhaseForProject(project.id);
            return phase === 'completion' || phase === 'archived';
        });
        
        return { currentProjects, pastProjects };
    };
    
    const { currentProjects, pastProjects } = getCurrentAndPastProjects();
    
    // Pagination helpers
    const getCurrentPageProjects = (projects, page) => {
        const startIndex = page * projectsPerPage;
        const endIndex = startIndex + projectsPerPage;
        return projects.slice(startIndex, endIndex);
    };
    
    const getTotalPages = (projects) => {
        return Math.ceil(projects.length / projectsPerPage);
    };
    
    // Get project progress percentage based on completed workflow line items
    const getProjectProgress = (project) => {
        const progressData = WorkflowProgressService.calculateProjectProgress(project);
        const progress = progressData.overall || 0;
        return Math.min(100, Math.max(0, Math.round(progress)));
    };
    
    // Handle form submission for new project
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        // Validation
        if (!newProject.projectNumber || !newProject.projectName || !newProject.customerName) {
            setError('Project Number, Project Name, and Customer Name are required');
            return;
        }
        
        try {
            // Phone number normalization
            const normalizePhone = (phone) => {
                if (!phone) return null;
                const cleaned = phone.replace(/\D/g, '');
                if (cleaned.length === 10) return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
                if (cleaned.length === 11 && cleaned[0] === '1') return `+1 (${cleaned.slice(1,4)}) ${cleaned.slice(4,7)}-${cleaned.slice(7)}`;
                return phone;
            };
            
            // Customer data
            const primaryContact = newProject.contacts.find(c => c.isPrimary) || newProject.contacts[0] || {};
            const secondaryContact = newProject.contacts.find(c => !c.isPrimary && c.name) || {};
            
            const customerData = {
                primaryName: newProject.customerName,
                primaryEmail: primaryContact?.email || null,
                primaryPhone: normalizePhone(primaryContact?.phone) || null,
                secondaryName: secondaryContact?.name || null,
                secondaryEmail: secondaryContact?.email || null,
                secondaryPhone: normalizePhone(secondaryContact?.phone) || null,
                primaryContact: 'PRIMARY',
                address: `${newProject.customerName} Project`,
                notes: `Project created from Add Project form`,
                contacts: newProject.contacts
                    .filter(contact => contact.name && contact.name.trim())
                    .map(contact => ({
                        name: contact.name.trim(),
                        phone: normalizePhone(contact.phone) || null,
                        email: contact.email || null,
                        isPrimary: contact.isPrimary || false
                    }))
            };
            
            // Ensure customer exists or create
            let customerId = null;
            const existing = customers.find(c => c.primaryName === newProject.customerName || c.name === newProject.customerName);
            if (existing) {
                customerId = existing.id;
            } else {
                const createdCustomer = await customersService.create(customerData);
                customerId = createdCustomer?.data?.id || createdCustomer?.id;
                if (!customerId) throw new Error('Customer ID not received from server');
            }

            // Map UI jobType to backend enum
            const mapJobTypeToEnum = (jt) => {
                const map = {
                    'Residential Roofing': 'ROOF_REPLACEMENT',
                    'Commercial Roofing': 'ROOF_REPLACEMENT',
                    'Repair & Maintenance': 'OTHER',
                    'New Construction': 'OTHER',
                    'Emergency Repair': 'OTHER',
                    'Inspection': 'OTHER',
                    'Gutter Installation': 'SIDING_INSTALLATION',
                    'Siding': 'SIDING_INSTALLATION',
                    'Windows': 'WINDOW_REPLACEMENT',
                    'General': 'OTHER'
                };
                return map[jt] || 'OTHER';
            };

            // Prepare project payload matching backend validation
            const projectPayload = {
                projectName: newProject.projectName,
                projectType: mapJobTypeToEnum(newProject.jobType),
                customerId,
                status: 'PENDING',
                budget: newProject.budget ? parseFloat(newProject.budget) : 1000,
                startDate: newProject.startDate ? new Date(newProject.startDate).toISOString() : new Date().toISOString(),
                endDate: newProject.endDate ? new Date(newProject.endDate).toISOString() : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
                priority: (newProject.priority || 'Medium').toUpperCase(),
                description: newProject.description || `Project #${newProject.projectNumber}`,
                projectManagerId: newProject.projectManager || null,
                // Optional multi-trade metadata
                additionalTrades: (newProject.tradeTypes || []).filter(t => t !== mapJobTypeToEnum(newProject.jobType)),
                tradeTypes: newProject.tradeTypes || []
            };

            // Create project
            const response = await createProjectMutation.mutateAsync(projectPayload);
            
            // Close modal and reset form
            setIsModalOpen(false);
            setNewProject(defaultNewProject);
            
            if (onCreateProject) {
                onCreateProject(response.data || response);
            }
            
            // Refresh projects
            refetch();
            
            // Log success
            
            console.log('Project created successfully:', response.data || response);
        } catch (err) {
            console.error('Error creating project:', err);
            setError(err.message || 'Failed to create project');
        }
    };
    
    // Handle input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewProject(prev => ({
            ...prev,
            [name]: value
        }));
    };
    
    // Handle contact changes
    const handleContactChange = (index, field, value) => {
        const updatedContacts = [...newProject.contacts];
        updatedContacts[index] = {
            ...updatedContacts[index],
            [field]: value
        };
        
        // If this is being set as primary, unset others
        if (field === 'isPrimary' && value) {
            updatedContacts.forEach((contact, i) => {
                if (i !== index) contact.isPrimary = false;
            });
        }
        
        setNewProject(prev => ({
            ...prev,
            contacts: updatedContacts
        }));
    };

    // Toggle trade type selection
    const toggleTradeType = (tradeValue) => {
        setNewProject(prev => ({
            ...prev,
            tradeTypes: (prev.tradeTypes || []).includes(tradeValue)
                ? (prev.tradeTypes || []).filter(t => t !== tradeValue)
                : [ ...(prev.tradeTypes || []), tradeValue ]
        }));
    };
    
    // Toggle project expansion
    const toggleProjectExpansion = (projectId) => {
        setExpandedProjects(prev => ({
            ...prev,
            [projectId]: !prev[projectId]
        }));
    };

    if (projectsLoading) {
        return (
            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, index) => (
                        <ProjectCardSkeleton key={index} />
                    ))}
                </div>
            </div>
        );
    }
    
    if (projectsError) {
        return <ErrorState message="Failed to load projects" onRetry={refetch} />;
    }

    return (
        <div className={`min-h-screen ${colorMode ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'}`}>
            {/* Header Section */}
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        {onNavigateBack && (
                            <ResponsiveBackButton
                                onClick={onNavigateBack}
                                colorMode={colorMode}
                                className="mr-2"
                            />
                        )}
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
                                Project Profile
                            </h1>
                            <p className="text-gray-600">
                                Comprehensive project management and customer information
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setNewProject({...defaultNewProject, ...defaultRoles});
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 bg-gradient-to-r from-brand-500 to-red-500 text-white shadow-soft hover:shadow-medium hover:-translate-y-0.5"
                    >
                        <span className="text-lg">+</span>
                        <span>Add New Project</span>
                    </button>
                </div>
                
                {/* Selected Project Information - Complete View */}
                {selectedProject && (
                    <div className={`${colorMode ? 'bg-slate-800/90' : 'bg-white/90'} backdrop-blur-sm border ${colorMode ? 'border-slate-600/50' : 'border-gray-200/50'} shadow-soft rounded-2xl p-6 mb-6`}>
                        {/* Project Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className={`text-2xl font-bold ${colorMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                                    {selectedProject.name || selectedProject.projectName || 'Project Details'}
                                </h2>
                                <div className="flex items-center gap-4">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${colorMode ? getProjectTypeColorDark(selectedProject.projectType) : getProjectTypeColor(selectedProject.projectType)}`}>
                                        {formatProjectType(selectedProject.projectType)}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                        getPhaseColorForProject ? 
                                        `${getPhaseColorForProject(selectedProject.id)?.bg} ${getPhaseColorForProject(selectedProject.id)?.text}` : 
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {WorkflowProgressService.getPhaseName(getPhaseForProject(selectedProject.id)) || 'Lead'}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`text-3xl font-bold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                                    {getProjectProgress(selectedProject)}%
                                </div>
                                <div className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                    Complete
                                </div>
                            </div>
                        </div>

                        {/* Main Content Grid */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            {/* Customer Contact Information */}
                            <div className="space-y-4">
                                <h3 className={`text-lg font-semibold ${colorMode ? 'text-white' : 'text-gray-900'} border-b ${colorMode ? 'border-slate-600' : 'border-gray-200'} pb-2`}>
                                    Customer Contact Info
                                </h3>
                                
                                {/* Primary Customer */}
                                <div className={`p-4 rounded-lg ${colorMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                                    <h4 className={`text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-600'} mb-3`}>Primary Customer</h4>
                                    <div className="space-y-2">
                                        <div className={`font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                                            {selectedProject.customer?.primaryName || 'Not Set'}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-blue-500">📞</span>
                                            <a 
                                                href={`tel:${(selectedProject.customer?.primaryPhone || '').replace(/[^\d+]/g, '')}`}
                                                className={`text-sm ${colorMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} hover:underline`}
                                            >
                                                {selectedProject.customer?.primaryPhone || 'Not Set'}
                                            </a>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-blue-500">✉️</span>
                                            <a 
                                                href={`mailto:${selectedProject.customer?.primaryEmail || ''}`}
                                                className={`text-sm ${colorMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} hover:underline`}
                                            >
                                                {selectedProject.customer?.primaryEmail || 'Not Set'}
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                {/* Secondary Customer (when applicable) */}
                                {selectedProject.customer?.secondaryName && (
                                    <div className={`p-4 rounded-lg ${colorMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                                        <h4 className={`text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-600'} mb-3`}>Secondary Customer</h4>
                                        <div className="space-y-2">
                                            <div className={`font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                                                {selectedProject.customer.secondaryName}
                                            </div>
                                            {selectedProject.customer?.secondaryPhone && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-blue-500">📞</span>
                                                    <a 
                                                        href={`tel:${selectedProject.customer.secondaryPhone.replace(/[^\d+]/g, '')}`}
                                                        className={`text-sm ${colorMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} hover:underline`}
                                                    >
                                                        {selectedProject.customer.secondaryPhone}
                                                    </a>
                                                </div>
                                            )}
                                            {selectedProject.customer?.secondaryEmail && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-blue-500">✉️</span>
                                                    <a 
                                                        href={`mailto:${selectedProject.customer.secondaryEmail}`}
                                                        className={`text-sm ${colorMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} hover:underline`}
                                                    >
                                                        {selectedProject.customer.secondaryEmail}
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Project Information */}
                            <div className="space-y-4">
                                <h3 className={`text-lg font-semibold ${colorMode ? 'text-white' : 'text-gray-900'} border-b ${colorMode ? 'border-slate-600' : 'border-gray-200'} pb-2`}>
                                    Project Info
                                </h3>
                                
                                <div className={`p-4 rounded-lg ${colorMode ? 'bg-slate-700/50' : 'bg-gray-50'} space-y-3`}>
                                    {/* Project Number - Clickable Link */}
                                    <div>
                                        <div className={`text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-600'} mb-1`}>Project Number</div>
                                        <button
                                            onClick={() => onProjectSelect(selectedProject, 'Project Profile', null, 'Project Profile')}
                                            className={`text-lg font-bold ${colorMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} hover:underline`}
                                        >
                                            #{selectedProject.projectNumber || 'Not Set'}
                                        </button>
                                    </div>

                                    {/* Addresses and Project Manager (side-by-side) */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Project Address */}
                                        <div>
                                            <div className={`text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-600'} mb-1`}>Project Address</div>
                                            <div className={`${colorMode ? 'text-white' : 'text-gray-900'}`}>
                                                {(() => {
                                                    // Prioritize customer address over project address to avoid project name contamination
                                                    const address = selectedProject.customer?.address || selectedProject.client?.address || selectedProject.location || selectedProject.address;
                                                    if (!address || address === selectedProject.projectName) return 'Address not available';
                                                    const parts = address.split(',');
                                                    if (parts.length >= 2) {
                                                        return (
                                                            <div>
                                                                <div>{parts[0]?.trim()}</div>
                                                                <div>{parts.slice(1).join(',').trim()}</div>
                                                            </div>
                                                        );
                                                    }
                                                    return address;
                                                })()}
                                            </div>
                                        </div>

                                        {/* Customer Address */}
                                        <div>
                                            <div className={`text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-600'} mb-1`}>Customer Address</div>
                                            <div className={`${colorMode ? 'text-white' : 'text-gray-900'}`}>
                                                {(() => {
                                                    // For customer address, prioritize direct customer fields and avoid project contamination
                                                    const address = selectedProject.customer?.address || selectedProject.client?.address || selectedProject.clientAddress;
                                                    if (!address || address === selectedProject.projectName) return 'Address not available';
                                                    const parts = address.split(',');
                                                    if (parts.length >= 2) {
                                                        return (
                                                            <div>
                                                                <div>{parts[0]?.trim()}</div>
                                                                <div>{parts.slice(1).join(',').trim()}</div>
                                                            </div>
                                                        );
                                                    }
                                                    return address;
                                                })()}
                                            </div>
                                        </div>

                                        {/* Project Manager Details */}
                                        <div>
                                            <div className={`text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-600'} mb-1`}>Project Manager</div>
                                            <div className="space-y-1">
                                                <div className={`font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                                                    {selectedProject.projectManager?.firstName && selectedProject.projectManager?.lastName 
                                                        ? `${selectedProject.projectManager.firstName} ${selectedProject.projectManager.lastName}` 
                                                        : selectedProject.projectManager?.name || 'Not Assigned'}
                                                </div>
                                                {selectedProject.projectManager?.phone && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-blue-500">📞</span>
                                                        <a 
                                                            href={`tel:${selectedProject.projectManager.phone.replace(/[^\d+]/g, '')}`}
                                                            className={`text-sm ${colorMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} hover:underline`}
                                                        >
                                                            {selectedProject.projectManager.phone}
                                                        </a>
                                                    </div>
                                                )}
                                                {selectedProject.projectManager?.email && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-blue-500">✉️</span>
                                                        <a 
                                                            href={`mailto:${selectedProject.projectManager.email}`}
                                                            className={`text-sm ${colorMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} hover:underline`}
                                                        >
                                                            {selectedProject.projectManager.email}
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Project Type */}
                                    <div>
                                        <div className={`text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-600'} mb-1`}>Project Type</div>
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colorMode ? getProjectTypeColorDark(selectedProject.projectType) : getProjectTypeColor(selectedProject.projectType)}`}>
                                            {formatProjectType(selectedProject.projectType)}
                                        </span>
                                    </div>

                                    {/* Phase / Section / Line Item (names before values) */}
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                                        <span className={`${colorMode ? 'text-gray-300' : 'text-gray-600'} font-medium`}>Phase:</span>
                                        <span className={`${colorMode ? 'text-white' : 'text-gray-900'}`}>
                                            {WorkflowProgressService.getPhaseName(getPhaseForProject(selectedProject.id)) || 'Lead'}
                                        </span>
                                        <span className={`${colorMode ? 'text-gray-500' : 'text-gray-300'}`}>|</span>
                                        <span className={`${colorMode ? 'text-gray-300' : 'text-gray-600'} font-medium`}>Section:</span>
                                        <span className={`${colorMode ? 'text-white' : 'text-gray-900'}`}>
                                            {(() => {
                                                const cw = selectedProject?.currentWorkflowItem;
                                                // Prefer display name if provided by backend
                                                if (cw?.sectionDisplayName) return cw.sectionDisplayName;
                                                if (cw?.sectionName) return cw.sectionName;
                                                if (cw?.section) return cw.section;
                                                return 'Not Available';
                                            })()}
                                        </span>
                                        <span className={`${colorMode ? 'text-gray-500' : 'text-gray-300'}`}>|</span>
                                        <span className={`${colorMode ? 'text-gray-300' : 'text-gray-600'} font-medium`}>Line Item:</span>
                                        <button
                                            onClick={async () => {
                                                // Enhanced navigation to specific line item in workflow
                                                const cw = selectedProject?.currentWorkflowItem;
                                                const currentLineItem = WorkflowDataService.getCurrentLineItem(selectedProject);
                                                const currentSection = cw?.sectionId || cw?.section || WorkflowDataService.getCurrentSection(selectedProject);
                                                const currentPhase = getPhaseForProject(selectedProject.id);
                                                
                                                if (currentLineItem && selectedProject) {
                                                    console.log('🎯 PROJECT PROFILE: Navigating to line item:', currentLineItem.name);
                                                    console.log('🎯 PROJECT PROFILE: Section:', currentSection);
                                                    console.log('🎯 PROJECT PROFILE: Phase:', currentPhase);
                                                    
                                                    try {
                                                        // Get project position data for proper targeting
                                                        const positionResponse = await fetch(`/api/workflow-data/project-position/${selectedProject.id}`, {
                                                            headers: {
                                                                'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-sarah-owner-token-fixed-12345'}`
                                                            }
                                                        });
                                                        
                                                        if (positionResponse.ok) {
                                                            const positionResult = await positionResponse.json();
                                                            if (positionResult.success && positionResult.data) {
                                                                const position = positionResult.data;
                                                                
                                                                // Generate proper target IDs for navigation
                                                                const targetLineItemId = currentLineItem.id || 
                                                                                       position.currentLineItemId || 
                                                                                       `${currentPhase}-${currentSection}-0`;
                                                                
                                                                const targetSectionId = position.currentSectionId || 
                                                                                      cw?.sectionId || 
                                                                                      (typeof currentSection === 'string' ? currentSection.toLowerCase().replace(/\s+/g, '-') : currentSection) || 
                                                                                      '';
                                                                
                                                                console.log('🎯 PROJECT PROFILE: Target IDs:', {
                                                                    targetLineItemId,
                                                                    targetSectionId
                                                                });
                                                                
                                                                const projectWithNavigation = {
                                                                    ...selectedProject,
                                                                    highlightStep: currentLineItem.name,
                                                                    highlightLineItem: currentLineItem.name,
                                                                    targetPhase: currentPhase,
                                                                    targetSection: currentSection,
                                                                    targetLineItem: currentLineItem.name,
                                                                    scrollToCurrentLineItem: true,
                                                                    navigationTarget: {
                                                                        phase: currentPhase,
                                                                        section: currentSection,
                                                                        lineItem: currentLineItem.name,
                                                                        stepName: currentLineItem.name,
                                                                        lineItemId: targetLineItemId,
                                                                        workflowId: position.workflowId,
                                                                        highlightMode: 'line-item',
                                                                        scrollBehavior: 'smooth',
                                                                        targetElementId: `lineitem-${targetLineItemId}`,
                                                                        highlightColor: '#0066CC',
                                                                        highlightDuration: 3000,
                                                                        targetSectionId: targetSectionId,
                                                                        expandPhase: true,
                                                                        expandSection: true,
                                                                        autoOpen: true,
                                                                        scrollAndHighlight: true,
                                                                        nonce: Date.now()
                                                                    }
                                                                };
                                                                
                                                                onProjectSelect(
                                                                    projectWithNavigation,
                                                                    'Project Workflow',
                                                                    null,
                                                                    'Project Profile',
                                                                    targetLineItemId,
                                                                    targetSectionId
                                                                );
                                                            }
                                                        } else {
                                                            // Fallback without position data
                                                            const projectWithNavigation = {
                                                                ...selectedProject,
                                                                highlightStep: currentLineItem.name,
                                                                highlightLineItem: currentLineItem.name,
                                                                targetPhase: currentPhase,
                                                                targetSection: currentSection,
                                                                targetLineItem: currentLineItem.name,
                                                                scrollToCurrentLineItem: true,
                                                                navigationTarget: {
                                                                    phase: currentPhase,
                                                                    section: currentSection,
                                                                    lineItem: currentLineItem.name,
                                                                    stepName: currentLineItem.name,
                                                                    lineItemId: currentLineItem.id || `${currentPhase}-${currentSection}-0`,
                                                                    highlightMode: 'line-item',
                                                                    scrollBehavior: 'smooth',
                                                                    targetElementId: `lineitem-${currentLineItem.id || `${currentPhase}-${currentSection}-0`}`,
                                                                    highlightColor: '#0066CC',
                                                                    highlightDuration: 3000,
                                                                    targetSectionId: typeof currentSection === 'string' ? currentSection : (currentSection?.id || ''),
                                                                    expandPhase: true,
                                                                    expandSection: true,
                                                                    autoOpen: true,
                                                                    scrollAndHighlight: true,
                                                                    nonce: Date.now()
                                                                }
                                                            };
                                                            onProjectSelect(projectWithNavigation, 'Project Workflow', null, 'Project Profile');
                                                        }
                                                    } catch (error) {
                                                        console.error('🎯 PROJECT PROFILE: Error navigating to workflow step:', error);
                                                        // Final fallback
                                                        onProjectSelect(selectedProject, 'Project Workflow', null, 'Project Profile');
                                                    }
                                                } else {
                                                    // No current line item, just navigate to workflow
                                                    onProjectSelect(selectedProject, 'Project Workflow', null, 'Project Profile');
                                                }
                                            }}
                                            className={`text-sm ${colorMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} hover:underline`}
                                        >
                                            {WorkflowDataService.getCurrentLineItem(selectedProject)?.name || 'View Workflow'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Project Progress & Manager */}
                            <div className="space-y-4">
                                <h3 className={`text-lg font-semibold ${colorMode ? 'text-white' : 'text-gray-900'} border-b ${colorMode ? 'border-slate-600' : 'border-gray-200'} pb-2`}>
                                    Progress & Management
                                </h3>
                                
                                {/* Progress Bar Chart */}
                                <div className={`p-4 rounded-lg ${colorMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className={`text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Progress</span>
                                        <span className={`text-lg font-bold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                                            {getProjectProgress(selectedProject)}%
                                        </span>
                                    </div>
                                    <div className={`w-full h-3 rounded-full overflow-hidden shadow-inner ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                                        <div 
                                            className={`h-full rounded-full transition-all duration-500 ease-out ${
                                                getProjectProgress(selectedProject) === 100 
                                                    ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                                                    : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                                            }`}
                                            style={{ width: `${getProjectProgress(selectedProject)}%` }}
                                        >
                                            {getProjectProgress(selectedProject) > 15 && (
                                                <div className="h-full w-full bg-gradient-to-t from-white/20 to-transparent rounded-full" />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Project Manager removed from this card (moved to Project Info grid) */}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Project Listings Section */}
            <div className="px-6 pb-6">
                {/* Filter and Search Controls */}
                <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-soft rounded-2xl p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex flex-col md:flex-row gap-4 items-center">
                            <input
                                type="text"
                                placeholder="Search projects..."
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="projectNumber">Project Number</option>
                                <option value="name">Project Name</option>
                                <option value="customer">Customer</option>
                                <option value="phase">Phase</option>
                                <option value="progress">Progress</option>
                                <option value="startDate">Start Date</option>
                            </select>
                            <button
                                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center gap-2"
                            >
                                <span className="text-sm">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                                <span className="text-sm">{sortOrder === 'asc' ? 'A-Z' : 'Z-A'}</span>
                            </button>
                        </div>
                        <div className="text-sm text-gray-600">
                            {currentProjects.length} current, {pastProjects.length} past projects
                        </div>
                    </div>
                </div>
                
                {/* Current Projects */}
                <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-soft rounded-2xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900">Current Projects</h2>
                        {getTotalPages(currentProjects) > 1 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentProjectsPage(prev => Math.max(0, prev - 1))}
                                    disabled={currentProjectsPage === 0}
                                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeftIcon className="w-4 h-4" />
                                </button>
                                <span className="text-sm text-gray-600">
                                    {currentProjectsPage + 1} of {getTotalPages(currentProjects)}
                                </span>
                                <button
                                    onClick={() => setCurrentProjectsPage(prev => Math.min(getTotalPages(currentProjects) - 1, prev + 1))}
                                    disabled={currentProjectsPage >= getTotalPages(currentProjects) - 1}
                                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRightIcon className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                    
                    {getCurrentPageProjects(currentProjects, currentProjectsPage).length === 0 ? (
                        <div className="text-center py-8">
                            <div className="text-gray-400 text-5xl mb-4">📋</div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Current Projects</h3>
                            <p className="text-gray-600">Start by creating your first project.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {getCurrentPageProjects(currentProjects, currentProjectsPage).map((project) => (
                                <ProjectListCard
                                    key={project.id}
                                    project={project}
                                    isSelected={selectedProject?.id === project.id}
                                    onSelect={() => setSelectedProject(project)}
                                    onProjectSelect={onProjectSelect}
                                    getPhaseForProject={getPhaseForProject}
                                    getPhaseColorForProject={getPhaseColorForProject}
                                    getProjectProgress={getProjectProgress}
                                    colorMode={colorMode}
                                    isExpanded={expandedProjects[project.id]}
                                    onToggleExpansion={() => toggleProjectExpansion(project.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Past Projects */}
                <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-soft rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900">Past Projects</h2>
                        {getTotalPages(pastProjects) > 1 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPastProjectsPage(prev => Math.max(0, prev - 1))}
                                    disabled={pastProjectsPage === 0}
                                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeftIcon className="w-4 h-4" />
                                </button>
                                <span className="text-sm text-gray-600">
                                    {pastProjectsPage + 1} of {getTotalPages(pastProjects)}
                                </span>
                                <button
                                    onClick={() => setPastProjectsPage(prev => Math.min(getTotalPages(pastProjects) - 1, prev + 1))}
                                    disabled={pastProjectsPage >= getTotalPages(pastProjects) - 1}
                                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRightIcon className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                    
                    {getCurrentPageProjects(pastProjects, pastProjectsPage).length === 0 ? (
                        <div className="text-center py-8">
                            <div className="text-gray-400 text-5xl mb-4">✅</div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Past Projects</h3>
                            <p className="text-gray-600">Completed projects will appear here.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {getCurrentPageProjects(pastProjects, pastProjectsPage).map((project) => (
                                <ProjectListCard
                                    key={project.id}
                                    project={project}
                                    isSelected={selectedProject?.id === project.id}
                                    onSelect={() => setSelectedProject(project)}
                                    onProjectSelect={onProjectSelect}
                                    getPhaseForProject={getPhaseForProject}
                                    getPhaseColorForProject={getPhaseColorForProject}
                                    getProjectProgress={getProjectProgress}
                                    colorMode={colorMode}
                                    isExpanded={expandedProjects[project.id]}
                                    onToggleExpansion={() => toggleProjectExpansion(project.id)}
                                    isPast={true}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Add Project Modal - Reused from existing ProjectsPage */}
            <Modal isOpen={isModalOpen} onClose={() => {
                setIsModalOpen(false);
                setNewProject(defaultNewProject);
                setError('');
            }}>
                <div className="p-6">
                    <h3 className={`text-lg font-semibold ${colorMode ? 'text-white' : 'text-gray-800'} mb-4`}>
                        Add New Project
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Project Number */}
                        <div>
                            <label className={`block text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                Project Number *
                            </label>
                            <input
                                type="text"
                                name="projectNumber"
                                value={newProject.projectNumber}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>
                        
                        {/* Trade Types - Multiple Selection */}
                        <div>
                            <label className={`block text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                                Trade Types (Select multiple)
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {TRADE_TYPES.map(trade => (
                                    <label
                                        key={trade.value}
                                        className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                            (newProject.tradeTypes || []).includes(trade.value)
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={(newProject.tradeTypes || []).includes(trade.value)}
                                            onChange={() => toggleTradeType(trade.value)}
                                            className="mr-3 h-4 w-4 text-blue-600"
                                        />
                                        <span className="font-medium">{trade.label}</span>
                                    </label>
                                ))}
                            </div>
                            {(newProject.tradeTypes || []).length > 0 && (
                                <p className="mt-2 text-sm text-blue-600">
                                    Selected: {(newProject.tradeTypes || []).join(', ')}
                                </p>
                            )}
                        </div>
                        
                        {/* Project Name */}
                        <div>
                            <label className={`block text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                Project Name *
                            </label>
                            <input
                                type="text"
                                name="projectName"
                                value={newProject.projectName}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>
                        
                        {/* Customer Name */}
                        <div>
                            <label className={`block text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                Customer Name *
                            </label>
                            <input
                                type="text"
                                name="customerName"
                                value={newProject.customerName}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>
                        
                        {/* Job Type */}
                        <div>
                            <label className={`block text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                Job Type
                            </label>
                            <select
                                name="jobType"
                                value={newProject.jobType}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Select Job Type</option>
                                <option value="Residential Roofing">Residential Roofing</option>
                                <option value="Commercial Roofing">Commercial Roofing</option>
                                <option value="Repair & Maintenance">Repair & Maintenance</option>
                                <option value="New Construction">New Construction</option>
                                <option value="Emergency Repair">Emergency Repair</option>
                                <option value="Inspection">Inspection</option>
                                <option value="Gutter Installation">Gutter Installation</option>
                                <option value="Siding">Siding</option>
                                <option value="Windows">Windows</option>
                                <option value="General">General</option>
                            </select>
                        </div>
                        
                        {/* Address */}
                        <div>
                            <label className={`block text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                Project Address
                            </label>
                            <input
                                type="text"
                                name="address"
                                value={newProject.address}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Project address"
                            />
                        </div>
                        
                        {/* Budget */}
                        <div>
                            <label className={`block text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                Budget
                            </label>
                            <input
                                type="number"
                                name="budget"
                                value={newProject.budget}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                            />
                        </div>
                        
                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={`block text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    name="startDate"
                                    value={newProject.startDate}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    name="endDate"
                                    value={newProject.endDate}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                        
                        {/* Priority */}
                        <div>
                            <label className={`block text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                Priority
                            </label>
                            <select
                                name="priority"
                                value={newProject.priority}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Critical">Critical</option>
                            </select>
                        </div>
                        
                        {/* Description */}
                        <div>
                            <label className={`block text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={newProject.description}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows="3"
                                placeholder="Project description..."
                            />
                        </div>
                        
                        {/* Role Assignments */}
                        {!usersLoading && (
                            <div className={`border-t pt-6 ${colorMode ? 'border-slate-600' : 'border-gray-200'}`}>
                                <h4 className={`text-lg font-semibold mb-4 ${colorMode ? 'text-white' : 'text-gray-800'}`}>Project Roles</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                            Project Manager
                                        </label>
                                        <select
                                            name="projectManager"
                                            value={newProject.projectManager || ''}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="">Select Project Manager</option>
                                            {availableUsers.map((user) => (
                                                <option key={user.id} value={user.id}>
                                                    {user.firstName} {user.lastName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className={`block text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                            Field Director
                                        </label>
                                        <select
                                            name="fieldDirector"
                                            value={newProject.fieldDirector || ''}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="">Select Field Director</option>
                                            {availableUsers.map((user) => (
                                                <option key={user.id} value={user.id}>
                                                    {user.firstName} {user.lastName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className={`block text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                            Sales Representative
                                        </label>
                                        <select
                                            name="salesRep"
                                            value={newProject.salesRep || ''}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="">Select Sales Rep</option>
                                            {availableUsers.map((user) => (
                                                <option key={user.id} value={user.id}>
                                                    {user.firstName} {user.lastName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className={`block text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                            Quality Inspector
                                        </label>
                                        <select
                                            name="qualityInspector"
                                            value={newProject.qualityInspector || ''}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="">Select Quality Inspector</option>
                                            {availableUsers.map((user) => (
                                                <option key={user.id} value={user.id}>
                                                    {user.firstName} {user.lastName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Customer Contact Information */}
                        <div className={`border-t pt-6 ${colorMode ? 'border-slate-600' : 'border-gray-200'}`}>
                            <h4 className={`text-lg font-semibold mb-4 ${colorMode ? 'text-white' : 'text-gray-800'}`}>Customer Contacts</h4>
                            {newProject.contacts.map((contact, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 border border-gray-200 rounded-lg">
                                    <div>
                                        <label className={`block text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                            Contact Name
                                        </label>
                                        <input
                                            type="text"
                                            value={contact.name}
                                            onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Contact name"
                                        />
                                    </div>
                                    <div>
                                        <label className={`block text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                            Phone
                                        </label>
                                        <input
                                            type="tel"
                                            value={contact.phone}
                                            onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="(555) 123-4567"
                                        />
                                    </div>
                                    <div>
                                        <label className={`block text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={contact.email}
                                            onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="contact@email.com"
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={contact.isPrimary}
                                                onChange={(e) => handleContactChange(index, 'isPrimary', e.target.checked)}
                                                className="mr-2"
                                            />
                                            <span className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                Primary Contact
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {/* Error Display */}
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}
                        
                        {/* Form Actions */}
                        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setNewProject(defaultNewProject);
                                    setError('');
                                }}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-all duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={createProjectMutation.isLoading}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
                            >
                                {createProjectMutation.isLoading && (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                )}
                                {createProjectMutation.isLoading ? 'Creating...' : 'Create Project'}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>
        </div>
    );
};

// Project List Card Component
const ProjectListCard = ({ 
    project, 
    isSelected, 
    onSelect, 
    onProjectSelect, 
    getPhaseForProject, 
    getPhaseColorForProject, 
    getProjectProgress, 
    colorMode, 
    isExpanded, 
    onToggleExpansion, 
    isPast = false 
}) => {
    const phaseKey = getPhaseForProject(project?.id);
    const currentPhase = WorkflowProgressService.getPhaseName(phaseKey);
    const phaseColors = WorkflowProgressService.getPhaseColor(phaseKey);
    
    return (
        <div className={`border rounded-xl transition-all duration-300 hover:shadow-lg cursor-pointer ${
            isSelected 
                ? 'border-blue-500 shadow-blue-100 bg-blue-50/50' 
                : 'border-gray-200 hover:border-gray-300 bg-white'
        } ${isPast ? 'opacity-75' : ''}`}>
            <div className="p-4" onClick={onSelect}>
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                            #{project.projectNumber || 'N/A'} - {(project.name || project.projectName || 'Untitled Project')}
                        </h3>
                        <p className="text-sm text-gray-600 truncate">
                            {project.customer?.primaryName || 'Unknown Customer'}
                        </p>
                        {project.customer?.address && (
                            <p className="text-xs text-gray-500 truncate mt-1">
                                {project.customer.address}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${phaseColors.bg} ${phaseColors.text}`}>
                            {currentPhase}
                        </span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleExpansion();
                            }}
                            className="p-1 hover:bg-gray-100 rounded"
                        >
                            {isExpanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
                
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Progress:</span>
                        <span className="font-medium">{getProjectProgress(project)}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-brand-500 to-red-500 rounded-full transition-all duration-300"
                            style={{ width: `${getProjectProgress(project)}%` }}
                        ></div>
                    </div>
                </div>
            </div>
            
            {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                    <div className="space-y-2 text-sm">
                        <div>
                            <span className="text-gray-600">Project Manager:</span>
                            <span className="ml-2 text-gray-900">
                                {project.projectManager ? `${project.projectManager.firstName} ${project.projectManager.lastName}` : 'Not Assigned'}
                            </span>
                        </div>
                        {project.customer?.primaryPhone && (
                            <div>
                                <span className="text-gray-600">Phone:</span>
                                <a href={`tel:${project.customer.primaryPhone.replace(/[^\d+]/g, '')}`} className="ml-2 text-blue-600 hover:underline">
                                    {project.customer.primaryPhone}
                                </a>
                            </div>
                        )}
                        {project.customer?.primaryEmail && (
                            <div>
                                <span className="text-gray-600">Email:</span>
                                <a href={`mailto:${project.customer.primaryEmail}`} className="ml-2 text-blue-600 hover:underline">
                                    {project.customer.primaryEmail}
                                </a>
                            </div>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mt-4">
                        <button
                            onClick={() => onProjectSelect(project, 'Project Workflow', null, 'Project Profile')}
                            className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-xs"
                        >
                            <span>🗂️</span>
                            Workflow
                        </button>
                        <button
                            onClick={() => onProjectSelect(project, 'Messages', null, 'Project Profile')}
                            className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-xs"
                        >
                            <span>💬</span>
                            Messages
                        </button>
                        <button
                            onClick={() => onProjectSelect(project, 'Alerts', null, 'Project Profile')}
                            className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-xs"
                        >
                            <span>⚠️</span>
                            Alerts
                        </button>
                        <button
                            onClick={() => onProjectSelect(project, 'Alerts Calendar', null, 'Project Profile')}
                            className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-xs"
                        >
                            <span>📅</span>
                            Alerts Calendar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectProfilePage;