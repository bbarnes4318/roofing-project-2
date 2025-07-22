import React, { useState, useMemo } from 'react';
import HeaderCard from '../ui/HeaderCard';
import { ClockIcon, ChartBarIcon, CurrencyDollarIcon, CheckBadgeIcon, ChevronDownIcon } from '../common/Icons';
import { getStatusStyles, getOverdueTasks, getActiveProjects, getTotalProjectValue } from '../../utils/helpers';
import ActivityFeedPage from './ActivityFeedPage';

const DashboardPage = ({ tasks, projects, activities, onProjectSelect, onAddActivity }) => {
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Project statuses for filtering
  const projectStatuses = [
    'All',
    'Lead Phase',
    'Prospect Phase-Insurance-1st Supplement',
    'Approved Phase',
    'Execution Phase',
    '2nd Supplement Phase',
    'Completion Phase'
  ];

  // Sample project data with the requested statuses
  const sampleProjects = [
    {
      id: 1,
      name: 'Wilson Residence Roof Replacement',
      startDate: '2023-01-12',
      endDate: '2023-04-10',
      status: 'Lead Phase',
      progress: 15,
      budget: 100000,
      expenses: 15000,
      team: 'Team Alpha',
      priority: 'High',
      clientName: 'Betsy Stephens',
      clientEmail: 'betsy.stephens@email.com',
      manager: 'Sarah Johnson'
    },
    {
      id: 2,
      name: 'Residential Siding Repair',
      startDate: '2023-02-15',
      endDate: '2023-05-20',
      status: 'Prospect Phase-Insurance-1st Supplement',
      progress: 35,
      budget: 75000,
      expenses: 25000,
      team: 'Team Beta',
      priority: 'Medium',
      clientName: 'Michael Rodriguez',
      clientEmail: 'michael.rodriguez@email.com',
      manager: 'Mike Chen'
    },
    {
      id: 3,
      name: 'Residential Office Building Restoration',
      startDate: '2023-03-01',
      endDate: '2023-08-15',
      status: 'Approved Phase',
      progress: 60,
      budget: 250000,
      expenses: 125000,
      team: 'Team Gamma',
      priority: 'High',
      clientName: 'Jennifer Martinez',
      clientEmail: 'jennifer.martinez@email.com',
      manager: 'Lisa Wang'
    },
    {
      id: 4,
      name: 'Thompson Residence Storm Damage Repair',
      startDate: '2023-01-20',
      endDate: '2023-04-30',
      status: 'Execution Phase',
      progress: 80,
      budget: 85000,
      expenses: 68000,
      team: 'Team Delta',
      priority: 'High',
      clientName: 'David Thompson',
      clientEmail: 'david.thompson@email.com',
      manager: 'Tom Rodriguez'
    },
    {
      id: 5,
      name: 'Foster Residence Roof Maintenance',
      startDate: '2023-02-01',
      endDate: '2023-06-15',
      status: '2nd Supplement Phase',
      progress: 90,
      budget: 180000,
      expenses: 165000,
      team: 'Team Epsilon',
      priority: 'Medium',
      clientName: 'Amanda Foster',
      clientEmail: 'amanda.foster@email.com',
      manager: 'Amanda Foster'
    },
    {
      id: 6,
      name: 'Johnson Residence Restoration',
      startDate: '2022-09-01',
      endDate: '2023-03-31',
      status: 'Completion Phase',
      progress: 100,
      budget: 320000,
      expenses: 315000,
      team: 'Team Zeta',
      priority: 'Low',
      clientName: 'Patricia Johnson',
      clientEmail: 'patricia.johnson@email.com',
      manager: 'David Kim'
    }
  ];

  const allProjects = projects.length > 0 ? projects : sampleProjects;

  // Basic dashboard calculations
  const recentTasks = tasks.slice(0, 3);
  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'overdue').length;
  const activeProjects = getActiveProjects(allProjects).length;
  const totalValue = getTotalProjectValue(allProjects);
  const completedTasksThisWeek = 0;

  // Filter projects by selected status
  const filteredProjects = useMemo(() => {
    if (selectedStatus === 'All') {
      return allProjects;
    }
    return allProjects.filter(project => project.status === selectedStatus);
  }, [allProjects, selectedStatus]);

  // Sort filtered projects
  const sortedProjects = useMemo(() => {
    if (!sortField) return filteredProjects;

    return [...filteredProjects].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [filteredProjects, sortField, sortDirection]);

  // Get status badge styling
  const getStatusBadge = (status) => {
    const baseClasses = "px-3 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case 'Lead Phase':
        return `${baseClasses} bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300`;
      case 'Prospect Phase-Insurance-1st Supplement':
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300`;
      case 'Approved Phase':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`;
      case 'Execution Phase':
        return `${baseClasses} bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300`;
      case '2nd Supplement Phase':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`;
      case 'Completion Phase':
        return `${baseClasses} bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`;
    }
  };

  // Get priority badge styling
  const getPriorityBadge = (priority) => {
    const baseClasses = "px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (priority) {
      case 'High':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300`;
      case 'Medium':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`;
      case 'Low':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`;
    }
  };

  // Handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Render sort icon
  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ChevronDownIcon className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronDownIcon className="w-4 h-4 text-blue-600" />
      : <ChevronDownIcon className="w-4 h-4 text-blue-600" />;
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `$${amount.toLocaleString()}`;
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const tableClasses = isDarkMode
    ? 'dark bg-gray-800 text-white'
    : 'bg-white';

  return (
    <div>
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Good afternoon, Sarah!</h1>
        <p className="text-gray-500 mt-2">Here's what's happening with your projects today.</p>
      </div>

      {/* Activity Feed */}
      <div className="mb-8">
        <ActivityFeedPage 
          projects={allProjects} 
          onProjectSelect={onProjectSelect} 
          activities={activities} 
          onAddActivity={onAddActivity} 
        />
      </div>

      {/* Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <HeaderCard 
          title="Pending Tasks" 
          value={pendingTasks} 
          subtext={`${getOverdueTasks(tasks).length} overdue`} 
          icon={<ClockIcon />} 
        />
        <HeaderCard 
          title="Active Projects" 
          value={activeProjects} 
          subtext={`${allProjects.length} total projects`} 
          icon={<ChartBarIcon className="h-5 w-5 text-green-500" />} 
        />
        <HeaderCard 
          title="Project Value" 
          value={`$${totalValue.toLocaleString()}`} 
          subtext="Total active value" 
          icon={<CurrencyDollarIcon />} 
        />
        <HeaderCard 
          title="Completed Tasks" 
          value={completedTasksThisWeek} 
          subtext="This week" 
          icon={<CheckBadgeIcon />} 
        />
      </div>
      
      {/* Recent Tasks and Project Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Recent Tasks</h3>
          <div className="space-y-4">
            {recentTasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{task.title}</p>
                  <p className="text-sm text-gray-500">{task.description}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full capitalize ${getStatusStyles(task.status)}`}>
                  {task.status}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Project Progress</h3>
          <div className="space-y-6">
            {allProjects.slice(0, 5).map(project => (
              <div key={project.id}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{project.name}</span>
                  <span className="text-sm font-medium text-gray-700">{project.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${project.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Project Management Table */}
      <div className={`${tableClasses} p-6 rounded-lg shadow-md transition-all duration-200 mb-8`}>
        {/* Section Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Project Overview</h3>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>

        {/* Status Filter Buttons */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {projectStatuses.map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  selectedStatus === status
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {status} 
                {status !== 'All' && (
                  <span className="ml-2 px-2 py-0.5 bg-white bg-opacity-20 rounded-full text-xs">
                    {allProjects.filter(p => p.status === status).length}
                  </span>
                )}
                {status === 'All' && (
                  <span className="ml-2 px-2 py-0.5 bg-white bg-opacity-20 rounded-full text-xs">
                    {allProjects.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table 
            className="w-full border-collapse"
            role="table"
            aria-label="Project management data table"
          >
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                {[
                  { key: 'id', label: 'ID' },
                  { key: 'name', label: 'Project Name' },
                  { key: 'startDate', label: 'Start Date' },
                  { key: 'endDate', label: 'End Date' },
                  { key: 'status', label: 'Status' },
                  { key: 'progress', label: 'Progress' },
                  { key: 'budget', label: 'Budget' },
                  { key: 'expenses', label: 'Expenses' },
                  { key: 'team', label: 'Team' },
                  { key: 'priority', label: 'Priority' },
                  { key: 'clientName', label: 'Client' },
                  { key: 'manager', label: 'Manager' }
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    role="columnheader"
                    tabIndex={0}
                    onKeyPress={(e) => e.key === 'Enter' && handleSort(key)}
                    aria-sort={
                      sortField === key 
                        ? sortDirection === 'asc' ? 'ascending' : 'descending'
                        : 'none'
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span>{label}</span>
                      {renderSortIcon(key)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {sortedProjects.map((project, index) => (
                <tr
                  key={project.id}
                  className={`
                    ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}
                    hover:bg-blue-50 dark:hover:bg-gray-700 hover:shadow-lg transition-all duration-150 cursor-pointer
                    focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2
                  `}
                  role="row"
                  tabIndex={0}
                  onClick={() => onProjectSelect && onProjectSelect(project)}
                >
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{project.id}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100" title={project.name}>
                    {project.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(project.startDate)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(project.endDate)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={getStatusBadge(project.status)}>{project.status}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-2.5 mr-2">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full"
                          style={{ width: `${project.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs">{project.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {formatCurrency(project.budget)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {formatCurrency(project.expenses)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400" title={project.team}>
                    {project.team}
                  </td>
                  <td className="px-4 py-3">
                    <span className={getPriorityBadge(project.priority)}>{project.priority}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400" title={project.clientName}>
                    {project.clientName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400" title={project.manager}>
                    {project.manager}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-4">
          {sortedProjects.map((project) => (
            <div
              key={project.id}
              className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onProjectSelect && onProjectSelect(project)}
            >
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">{project.name}</h4>
                <span className={getStatusBadge(project.status)}>{project.status}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Priority:</span>
                  <div className="mt-1">
                    <span className={getPriorityBadge(project.priority)}>{project.priority}</span>
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Progress:</span>
                  <div className="mt-1 flex items-center">
                    <div className="w-12 bg-gray-200 dark:bg-gray-600 rounded-full h-2 mr-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                    <span className="text-xs">{project.progress}%</span>
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Budget:</span>
                  <p className="text-gray-900 dark:text-gray-100">{formatCurrency(project.budget)}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Manager:</span>
                  <p className="text-gray-900 dark:text-gray-100">{project.manager}</p>
                </div>
              </div>
              
              <button className="mt-3 w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors">
                View Details
              </button>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {sortedProjects.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 dark:text-gray-500 text-lg mb-2">No projects found</div>
            <div className="text-gray-500 dark:text-gray-400 text-sm">
              No projects match the selected status: {selectedStatus}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
