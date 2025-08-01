import React, { useMemo, useState, useEffect } from 'react';
// import { initialProjects, crews } from '../../data/mockData';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  DocumentTextIcon, 
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  TruckIcon,
  WrenchScrewdriverIcon
} from '../common/Icons';

// Utility to get all days in a week starting from a given date
function getWeekDays(startDate) {
  const days = [];
  const start = new Date(startDate);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(new Date(d));
  }
  return days;
}

// Utility to check if a project has materials scheduled on a given day
function isMaterialsOnDay(project, day) {
  if (!project.materialsDeliveryStart || !project.materialsDeliveryEnd) return false;
  const start = new Date(project.materialsDeliveryStart);
  const end = new Date(project.materialsDeliveryEnd);
  return start <= day && day <= end;
}

// Utility to check if a project has labor scheduled on a given day
function isLaborOnDay(project, day) {
  if (!project.laborStart || !project.laborEnd) return false;
  const start = new Date(project.laborStart);
  const end = new Date(project.laborEnd);
  return start <= day && day <= end;
}

// Utility to format date range
function formatDateRange(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

// Utility to get project color by type
function getProjectColor(type) {
  const colors = {
    'Roofing': 'bg-blue-500',
    'Siding': 'bg-green-500',
    'Decking': 'bg-yellow-500',
    'Renovation': 'bg-purple-500',
    'Remodeling': 'bg-pink-500',
    'Electrical': 'bg-orange-500',
    'Plumbing': 'bg-teal-500'
  };
  return colors[type] || 'bg-gray-500';
}

// Utility to get status icon
function getStatusIcon(status) {
  switch(status) {
    case 'lead': return <DocumentTextIcon className="w-4 h-4 text-purple-500" />;
    case 'prospect': return <DocumentTextIcon className="w-4 h-4 text-orange-500" />;
    case 'approved': return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
    case 'execution': return <CheckCircleIcon className="w-4 h-4 text-blue-500" />;
    case 'supplement': return <DocumentTextIcon className="w-4 h-4 text-yellow-500" />;
    case 'completion': return <CheckCircleIcon className="w-4 h-4 text-teal-500" />;
    default: return <DocumentTextIcon className="w-4 h-4 text-gray-400" />;
  }
}

// Utility to get material status
function getMaterialStatus(project) {
  const today = new Date();
  const deliveryStart = new Date(project.materialsDeliveryStart);
  const deliveryEnd = new Date(project.materialsDeliveryEnd);
  
  if (today < deliveryStart) return { status: 'pending', icon: '⏳', text: 'Pending' };
  if (today >= deliveryStart && today <= deliveryEnd) return { status: 'transit', icon: '🚚', text: 'In Transit' };
  return { status: 'delivered', icon: '✔️', text: 'Delivered' };
}

// Utility to get labor status
function getLaborStatus(project) {
  const today = new Date();
  const laborStart = new Date(project.laborStart || project.startDate);
  const laborEnd = new Date(project.laborEnd || project.endDate);
  
  if (today < laborStart) return { status: 'scheduled', icon: '📅', text: 'Scheduled' };
  if (today >= laborStart && today <= laborEnd) return { status: 'active', icon: '🛠️', text: 'In Progress' };
  return { status: 'completed', icon: '✅', text: 'Completed' };
}

export default function ProjectSchedulesPage() {
  const [modalProject, setModalProject] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTrade, setFilterTrade] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [draggedProject, setDraggedProject] = useState(null);
  const [viewMode, setViewMode] = useState('weekly');
  const [loading, setLoading] = useState(true);
  
  // Date picker states
  const [materialsStartDate, setMaterialsStartDate] = useState('');
  const [materialsEndDate, setMaterialsEndDate] = useState('');
  const [laborStartDate, setLaborStartDate] = useState('');
  const [laborEndDate, setLaborEndDate] = useState('');
  const [showDatePickers, setShowDatePickers] = useState(false);
  const [selectedScheduleType, setSelectedScheduleType] = useState('materials');
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [hoveredProjectId, setHoveredProjectId] = useState(null);
  
  // Load projects from localStorage or use initial data
  const [projects, setProjects] = useState(() => {
    const savedProjects = localStorage.getItem('projectSchedules');
    if (savedProjects) {
      try {
        const parsed = JSON.parse(savedProjects);
        return [].map(project => {
          const savedProject = parsed.find(p => p.id === project.id);
          if (savedProject) {
            return {
              ...project,
              laborStart: savedProject.laborStart,
              laborEnd: savedProject.laborEnd,
              materialsDeliveryStart: savedProject.materialsDeliveryStart,
              materialsDeliveryEnd: savedProject.materialsDeliveryEnd
            };
          }
          return project;
        });
      } catch (error) {
        console.error('Error loading saved schedules:', error);
        return [];
      }
    }
            return [];
  });

  // Load schedules from backend API
  const loadSchedulesFromBackend = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/api/schedules`);
      if (res.ok) {
        const schedules = await res.json();
        console.log('Loaded schedules from backend:', schedules);
        
        // Merge backend schedule data with projects
        const updatedProjects = (projects || []).map(project => {
          const schedule = schedules.find(s => s.projectId === project.id);
          if (schedule) {
            return {
              ...project,
              laborStart: schedule.laborStart,
              laborEnd: schedule.laborEnd,
              materialsDeliveryStart: schedule.materialsDeliveryStart,
              materialsDeliveryEnd: schedule.materialsDeliveryEnd
            };
          }
          return project;
        });
        
        setProjects(updatedProjects);
        saveProjectsToStorage(updatedProjects);
      }
    } catch (error) {
      console.error('Error loading schedules from backend:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load schedules from backend when component mounts
  useEffect(() => {
    loadSchedulesFromBackend();
  }, []);

  // Global mouse move handler for better drag detection
  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (dragStart) {
        // Find which cell the mouse is over
        const target = e.target.closest('td');
        if (target) {
          const projectId = parseInt(target.getAttribute('data-project-id'));
          const dayIdx = parseInt(target.getAttribute('data-day-idx'));
          if (projectId && dayIdx !== undefined && projectId === dragStart.projectId) {
            setDragEnd({ projectId, dayIdx });
          }
        }
      }
    };

    if (dragStart) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', () => {
        setDragStart(null);
        setDragEnd(null);
      });
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [dragStart]);
  
  // Save projects to localStorage whenever they change
  const saveProjectsToStorage = (updatedProjects) => {
    try {
      const scheduleData = (updatedProjects || []).map(project => ({
        id: project.id,
        laborStart: project.laborStart,
        laborEnd: project.laborEnd,
        materialsDeliveryStart: project.materialsDeliveryStart,
        materialsDeliveryEnd: project.materialsDeliveryEnd
      }));
      localStorage.setItem('projectSchedules', JSON.stringify(scheduleData));
    } catch (error) {
      console.error('Error saving schedules to localStorage:', error);
    }
  };

  // Use current week as default
  const weekStart = new Date(currentWeek);
  weekStart.setDate(currentWeek.getDate() - currentWeek.getDay()); // Sunday as start
  const weekDays = getWeekDays(weekStart);

  // Get unique trades
  const trades = useMemo(() => {
    const set = new Set();
    (projects || []).forEach(p => {
      if (p.type) set.add(p.type);
    });
    return Array.from(set);
  }, [projects]);

  // Filter projects based on search and filters
  const filteredProjects = useMemo(() => {
    return (projects || []).filter(project => {
      const matchesSearch = !searchTerm || 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.location.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTrade = !filterTrade || project.type === filterTrade;
      const matchesStatus = !filterStatus || project.status === filterStatus;
      
      return matchesSearch && matchesTrade && matchesStatus;
    });
  }, [projects, searchTerm, filterTrade, filterStatus]);

  // Projects without any scheduling (materials or labor)
  const unscheduled = filteredProjects.filter(p => 
    !p.materialsDeliveryStart && !p.laborStart && !p.startDate
  );

  // Navigation functions
  const goToPreviousWeek = () => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() - 7);
    setCurrentWeek(newWeek);
  };

  const goToNextWeek = () => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + 7);
    setCurrentWeek(newWeek);
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
  };

  // Drag and drop handlers
  const handleDragStart = (e, project, type) => {
    setDraggedProject({ ...project, type });
    setSelectedScheduleType(type);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Schedule Materials function
  const scheduleMaterials = (project) => {
    if (!project || !materialsStartDate || !materialsEndDate) return;
    
    console.log('Scheduling materials for:', project.name, 'from', materialsStartDate, 'to', materialsEndDate);
    
    const updatedProjects = projects.map(p => 
      p.id === project.id 
        ? { ...p, materialsDeliveryStart: materialsStartDate, materialsDeliveryEnd: materialsEndDate }
        : p
    );
    
    console.log('Updated projects:', updatedProjects);
    setProjects(updatedProjects);
    setModalProject(null);
    setShowDatePickers(false);
    setMaterialsStartDate('');
    setMaterialsEndDate('');
    
    // Save to localStorage
    saveProjectsToStorage(updatedProjects);
  };

  // Schedule Labor function
  const scheduleLabor = (project) => {
    if (!project || !laborStartDate || !laborEndDate) return;
    
    console.log('Scheduling labor for:', project.name, 'from', laborStartDate, 'to', laborEndDate);
    
    const updatedProjects = projects.map(p => 
      p.id === project.id 
        ? { ...p, laborStart: laborStartDate, laborEnd: laborEndDate }
        : p
    );
    
    console.log('Updated projects:', updatedProjects);
    setProjects(updatedProjects);
    setModalProject(null);
    setShowDatePickers(false);
    setLaborStartDate('');
    setLaborEndDate('');
    
    // Save to localStorage
    saveProjectsToStorage(updatedProjects);
  };

  const handleDayMouseDown = (projectId, dayIdx) => {
    console.log('Mouse down on project', projectId, 'day', dayIdx, 'type', selectedScheduleType);
    setDragStart({ projectId, dayIdx });
    setDragEnd({ projectId, dayIdx });
  };
  
  const handleDayMouseEnter = (projectId, dayIdx) => {
    if (dragStart && dragStart.projectId === projectId) {
      console.log('Mouse enter on project', projectId, 'day', dayIdx);
      setDragEnd({ projectId, dayIdx });
    }
  };

  const handleDayMouseMove = (projectId, dayIdx) => {
    if (dragStart && dragStart.projectId === projectId) {
      console.log('Mouse move on project', projectId, 'day', dayIdx);
      setDragEnd({ projectId, dayIdx });
    }
  };
  
  const handleDayMouseUp = async (projectId, dayIdx) => {
    console.log('Mouse up on project', projectId, 'day', dayIdx);
    console.log('Drag start:', dragStart);
    console.log('Drag end:', dragEnd);
    console.log('Selected type:', selectedScheduleType);
    
    // Ensure we have both drag start and end, and they're on the same project
    if (dragStart && dragStart.projectId === projectId) {
      // If dragEnd is not set, use the current day
      const finalDragEnd = dragEnd || { projectId, dayIdx };
      
      const startIdx = Math.min(dragStart.dayIdx, finalDragEnd.dayIdx);
      const endIdx = Math.max(dragStart.dayIdx, finalDragEnd.dayIdx);
      const startDay = weekDays[startIdx];
      const endDay = weekDays[endIdx];
      
      console.log('Scheduling range:', startIdx, 'to', endIdx);
      console.log('Start day:', startDay);
      console.log('End day:', endDay);
      
      // Prepare schedule payload
      const payload = {
        projectId,
        laborStart: selectedScheduleType === 'labor' ? startDay.toISOString() : undefined,
        laborEnd: selectedScheduleType === 'labor' ? endDay.toISOString() : undefined,
        materialsDeliveryStart: selectedScheduleType === 'materials' ? startDay.toISOString() : undefined,
        materialsDeliveryEnd: selectedScheduleType === 'materials' ? endDay.toISOString() : undefined,
      };
      
      console.log('Sending payload:', payload);
      
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/api/schedules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('Server response:', res.status, errorText);
          throw new Error(`Failed to save schedule: ${res.status} ${errorText}`);
        }
        
        const savedSchedule = await res.json();
        console.log('Schedule saved successfully:', savedSchedule);
        
        // Update project schedule in UI
        const updatedProjects = projects.map(p => {
          if (p.id !== projectId) return p;
          if (selectedScheduleType === 'materials') {
            return { 
              ...p, 
              materialsDeliveryStart: startDay.toISOString(), 
              materialsDeliveryEnd: endDay.toISOString() 
            };
          } else {
            return { 
              ...p, 
              laborStart: startDay.toISOString(), 
              laborEnd: endDay.toISOString() 
            };
          }
        });
        
        setProjects(updatedProjects);
        saveProjectsToStorage(updatedProjects);
        
        // Show success message
        alert(`Successfully scheduled ${selectedScheduleType} for ${startDay.toLocaleDateString()} to ${endDay.toLocaleDateString()}`);
        
      } catch (err) {
        console.error('Error saving schedule:', err);
        alert('Error saving schedule to backend: ' + err.message);
      }
      
      setDragStart(null);
      setDragEnd(null);
    }
  };
  
  const isDayInDragRange = (projectId, dayIdx) => {
    if (!dragStart || !dragEnd) return false;
    if (dragStart.projectId !== projectId) return false;
    const start = Math.min(dragStart.dayIdx, dragEnd.dayIdx);
    const end = Math.max(dragStart.dayIdx, dragEnd.dayIdx);
    return dayIdx >= start && dayIdx <= end;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6" style={{ overflow: 'hidden' }}>
      {/* Loading Indicator */}
      {loading && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-blue-700">Loading schedules from server...</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Project Schedules</h1>
          <p className="text-gray-600">Drag materials and labor buttons to schedule projects</p>
        </div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <PlusIcon className="w-4 h-4" />
              Add Project
            </button>
            <select 
              value={viewMode} 
              onChange={(e) => setViewMode(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="weekly">Weekly View</option>
              <option value="daily">Daily View</option>
              <option value="monthly">Monthly View</option>
            </select>
          </div>
        </div>

        {/* Navigation and Search */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={goToToday}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Today
            </button>
            <button 
              onClick={loadSchedulesFromBackend}
              disabled={loading}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <div className="flex items-center gap-2">
              <button 
                onClick={goToPreviousWeek}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <span className="text-lg font-semibold text-gray-900">
                {formatDateRange(weekStart, new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000))}
              </span>
              <button 
                onClick={goToNextWeek}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
              />
            </div>
            <select 
              value={filterTrade} 
              onChange={(e) => setFilterTrade(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Trades</option>
              {trades.map(trade => (
                <option key={trade} value={trade}>{trade}</option>
              ))}
            </select>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="LEAD">Lead Phase</option>
              <option value="PROSPECT">Prospect</option>
              <option value="APPROVED">Approved Phase</option>
              <option value="EXECUTION">Execution Phase</option>
              <option value="SUPPLEMENT">2nd Supplement Phase</option>
              <option value="COMPLETION">Completion Phase</option>
            </select>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-semibold text-blue-800">How to Schedule:</span>
        </div>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• Drag the <span className="font-semibold">Materials</span> or <span className="font-semibold">Labor</span> buttons from each project row</p>
          <p>• Drop them onto the calendar days to schedule delivery or work</p>
          <p>• Drag across multiple days to schedule longer periods</p>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto" style={{ overflowY: 'hidden' }}>
          <table className="min-w-full table-fixed" style={{ tableLayout: 'fixed' }}>
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="sticky left-0 z-20 bg-gray-50 border-r border-gray-200 px-4 py-2 text-left text-sm font-semibold text-gray-900 w-64">
                  Projects
                </th>
                {weekDays.map((day, i) => (
                  <th key={i} className="px-4 py-4 text-center text-sm font-semibold text-gray-900 w-32">
                    <div className="flex flex-col items-center">
                      <span className="text-gray-500 text-xs">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                      <span className="text-lg font-bold">{day.getDate()}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project, idx) => (
                <tr key={project.id} className="border-b border-gray-100 hover:bg-gray-50">
                  {/* Project label */}
                  <td
                    className="sticky left-0 z-10 bg-white border-r border-gray-200 px-3 py-2 align-top group"
                    onMouseEnter={() => setHoveredProjectId(project.id)}
                    onMouseLeave={() => setHoveredProjectId(null)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${getProjectColor(project.type)}`}>
                        {project.type?.[0] || 'P'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 truncate">{project.name}</div>
                        <div className="text-xs text-gray-600 truncate">{project.client?.name}</div>
                        
                        {/* Drag and Drop Icons */}
                        <div className="flex gap-1 mt-1">
                          <button
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-semibold cursor-grab active:cursor-grabbing"
                            draggable
                            onDragStart={e => handleDragStart(e, project, 'materials')}
                            title="Drag to schedule materials delivery"
                          >
                            <TruckIcon className="w-3 h-3" /> Materials
                          </button>
                          <button
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-100 hover:bg-green-200 text-green-700 text-xs font-semibold cursor-grab active:cursor-grabbing"
                            draggable
                            onDragStart={e => handleDragStart(e, project, 'labor')}
                            title="Drag to schedule labor"
                          >
                            <WrenchScrewdriverIcon className="w-3 h-3" /> Labor
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  {/* Days */}
                  {weekDays.map((day, colIdx) => {
                    const hasMaterials = isMaterialsOnDay(project, day);
                    const hasLabor = isLaborOnDay(project, day);
                    const isDrag = isDayInDragRange(project.id, colIdx);
                    
                    return (
                      <td
                        key={colIdx}
                        className={`align-top px-2 py-2 w-32 h-20 border-r border-gray-100 ${isDrag ? (selectedScheduleType === 'materials' ? 'bg-blue-200' : 'bg-green-200') : ''}`}
                        data-project-id={project.id}
                        data-day-idx={colIdx}
                        onMouseDown={() => handleDayMouseDown(project.id, colIdx)}
                        onMouseEnter={() => handleDayMouseEnter(project.id, colIdx)}
                        onMouseMove={() => handleDayMouseMove(project.id, colIdx)}
                        onMouseUp={() => handleDayMouseUp(project.id, colIdx)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.style.backgroundColor = draggedProject ? 
                            (draggedProject.type === 'materials' ? '#dbeafe' : '#dcfce7') : '';
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '';
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.style.backgroundColor = '';
                          if (draggedProject) {
                            handleDayMouseUp(project.id, colIdx);
                          }
                        }}
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                      >
                        <div className="space-y-2">
                          {/* Materials Schedule Block */}
                          {hasMaterials && (
                            <div className="group cursor-pointer" onClick={() => setModalProject(project)}>
                              <div className="bg-blue-100 border border-blue-300 rounded-lg p-2 shadow-sm hover:shadow-md transition-all duration-200">
                                <div className="flex items-center gap-1 mb-1">
                                  <TruckIcon className="w-3 h-3 text-blue-600" />
                                  <span className="text-xs font-medium text-blue-800">Materials</span>
                                </div>
                                <div className="text-xs text-blue-700">
                                  {getMaterialStatus(project).text}
                                </div>
                              </div>
                            </div>
                          )}
                          {/* Labor Schedule Block */}
                          {hasLabor && (
                            <div className="group cursor-pointer" onClick={() => setModalProject(project)}>
                              <div className="bg-green-100 border border-green-300 rounded-lg p-2 shadow-sm hover:shadow-md transition-all duration-200">
                                <div className="flex items-center gap-1 mb-1">
                                  <WrenchScrewdriverIcon className="w-3 h-3 text-green-600" />
                                  <span className="text-xs font-medium text-green-800">Labor</span>
                                </div>
                                <div className="text-xs text-green-700">
                                  {getLaborStatus(project).text}
                                </div>
                              </div>
                            </div>
                          )}
                          {/* Empty slot for scheduling */}
                          {!hasMaterials && !hasLabor && (
                            <div 
                              className="h-12 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 cursor-pointer flex items-center justify-center" 
                              style={{ minHeight: '48px' }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.currentTarget.style.borderColor = '#3b82f6';
                                e.currentTarget.style.backgroundColor = '#eff6ff';
                              }}
                              onDragLeave={(e) => {
                                e.currentTarget.style.borderColor = '';
                                e.currentTarget.style.backgroundColor = '';
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.currentTarget.style.borderColor = '';
                                e.currentTarget.style.backgroundColor = '';
                                if (draggedProject) {
                                  handleDayMouseUp(project.id, colIdx);
                                }
                              }}
                            >
                              <span className="text-xs text-gray-400">Drop to schedule</span>
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              
              {/* Unscheduled Projects Row */}
              {unscheduled.length > 0 && (
                <tr className="border-t-2 border-yellow-300 bg-yellow-50">
                  <td className="sticky left-0 z-10 bg-yellow-50 border-r border-gray-200 px-6 py-4 align-top">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm bg-yellow-500">
                        ?
                      </div>
                      <div>
                        <div className="font-semibold text-yellow-900">Unscheduled Projects</div>
                        <div className="text-xs text-yellow-700">{unscheduled.length} projects</div>
                      </div>
                    </div>
                  </td>
                  <td colSpan={weekDays.length} className="px-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {unscheduled.map(project => (
                        <div 
                          key={project.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, project, 'materials')}
                          className="group cursor-pointer"
                          onClick={() => setModalProject(project)}
                        >
                          <div className="rounded-lg p-3 shadow-sm border border-yellow-300 bg-white hover:shadow-md transition-all duration-200">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm text-gray-900 truncate">
                                  {project.name}
                                </div>
                                <div className="text-xs text-gray-600 truncate">
                                  {project.client?.name}
                                </div>
                              </div>
                              {getStatusIcon(project.status)}
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getProjectColor(project.type)} text-white`}>
                                {project.type}
                              </span>
                              <span className="text-gray-600">
                                ${project.estimateValue?.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Project Details Modal */}
      {modalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${getProjectColor(modalProject.type)}`}>
                    {modalProject.type?.[0] || 'P'}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{modalProject.name}</h3>
                    <p className="text-sm text-gray-600">{modalProject.type}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setModalProject(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Project Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Client:</span>
                      <span className="font-medium">{modalProject.client?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Location:</span>
                      <span className="font-medium">{modalProject.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Project Manager:</span>
                      <span className="font-medium">{modalProject.projectManager ? `${modalProject.projectManager.firstName} ${modalProject.projectManager.lastName}` : 'Not Assigned'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Value:</span>
                      <span className="font-medium">${modalProject.estimateValue?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Schedule & Status</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Labor Period:</span>
                      <span className="font-medium">
                        {modalProject.laborStart ? 
                          formatDateRange(modalProject.laborStart, modalProject.laborEnd) : 
                          'Not Scheduled'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Materials:</span>
                      <span className="font-medium">
                        {modalProject.materialsDeliveryStart ? 
                          formatDateRange(modalProject.materialsDeliveryStart, modalProject.materialsDeliveryEnd) : 
                          'Not Scheduled'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Progress:</span>
                      <span className="font-medium">{modalProject.progress || 0}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        modalProject.status === 'active' ? 'bg-green-100 text-green-800' :
                        modalProject.status === 'planning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {modalProject.status.charAt(0).toUpperCase() + modalProject.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Progress</h4>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-500" 
                    style={{ width: `${modalProject.progress || 0}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                  Edit Project
                </button>
                
                {/* Materials Scheduling */}
                {!modalProject.materialsDeliveryStart ? (
                  <button 
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                    onClick={() => {
                      setSelectedScheduleType('materials');
                      setShowDatePickers(true);
                    }}
                  >
                    Schedule Materials
                  </button>
                ) : (
                  <button 
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                    onClick={() => {
                      const updatedProject = { ...modalProject, materialsDeliveryStart: null, materialsDeliveryEnd: null };
                      const updatedProjects = projects.map(p => p.id === modalProject.id ? updatedProject : p);
                      setProjects(updatedProjects);
                      saveProjectsToStorage(updatedProjects);
                      setModalProject(null);
                    }}
                  >
                    Clear Materials
                  </button>
                )}
                
                {/* Labor Scheduling */}
                {!modalProject.laborStart ? (
                  <button 
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                    onClick={() => {
                      setSelectedScheduleType('labor');
                      setShowDatePickers(true);
                    }}
                  >
                    Schedule Labor
                  </button>
                ) : (
                  <button 
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                    onClick={() => {
                      const updatedProject = { ...modalProject, laborStart: null, laborEnd: null };
                      const updatedProjects = projects.map(p => p.id === modalProject.id ? updatedProject : p);
                      setProjects(updatedProjects);
                      saveProjectsToStorage(updatedProjects);
                      setModalProject(null);
                    }}
                  >
                    Clear Labor
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Date Picker Modal */}
      {showDatePickers && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                Schedule {selectedScheduleType === 'materials' ? 'Materials Delivery' : 'Labor'}
              </h3>
              <button 
                onClick={() => {
                  setShowDatePickers(false);
                  setMaterialsStartDate('');
                  setMaterialsEndDate('');
                  setLaborStartDate('');
                  setLaborEndDate('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="w-6 h-6" />
              </button>
            </div>

            {selectedScheduleType === 'materials' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Materials Delivery Start Date
                  </label>
                  <input
                    type="date"
                    value={materialsStartDate}
                    onChange={(e) => setMaterialsStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Materials Delivery End Date
                  </label>
                  <input
                    type="date"
                    value={materialsEndDate}
                    onChange={(e) => setMaterialsEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={() => scheduleMaterials(modalProject)}
                  disabled={!materialsStartDate || !materialsEndDate}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Schedule Materials
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Labor Start Date
                  </label>
                  <input
                    type="date"
                    value={laborStartDate}
                    onChange={(e) => setLaborStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Labor End Date
                  </label>
                  <input
                    type="date"
                    value={laborEndDate}
                    onChange={(e) => setLaborEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <button
                  onClick={() => scheduleLabor(modalProject)}
                  disabled={!laborStartDate || !laborEndDate}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Schedule Labor
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 