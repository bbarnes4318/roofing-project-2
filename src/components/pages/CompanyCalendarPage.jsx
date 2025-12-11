import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon, PlusCircleIcon } from '../common/Icons';
import { authService, usersService } from '../../services/api';

const ChevronRightIcon = ({ className = "w-5 h-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
);

// Error Boundary to catch rendering errors and display graceful fallback
class CalendarErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Calendar Error Boundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 text-center">
                    <div className="text-red-500 text-xl font-bold mb-4">Something went wrong</div>
                    <p className="text-gray-600 mb-4">There was an error loading the calendar.</p>
                    <button 
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Try Again
                    </button>
                    <pre className="mt-4 p-4 bg-gray-100 rounded text-left text-xs overflow-auto max-h-40">
                        {this.state.error?.toString()}
                    </pre>
                </div>
            );
        }
        return this.props.children;
    }
}

const CompanyCalendarPage = ({ projects, tasks, activities, colorMode, onProjectSelect }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('month');
    const [calendarView, setCalendarView] = useState('team');
    const [teamMembers, setTeamMembers] = useState([]);
    const [selectedAssignees, setSelectedAssignees] = useState([]);
    const [filterType, setFilterType] = useState('all');
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showEventModal, setShowEventModal] = useState(false);
    const [showAddEventModal, setShowAddEventModal] = useState(false);
    const [calendarEvents, setCalendarEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [newEvent, setNewEvent] = useState({
        title: '',
        type: 'meeting',
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        description: '',
        projectId: '',
        priority: 'medium'
    });

    // User Calendar Visibility State
    const [userCalendarVisibility, setUserCalendarVisibility] = useState({});
    const [showUserPanel, setShowUserPanel] = useState(false);
    
    // Work Scheduler State
    const [showWorkScheduler, setShowWorkScheduler] = useState(false);
    
    // Color Coding - 20 Preset Colors
    const colorPresets = [
        '#3B82F6', '#2563EB', '#1D4ED8', '#7C3AED', '#8B5CF6', // Blues & Purples
        '#10B981', '#059669', '#047857', '#14B8A6', '#06B6D4', // Greens & Teals
        '#F59E0B', '#D97706', '#B45309', '#EF4444', '#DC2626', // Oranges & Reds
        '#EC4899', '#DB2777', '#6366F1', '#4B5563', '#6B7280'  // Pinks & Grays
    ];
    const [userColors, setUserColors] = useState({});
    const [showColorPicker, setShowColorPicker] = useState(null); // userId when open
    
    // Search & Recent Events State  
    const [searchQuery, setSearchQuery] = useState('');
    const [searchDateRange, setSearchDateRange] = useState('3y'); // Default: 3 years
    const [dateRangeFilter, setDateRangeFilter] = useState('all');
    const [showRecentEvents, setShowRecentEvents] = useState(false);
    const [recentEvents, setRecentEvents] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [recentlyAdded, setRecentlyAdded] = useState([]); // Audit trail - last 15 created events
    const [showRecentlyAdded, setShowRecentlyAdded] = useState(false);

    // Helper: identify alert-type events that should NOT appear on Company Calendar
    const isAlertEvent = (evt) => {
        const type = (evt?.type || '').toLowerCase();
        const title = (evt?.title || '');
        const titleLower = title.toLowerCase();
        // Treat workflow/task alerts and explicit alerts as alerts
        // Exclude anything clearly marked as an alert from the Company Calendar
        return (
            type === 'task' ||
            type === 'alert' ||
            title.includes('⚠️') ||
            titleLower.includes('alert')
        );
    };

    // Fetch current user
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const user = await authService.getCurrentUser();
                setCurrentUser(user);
            } catch (error) {
                console.error('Failed to fetch current user:', error);
            }
        };
        fetchUser();
    }, []);

    // Helper function to save calendar color to database
    const saveCalendarColor = async (userId, color) => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/users/${userId}/calendar-color`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ calendarColor: color })
            });
            
            if (response.ok) {
                console.log(`✅ Calendar color saved for user ${userId}: ${color}`);
            } else {
                console.error('Failed to save calendar color:', await response.text());
            }
        } catch (error) {
            console.error('Error saving calendar color:', error);
        }
    };

    // Handle color change - update local state and save to database
    const handleColorChange = (userId, color) => {
        setUserColors(prev => ({ ...prev, [userId]: color }));
        saveCalendarColor(userId, color);
        setShowColorPicker(null);
    };

    // Fetch calendar events from database
    const fetchCalendarEvents = async (isBackgroundRefresh = false) => {
        try {
            // Use isRefreshing for background updates, loading for initial load
            if (isBackgroundRefresh) {
                setIsRefreshing(true);
            } else {
                setLoading(true);
            }
            
            // Use localStorage as single source of truth for auth token
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/calendar-events?view=${calendarView}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });
            if (response.ok) {
                const data = await response.json();
                // Handle API response structure: { success: true, data: { events: [...], count: N } }
                let events = [];
                if (Array.isArray(data)) {
                    events = data;
                } else if (data.data?.events && Array.isArray(data.data.events)) {
                    events = data.data.events;
                } else if (data.data && Array.isArray(data.data)) {
                    events = data.data;
                } else if (data.events && Array.isArray(data.events)) {
                    events = data.events;
                }
                // Proactively remove alert-type records from the source list as well
                setCalendarEvents(events.filter(e => !isAlertEvent(e)));
                setLastUpdated(new Date());
            }
        } catch (error) {
            console.error('Error fetching calendar events:', error);
            setCalendarEvents([]); // Ensure we always have an array
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    // Fetch recently added events (audit trail - sorted by creation time)
    const fetchRecentlyAdded = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/calendar-events/recent', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                let events = [];
                if (data.data?.events) {
                    events = data.data.events;
                } else if (Array.isArray(data.data)) {
                    events = data.data;
                }
                setRecentlyAdded(events);
                console.log('📅 Fetched', events.length, 'recently added events');
            }
        } catch (error) {
            console.error('Error fetching recently added events:', error);
        }
    };

    // Deep search events with date range filter
    const searchEvents = async (query, dateRange = '3y') => {
        if (!query || query.trim().length < 2) {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }
        
        setIsSearching(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/calendar-events/search?query=${encodeURIComponent(query)}&dateRange=${dateRange}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                let events = [];
                if (data.data?.events) {
                    events = data.data.events;
                } else if (Array.isArray(data.data)) {
                    events = data.data;
                }
                setSearchResults(events);
                setShowSearchResults(true);
                console.log(`📅 Search found ${events.length} events for "${query}" within ${dateRange}`);
            }
        } catch (error) {
            console.error('Error searching events:', error);
        } finally {
            setIsSearching(false);
        }
    };

    // Fetch events on component mount and set up real-time updates
    useEffect(() => {
        fetchCalendarEvents(); // Initial load with full loading state
        
        // Set up polling interval for real-time updates (every 30 seconds)
        const pollInterval = setInterval(() => {
            fetchCalendarEvents(true); // Background refresh - no full loading spinner
        }, 30000);
        
        // Listen for custom event when a new calendar event is added
        const handleCalendarUpdate = () => {
            console.log('📅 Calendar update event received - refreshing...');
            fetchCalendarEvents(true); // Background refresh
        };
        window.addEventListener('calendar:eventAdded', handleCalendarUpdate);
        window.addEventListener('calendar:eventUpdated', handleCalendarUpdate);
        window.addEventListener('calendar:eventDeleted', handleCalendarUpdate);
        
        // Also refresh when window regains focus (user comes back to tab)
        const handleFocus = () => {
            fetchCalendarEvents(true); // Background refresh
        };
        window.addEventListener('focus', handleFocus);
        
        // Cleanup
        return () => {
            clearInterval(pollInterval);
            window.removeEventListener('calendar:eventAdded', handleCalendarUpdate);
            window.removeEventListener('calendar:eventUpdated', handleCalendarUpdate);
            window.removeEventListener('calendar:eventDeleted', handleCalendarUpdate);
            window.removeEventListener('focus', handleFocus);
        };
    }, [calendarView]);

    // Fetch team members
    useEffect(() => {
        const fetchTeam = async () => {
            try {
                const response = await usersService.getTeamMembers();
                console.log('Calendar: fetchTeam response:', response);
                
                // Safely extract team members array - handle various response formats
                let members = [];
                
                // Check if response has data property which has teamMembers array (Standard API format)
                if (response && response.data && Array.isArray(response.data.teamMembers)) {
                    console.log('Calendar: Found members in response.data.teamMembers');
                    members = response.data.teamMembers;
                }
                // Check if response has teamMembers array directly
                else if (response && Array.isArray(response.teamMembers)) {
                    console.log('Calendar: Found members in response.teamMembers');
                    members = response.teamMembers;
                }
                // Check if response.data is the array itself
                else if (response && Array.isArray(response.data)) {
                    console.log('Calendar: Found members in response.data');
                    members = response.data;
                } 
                // Check if response itself is the array
                else if (Array.isArray(response)) {
                    console.log('Calendar: Found members in response array');
                    members = response;
                }
                
                console.log(`Calendar: Setting ${members.length} team members`);
                setTeamMembers(members);
                
                // Initialize userColors from saved calendarColor values or use presets as fallback
                const initialColors = {};
                members.forEach((member, index) => {
                    if (member.calendarColor) {
                        initialColors[member.id] = member.calendarColor;
                    } else {
                        // Use preset color based on index if no saved color
                        initialColors[member.id] = colorPresets[index % colorPresets.length];
                    }
                });
                setUserColors(prevColors => ({ ...initialColors, ...prevColors }));
                
                // Initialize all team members as visible by default
                const initialVisibility = {};
                members.forEach(member => {
                    initialVisibility[member.id] = true;
                });
                setUserCalendarVisibility(prevVis => ({ ...initialVisibility, ...prevVis }));
                
            } catch (error) {
                console.error('Failed to fetch team members:', error);
                setTeamMembers([]); // Ensure we always have an array on error
            }
        };
        fetchTeam();
    }, []);

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        
        const days = [];
        
        // Previous month days
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const prevDate = new Date(year, month, -i);
            days.push({ date: prevDate, isCurrentMonth: false, events: getEventsForDate(prevDate) });
        }
        
        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            const currentDate = new Date(year, month, i);
            days.push({ date: currentDate, isCurrentMonth: true, events: getEventsForDate(currentDate) });
        }
        
        // Next month days
        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            const nextDate = new Date(year, month + 1, i);
            days.push({ date: nextDate, isCurrentMonth: false, events: getEventsForDate(nextDate) });
        }
        
        return days;
    };

    // Get days in current week for Week view
    const getDaysInWeek = (date) => {
        const currentDay = date.getDay(); // 0 = Sunday
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - currentDay);
        
        const days = [];
        for (let i = 0; i < 7; i++) {
            const weekDate = new Date(startOfWeek);
            weekDate.setDate(startOfWeek.getDate() + i);
            days.push({
                date: weekDate,
                isCurrentMonth: weekDate.getMonth() === date.getMonth(),
                events: getEventsForDate(weekDate)
            });
        }
        return days;
    };

    // Get hour slots for Day view (6 AM to 9 PM)
    const getHoursForDay = (date) => {
        const hours = [];
        for (let hour = 6; hour <= 21; hour++) {
            const timeStr = hour < 12 
                ? `${hour}:00 AM` 
                : hour === 12 
                    ? `12:00 PM` 
                    : `${hour - 12}:00 PM`;
            
            // Filter events for this hour
            const dayEvents = getEventsForDate(date);
            const hourEvents = dayEvents.filter(event => {
                if (!event.time) return false;
                const eventHour = parseInt(event.time.split(':')[0]);
                const isPM = event.time.toLowerCase().includes('pm');
                const hour24 = isPM && eventHour !== 12 ? eventHour + 12 : eventHour;
                return hour24 === hour;
            });
            
            hours.push({
                hour,
                timeStr,
                events: hourEvents
            });
        }
        return hours;
    };

    const getEventsForDate = (date) => {
        const events = [];
        const dateString = date.toDateString();
        const dateOnly = date.toISOString().split('T')[0]; // Get YYYY-MM-DD format
        
        // Database calendar events - ensure calendarEvents is always an array
        if (Array.isArray(calendarEvents)) {
            calendarEvents.forEach(event => {
                // Backend returns startTime as ISO datetime, extract the date part
                // Handle both old format (event.date) and new format (event.startTime)
                let eventDate = null;
                let eventTime = null;
                
                if (event.startTime) {
                    // New format from backend: startTime is ISO datetime
                    const startTimeDate = new Date(event.startTime);
                    eventDate = startTimeDate.toISOString().split('T')[0];
                    // Format time as "9:00 AM" style
                    eventTime = startTimeDate.toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit', 
                        hour12: true 
                    });
                } else if (event.date) {
                    // Old format: date is already YYYY-MM-DD string
                    eventDate = event.date;
                    eventTime = event.time;
                }
                
                if (eventDate === dateOnly) {
                    // Get the organizer ID for visibility check and color
                    const organizerId = event.organizer?.id || event.organizerId;
                    
                    // Filter by user visibility - if organizer is hidden, skip this event
                    // (unless no visibility settings exist yet - show all by default)
                    const hasVisibilitySettings = Object.keys(userCalendarVisibility).length > 0;
                    if (hasVisibilitySettings && organizerId && userCalendarVisibility[organizerId] === false) {
                        return; // Skip events from hidden users
                    }
                    
                    // Determine event color - use organizer's calendar color if available
                    let eventColor = event.color || getEventColor(event.eventType?.toLowerCase() || event.type);
                    if (organizerId && userColors[organizerId]) {
                        eventColor = userColors[organizerId];
                    }
                    
                    const candidate = {
                        id: event.id || event._id || `db-event-${event.title}-${Date.now()}`,
                        title: event.title,
                        type: event.eventType?.toLowerCase() || event.type || 'meeting',
                        time: eventTime || event.time,
                        priority: event.priority || 'medium',
                        color: eventColor,
                        description: event.description,
                        projectId: event.projectId,
                        attendees: event.attendees,
                        organizer: event.organizer,
                        organizerId: organizerId,
                        startTime: event.startTime,
                        endTime: event.endTime
                    };
                    if (!isAlertEvent(candidate)) {
                        events.push(candidate);
                    }
                }
            });
        }
        
        // Project work events (materials delivery and labor start only)
        (projects || []).forEach(project => {
            if (project.materialsDeliveryStart && new Date(project.materialsDeliveryStart).toDateString() === dateString) {
                events.push({
                    id: `delivery-${project.id}`,
                    title: `📦 ${project.projectName || project.name} - Materials`,
                    type: 'delivery',
                    project: project,
                    time: '8:00 AM',
                    priority: 'medium',
                    color: 'bg-amber-500'
                });
            }
            
            if (project.laborStart && new Date(project.laborStart).toDateString() === dateString) {
                events.push({
                    id: `labor-${project.id}`,
                    title: `👷 ${project.projectName || project.name} - Labor`,
                    type: 'labor',
                    project: project,
                    time: '7:00 AM',
                    priority: 'medium',
                    color: 'bg-indigo-500'
                });
            }
        });
        
        
        // Mock events - Comprehensive construction company calendar
        const mockEvents = [
            // January 2024
            { date: '2024-01-02', title: '🏢 New Year Office Meeting', type: 'meeting', time: '9:00 AM' },
            { date: '2024-01-03', title: '🔧 Equipment Calibration', type: 'maintenance', time: '8:00 AM' },
            { date: '2024-01-05', title: '📋 Weekly Safety Briefing', type: 'meeting', time: '7:30 AM' },
            { date: '2024-01-08', title: '👥 Client Consultation - Johnson Roof', type: 'meeting', time: '10:00 AM' },
            { date: '2024-01-09', title: '📊 Monthly Financial Review', type: 'meeting', time: '2:00 PM' },
            { date: '2024-01-10', title: '🛠️ Tool Maintenance Day', type: 'maintenance', time: '8:00 AM' },
            { date: '2024-01-12', title: '📋 Weekly Safety Briefing', type: 'meeting', time: '7:30 AM' },
            { date: '2024-01-15', title: '📅 Safety Training - Fall Protection', type: 'training', time: '10:00 AM' },
            // { date: '2024-01-16', title: '👥 Site Inspection - Downtown Project', type: 'inspection', time: '9:00 AM' },
            { date: '2024-01-17', title: '📝 Permit Application Deadline', type: 'deadline', time: '5:00 PM' },
            { date: '2024-01-19', title: '📋 Weekly Safety Briefing', type: 'meeting', time: '7:30 AM' },
            // { date: '2024-01-22', title: '👥 Supplier Meeting - Materials', type: 'meeting', time: '11:00 AM' },
            { date: '2024-01-23', title: '🔧 Vehicle Maintenance', type: 'maintenance', time: '8:00 AM' },
            { date: '2024-01-24', title: '📊 Project Progress Review', type: 'meeting', time: '1:00 PM' },
            { date: '2024-01-26', title: '📋 Weekly Safety Briefing', type: 'meeting', time: '7:30 AM' },
            { date: '2024-01-29', title: '👥 Insurance Agent Meeting', type: 'meeting', time: '3:00 PM' },
            { date: '2024-01-30', title: '📅 OSHA Compliance Training', type: 'training', time: '9:00 AM' },
            { date: '2024-01-31', title: '📝 Monthly Reports Due', type: 'deadline', time: '5:00 PM' },

            // February 2024
            { date: '2024-02-02', title: '📋 Weekly Safety Briefing', type: 'meeting', time: '7:30 AM' },
            { date: '2024-02-05', title: '👥 Client Meeting - Smith Residence', type: 'meeting', time: '10:00 AM' },
            { date: '2024-02-06', title: '🔧 Equipment Inventory Check', type: 'maintenance', time: '8:00 AM' },
            { date: '2024-02-07', title: '📊 Quarterly Planning Session', type: 'meeting', time: '2:00 PM' },
            { date: '2024-02-09', title: '📋 Weekly Safety Briefing', type: 'meeting', time: '7:30 AM' },
            { date: '2024-02-12', title: '👥 Subcontractor Coordination', type: 'meeting', time: '11:00 AM' },
            { date: '2024-02-13', title: '🛠️ Safety Equipment Inspection', type: 'inspection', time: '8:00 AM' },
            { date: '2024-02-14', title: '📅 First Aid Training', type: 'training', time: '10:00 AM' },
            { date: '2024-02-16', title: '📋 Weekly Safety Briefing', type: 'meeting', time: '7:30 AM' },
            { date: '2024-02-19', title: '👥 Site Walkthrough - New Project', type: 'inspection', time: '9:00 AM' },
            { date: '2024-02-20', title: '📝 Insurance Renewal Deadline', type: 'deadline', time: '4:00 PM' },
            { date: '2024-02-21', title: '🔧 Generator Maintenance', type: 'maintenance', time: '8:00 AM' },
            { date: '2024-02-23', title: '📋 Weekly Safety Briefing', type: 'meeting', time: '7:30 AM' },
            { date: '2024-02-26', title: '👥 Team Building Event', type: 'meeting', time: '12:00 PM' },
            { date: '2024-02-27', title: '📊 Budget Review Meeting', type: 'meeting', time: '1:00 PM' },
            { date: '2024-02-28', title: '📅 CPR Certification Renewal', type: 'training', time: '9:00 AM' },
            { date: '2024-02-29', title: '📝 Monthly Safety Reports', type: 'deadline', time: '5:00 PM' },

            // March 2024
            { date: '2024-03-01', title: '📋 Weekly Safety Briefing', type: 'meeting', time: '7:30 AM' },
            { date: '2024-03-04', title: '👥 Client Presentation - Large Project', type: 'meeting', time: '10:00 AM' },
            { date: '2024-03-05', title: '🔧 Compressor Maintenance', type: 'maintenance', time: '8:00 AM' },
            { date: '2024-03-06', title: '📊 Annual Planning Session', type: 'meeting', time: '2:00 PM' },
            { date: '2024-03-08', title: '📋 Weekly Safety Briefing', type: 'meeting', time: '7:30 AM' },
            { date: '2024-03-11', title: '👥 Architect Meeting - Design Review', type: 'meeting', time: '11:00 AM' },
            { date: '2024-03-12', title: '🛠️ Scaffolding Inspection', type: 'inspection', time: '8:00 AM' },
            { date: '2024-03-13', title: '📅 Hazard Communication Training', type: 'training', time: '10:00 AM' },
            { date: '2024-03-15', title: '📋 Weekly Safety Briefing', type: 'meeting', time: '7:30 AM' },
            { date: '2024-03-18', title: '👥 Quality Control Review', type: 'meeting', time: '1:00 PM' },
            { date: '2024-03-19', title: '📝 Contract Renewal Deadline', type: 'deadline', time: '4:00 PM' },
            { date: '2024-03-20', title: '🔧 Welding Equipment Check', type: 'maintenance', time: '8:00 AM' },
            { date: '2024-03-22', title: '📋 Weekly Safety Briefing', type: 'meeting', time: '7:30 AM' },
            { date: '2024-03-25', title: '👥 Site Safety Audit', type: 'inspection', time: '9:00 AM' },
            { date: '2024-03-26', title: '📊 Performance Review Meeting', type: 'meeting', time: '2:00 PM' },
            { date: '2024-03-27', title: '📅 Confined Space Training', type: 'training', time: '10:00 AM' },
            { date: '2024-03-29', title: '📋 Weekly Safety Briefing', type: 'meeting', time: '7:30 AM' },
            { date: '2024-03-31', title: '📝 Quarterly Reports Due', type: 'deadline', time: '5:00 PM' },

            // April 2024
            { date: '2024-04-01', title: '🏢 Spring Safety Kickoff', type: 'meeting', time: '8:00 AM' },
            { date: '2024-04-02', title: '🔧 Spring Equipment Maintenance', type: 'maintenance', time: '8:00 AM' },
            { date: '2024-04-03', title: '👥 New Project Kickoff Meeting', type: 'meeting', time: '10:00 AM' },
            { date: '2024-04-05', title: '📋 Weekly Safety Briefing', type: 'meeting', time: '7:30 AM' },
            // { date: '2024-04-08', title: '👥 Client Site Visit - Wilson Project', type: 'meeting', time: '11:00 AM' },
            { date: '2024-04-09', title: '🛠️ Electrical Safety Inspection', type: 'inspection', time: '8:00 AM' },
            { date: '2024-04-10', title: '📅 Ladder Safety Training', type: 'training', time: '10:00 AM' },
            { date: '2024-04-12', title: '📋 Weekly Safety Briefing', type: 'meeting', time: '7:30 AM' },
            { date: '2024-04-15', title: '👥 Subcontractor Safety Meeting', type: 'meeting', time: '9:00 AM' },
            { date: '2024-04-16', title: '📝 Tax Filing Deadline', type: 'deadline', time: '5:00 PM' },
            { date: '2024-04-17', title: '🔧 Crane Inspection', type: 'maintenance', time: '8:00 AM' },
            { date: '2024-04-19', title: '📋 Weekly Safety Briefing', type: 'meeting', time: '7:30 AM' },
            { date: '2024-04-22', title: '👥 Project Completion Review', type: 'meeting', time: '1:00 PM' },
            { date: '2024-04-23', title: '📊 Monthly Financial Review', type: 'meeting', time: '2:00 PM' },
            { date: '2024-04-24', title: '📅 Personal Protective Equipment Training', type: 'training', time: '10:00 AM' },
            { date: '2024-04-26', title: '📋 Weekly Safety Briefing', type: 'meeting', time: '7:30 AM' },
            { date: '2024-04-29', title: '👥 Insurance Claim Meeting', type: 'meeting', time: '3:00 PM' },
            { date: '2024-04-30', title: '📝 Monthly Reports Due', type: 'deadline', time: '5:00 PM' },

            // May 2024
            { date: '2024-05-01', title: '📋 Weekly Safety Briefing', type: 'meeting', time: '7:30 AM' },
            { date: '2024-05-03', title: '👥 Client Meeting - Summer Projects', type: 'meeting', time: '10:00 AM' },
            { date: '2024-05-06', title: '🔧 HVAC System Maintenance', type: 'maintenance', time: '8:00 AM' },
            { date: '2024-05-07', title: '📊 Q2 Planning Session', type: 'meeting', time: '2:00 PM' },
            { date: '2024-05-10', title: '📋 Weekly Safety Briefing', type: 'meeting', time: '7:30 AM' },
            { date: '2024-05-13', title: '👥 Site Safety Walkthrough', type: 'inspection', time: '9:00 AM' },
            { date: '2024-05-14', title: '📅 Heat Stress Training', type: 'training', time: '10:00 AM' },
            { date: '2024-05-17', title: '📋 Weekly Safety Briefing', type: 'meeting', time: '7:30 AM' },
            { date: '2024-05-20', title: '👥 Equipment Rental Meeting', type: 'meeting', time: '11:00 AM' },
            { date: '2024-05-21', title: '📝 Permit Renewal Deadline', type: 'deadline', time: '4:00 PM' },
            { date: '2024-05-22', title: '🔧 Excavator Maintenance', type: 'maintenance', time: '8:00 AM' },
            { date: '2024-05-24', title: '📋 Weekly Safety Briefing', type: 'meeting', time: '7:30 AM' },
            { date: '2024-05-27', title: '👥 Memorial Day Safety Briefing', type: 'meeting', time: '8:00 AM' },
            { date: '2024-05-28', title: '📊 Monthly Progress Review', type: 'meeting', time: '1:00 PM' },
            { date: '2024-05-29', title: '📅 Emergency Response Training', type: 'training', time: '10:00 AM' },
            { date: '2024-05-31', title: '📝 Monthly Reports Due', type: 'deadline', time: '5:00 PM' },

            // June 2024
            { date: '2024-06-03', title: '📋 Weekly Safety Briefing', type: 'meeting', time: '7:30 AM' },
            { date: '2024-06-05', title: '👥 Summer Project Kickoff', type: 'meeting', time: '10:00 AM' },
            { date: '2024-06-06', title: '🔧 Summer Equipment Prep', type: 'maintenance', time: '8:00 AM' },
            { date: '2024-06-07', title: '📋 Weekly Safety Briefing', type: 'meeting', time: '7:30 AM' },
            { date: '2024-06-10', title: '👥 Client Site Visit - Summer Homes', type: 'meeting', time: '11:00 AM' },
            { date: '2024-06-11', title: '🛠️ Summer Safety Inspection', type: 'inspection', time: '8:00 AM' },
            { date: '2024-06-12', title: '📅 Heat Illness Prevention Training', type: 'training', time: '10:00 AM' },
            { date: '2024-06-14', title: '📋 Weekly Safety Briefing', type: 'meeting', time: '7:30 AM' },
            { date: '2024-06-17', title: '👥 Subcontractor Summer Meeting', type: 'meeting', time: '9:00 AM' },
            { date: '2024-06-18', title: '📝 Insurance Mid-Year Review', type: 'deadline', time: '4:00 PM' },
            { date: '2024-06-19', title: '🔧 Cooling System Maintenance', type: 'maintenance', time: '8:00 AM' },
            { date: '2024-06-21', title: '📋 Weekly Safety Briefing', type: 'meeting', time: '7:30 AM' },
            { date: '2024-06-24', title: '👥 Summer Project Review', type: 'meeting', time: '1:00 PM' },
            { date: '2024-06-25', title: '📊 Q2 Financial Review', type: 'meeting', time: '2:00 PM' },
            { date: '2024-06-26', title: '📅 Summer Safety Training', type: 'training', time: '10:00 AM' },
            { date: '2024-06-28', title: '📋 Weekly Safety Briefing', type: 'meeting', time: '7:30 AM' },
            { date: '2024-06-30', title: '📝 Quarterly Reports Due', type: 'deadline', time: '5:00 PM' }
        ];

        // Add mock events for the current date
        mockEvents.forEach(mockEvent => {
            if (mockEvent.date === dateOnly) {
                events.push({
                    id: `mock-${mockEvent.date}-${mockEvent.type}`,
                    title: mockEvent.title,
                    type: mockEvent.type,
                    time: mockEvent.time,
                    priority: 'medium',
                    color: getEventColor(mockEvent.type)
                });
            }
        });
        
        return events;
    };

    const getEventColor = (type) => {
        switch (type) {
            case 'meeting':
                return 'bg-blue-500';
            case 'training':
                return 'bg-purple-500';
            case 'maintenance':
                return 'bg-orange-500';
            case 'inspection':
                return 'bg-yellow-500';
            case 'deadline':
                return 'bg-red-500';
            case 'project-start':
                return 'bg-green-500';
            case 'project-end':
                return 'bg-emerald-500';
            case 'delivery':
                return 'bg-amber-500';
            case 'labor':
                return 'bg-indigo-500';
            default:
                return 'bg-gray-500';
        }
    };

    const getFilteredEvents = (events) => {
        if (filterType === 'all') {
            return events;
        }
        return events.filter(event => event.type === filterType);
    };

    // Helper to determine if color is hex (from user calendar color) vs Tailwind class
    const isHexColor = (color) => color && color.startsWith('#');
    
    // Get event style - returns { className, style } for rendering
    const getEventStyle = (event) => {
        const color = event.color;
        if (isHexColor(color)) {
            // Hex color - use inline style
            return {
                className: 'text-white hover:opacity-90 shadow-sm',
                style: { backgroundColor: color }
            };
        } else {
            // Tailwind class - use className
            return {
                className: `${color} text-white hover:opacity-90 shadow-sm`,
                style: {}
            };
        }
    };

    const navigateMonth = (direction) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() + direction);
            return newDate;
        });
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    const isToday = (date) => {
        return date.toDateString() === new Date().toDateString();
    };

    const isSelected = (date) => {
        return date.toDateString() === selectedDate.toDateString();
    };

    const handleDateClick = (date) => {
        setSelectedDate(date);
    };

    const handleEventClick = (event) => {
        setSelectedEvent(event);
        setShowEventModal(true);
        
        // If it's a project event, also trigger project selection
        if (event.project && onProjectSelect) {
                                    onProjectSelect(event.project, 'Project Workflow', null, 'Company Calendar');
        }
    };

    const closeEventModal = () => {
        setShowEventModal(false);
        setSelectedEvent(null);
    };

    const handleAddEvent = () => {
        setShowAddEventModal(true);
    };

    const closeAddEventModal = () => {
        setShowAddEventModal(false);
        setNewEvent({
            title: '',
            type: 'meeting',
            date: new Date().toISOString().split('T')[0],
            time: '09:00',
            description: '',
            projectId: '',
            priority: 'medium'
        });
    };

    const handleNewEventChange = (field, value) => {
        setNewEvent(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmitNewEvent = async () => {
        if (!newEvent.title.trim()) {
            alert('Please enter an event title');
            return;
        }

        if (selectedAssignees.length === 0) {
            alert('Please assign at least one user');
            return;
        }

        try {
            // Format the time for display
            const timeString = newEvent.time;
            const [hours, minutes] = timeString.split(':');
            const timeDisplay = new Date(2000, 0, 1, hours, minutes).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });

            // Create the event object for API
            const startTime = new Date(`${newEvent.date}T${newEvent.time}:00`);
            const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // Add 1 hour
            
            const eventData = {
                title: newEvent.title,
                description: newEvent.description,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                eventType: newEvent.type.toUpperCase(),
                organizerId: currentUser?.id,
                projectId: newEvent.projectId || undefined,
                attendees: selectedAssignees.map(userId => ({ userId }))
            };

            // Make API call to save event
            // Use localStorage as single source of truth for auth token
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/calendar-events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(eventData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to create event');
            }

            const savedEvent = await response.json();
            console.log('✅ Calendar event created:', savedEvent);
            
            // Dispatch custom event for real-time updates across the app
            window.dispatchEvent(new CustomEvent('calendar:eventAdded', {
                detail: { event: savedEvent.data?.event }
            }));
            
            // Close modal and reset form
            closeAddEventModal();
            
            // Immediate refresh for instant feedback
            await fetchCalendarEvents();
            
        } catch (error) {
            console.error('Error creating event:', error);
            alert(`Failed to create event: ${error.message}`);
        }
    };

    const calendarDays = getDaysInMonth(currentDate);

    return (
        <div className="animate-fade-in w-full max-w-full">
            {/* Header Section */}
            <div className={`mb-4 p-4 rounded-xl shadow-lg ${colorMode ? 'bg-gradient-to-r from-[#1e293b] to-[#334155] border border-[#3b82f6]/20' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200'}`}>
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3">
                    <div className="flex-1">
                        <p className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Manage schedules, meetings, and important company events
                        </p>
                    </div>
                    
                    {/* Controls */}
                    <div className="flex items-center gap-2">
                        <div className={`flex rounded-md p-0.5 shadow-md ${colorMode ? 'bg-[#1e293b] border border-[#3b82f6]/30' : 'bg-white border border-gray-200'}`}>
                            {['month', 'week', 'day'].map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`px-2 py-0.5 text-xs font-medium rounded transition-all duration-200 ${
                                        viewMode === mode
                                            ? `${colorMode ? 'bg-[#3b82f6] text-white shadow-md' : 'bg-[var(--color-primary-blueprint-blue)] text-white shadow-md'}`
                                            : `${colorMode ? 'text-gray-300 hover:text-white hover:bg-[#374151]' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`
                                    }`}
                                >
                                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                </button>
                            ))}
                        </div>
                        
                        <button
                            onClick={handleAddEvent}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 shadow-lg ${
                                colorMode 
                                    ? 'bg-gradient-to-r from-[#3b82f6] to-[#2563eb] text-white hover:from-[#2563eb] hover:to-[#1d4ed8]' 
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
                            }`}
                        >
                            <PlusCircleIcon className="w-3 h-3" />
                            Add Event
                        </button>
                        
                        {/* Refresh Button with Status Indicator */}
                        <button
                            onClick={() => fetchCalendarEvents()}
                            disabled={isRefreshing || loading}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                                colorMode 
                                    ? 'bg-[#374151] text-gray-300 hover:bg-[#4b5563]' 
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            } ${(isRefreshing || loading) ? 'opacity-70' : ''}`}
                            title={lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Refresh calendar'}
                        >
                            <span className={`${isRefreshing ? 'animate-spin' : ''}`}>🔄</span>
                            {isRefreshing ? 'Syncing...' : 'Refresh'}
                        </button>
                        
                        {/* Real-time indicator */}
                        {lastUpdated && (
                            <span className={`text-[10px] ${colorMode ? 'text-gray-400' : 'text-gray-500'} hidden sm:inline`}>
                                Updated {lastUpdated.toLocaleTimeString()}
                            </span>
                        )}
                        
                        {/* Personal/Team View Toggle */}
                        <button
                            onClick={() => setCalendarView(calendarView === 'team' ? 'personal' : 'team')}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                calendarView === 'team'
                                    ? (colorMode ? 'bg-purple-600 text-white' : 'bg-purple-600 text-white')
                                    : (colorMode ? 'bg-[#374151] text-gray-300 hover:bg-[#4b5563]' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')
                            }`}
                            title={calendarView === 'team' ? 'Showing Team Calendar - Click to show Personal' : 'Showing Personal Calendar - Click to show Team'}
                        >
                            {calendarView === 'team' ? '👥 Team' : '👤 Personal'}
                        </button>
                        
                        {/* Filter Users Button - Shows Team Calendars Panel */}
                        <button
                            onClick={() => setShowUserPanel(!showUserPanel)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                showUserPanel
                                    ? (colorMode ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white')
                                    : (colorMode ? 'bg-[#374151] text-gray-300 hover:bg-[#4b5563]' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')
                            }`}
                            title="Toggle Team Calendars panel to filter by user and set colors"
                        >
                            🎨 Filter
                        </button>
                        
                        {/* Work Scheduler Toggle */}
                        <button
                            onClick={() => setShowWorkScheduler(!showWorkScheduler)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                showWorkScheduler
                                    ? (colorMode ? 'bg-amber-600 text-white' : 'bg-amber-600 text-white')
                                    : (colorMode ? 'bg-[#374151] text-gray-300 hover:bg-[#4b5563]' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')
                            }`}
                        >
                            🔧 Work
                        </button>
                        
                        {/* Recently Added Toggle (Audit Trail) */}
                        <button
                            onClick={() => {
                                if (!showRecentlyAdded) {
                                    fetchRecentlyAdded(); // Fetch when opening
                                }
                                setShowRecentlyAdded(!showRecentlyAdded);
                            }}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                showRecentlyAdded
                                    ? (colorMode ? 'bg-green-600 text-white' : 'bg-green-600 text-white')
                                    : (colorMode ? 'bg-[#374151] text-gray-300 hover:bg-[#4b5563]' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')
                            }`}
                            title="Recently Added - Audit Trail (last 15 events by creation time)"
                        >
                            � Added
                        </button>
                    </div>
                </div>
                
                {/* Universal Search Bar */}
                <div className="flex items-center gap-2 mt-3">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && searchQuery.trim().length >= 2) {
                                    searchEvents(searchQuery, searchDateRange);
                                }
                            }}
                            placeholder="Search events by name or topic..."
                            className={`w-full px-4 py-2 pl-8 pr-10 rounded-lg text-sm border ${
                                colorMode 
                                    ? 'bg-[#374151] border-gray-600 text-white placeholder-gray-400' 
                                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        />
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                        {isSearching && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin">⏳</span>
                        )}
                    </div>
                    <select
                        value={searchDateRange}
                        onChange={(e) => setSearchDateRange(e.target.value)}
                        className={`px-3 py-2 rounded-lg text-xs border ${
                            colorMode 
                                ? 'bg-[#374151] border-gray-600 text-white' 
                                : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        title="Search Date Range"
                    >
                        <option value="3m">3 Months</option>
                        <option value="6m">6 Months</option>
                        <option value="1y">1 Year</option>
                        <option value="2y">2 Years</option>
                        <option value="3y">3 Years (Default)</option>
                        <option value="5y">5 Years</option>
                    </select>
                    <button
                        onClick={() => searchEvents(searchQuery, searchDateRange)}
                        disabled={searchQuery.trim().length < 2 || isSearching}
                        className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                            searchQuery.trim().length >= 2 && !isSearching
                                ? (colorMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-600 text-white hover:bg-blue-700')
                                : (colorMode ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed')
                        }`}
                    >
                        Search
                    </button>
                    {showSearchResults && searchResults.length > 0 && (
                        <button
                            onClick={() => {
                                setShowSearchResults(false);
                                setSearchResults([]);
                                setSearchQuery('');
                            }}
                            className={`px-3 py-2 rounded-lg text-xs ${colorMode ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                        >
                            ✕ Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Recently Added Panel (Audit Trail) */}
            {showRecentlyAdded && (
                <div className={`mb-3 p-4 rounded-xl shadow-md ${colorMode ? 'bg-[#1e293b] border border-green-500/30' : 'bg-white border border-green-200'}`}>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className={`text-sm font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                            🕐 Recently Added (Audit Trail)
                        </h3>
                        <span className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Last 15 events by creation time
                        </span>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {recentlyAdded.length === 0 ? (
                            <div className={`text-center py-4 text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                No recently added events
                            </div>
                        ) : (
                            recentlyAdded.map((event, idx) => (
                                <div 
                                    key={event.id || idx}
                                    onClick={() => handleEventClick(event)}
                                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                                        colorMode ? 'hover:bg-[#374151] bg-[#0f172a]' : 'hover:bg-gray-100 bg-gray-50'
                                    }`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-sm font-medium truncate ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                                            {event.title || 'Untitled Event'}
                                        </div>
                                        <div className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                            Event Date: {event.startTime ? new Date(event.startTime).toLocaleDateString() : 'N/A'}
                                        </div>
                                        <div className={`text-xs ${colorMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                            Created: {event.createdAt ? new Date(event.createdAt).toLocaleString() : 'N/A'}
                                        </div>
                                        {event.organizer && (
                                            <div className={`text-xs ${colorMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                                By: {event.organizer.firstName} {event.organizer.lastName}
                                            </div>
                                        )}
                                    </div>
                                    <span className={`text-[10px] px-2 py-1 rounded ${colorMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                                        {event.eventType || 'Event'}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Search Results Panel */}
            {showSearchResults && searchResults.length > 0 && (
                <div className={`mb-3 p-4 rounded-xl shadow-md ${colorMode ? 'bg-[#1e293b] border border-blue-500/30' : 'bg-white border border-blue-200'}`}>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className={`text-sm font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                            🔍 Search Results
                        </h3>
                        <span className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Found {searchResults.length} event{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
                        </span>
                    </div>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {searchResults.map((event, idx) => {
                            const eventStyle = getEventStyle(event);
                            return (
                                <div 
                                    key={event.id || idx}
                                    onClick={() => handleEventClick(event)}
                                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                                        colorMode ? 'hover:bg-[#374151] bg-[#0f172a]' : 'hover:bg-gray-100 bg-gray-50'
                                    }`}
                                >
                                    <div 
                                        className="w-2 h-full min-h-[40px] rounded"
                                        style={eventStyle.style.backgroundColor ? { backgroundColor: eventStyle.style.backgroundColor } : {}}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-sm font-medium truncate ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                                            {event.title || 'Untitled Event'}
                                        </div>
                                        <div className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                            {event.startTime ? new Date(event.startTime).toLocaleDateString('en-US', { 
                                                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                                            }) : 'N/A'}
                                            {event.startTime && ` at ${new Date(event.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                                        </div>
                                        {event.description && (
                                            <div className={`text-xs truncate ${colorMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                {event.description.substring(0, 100)}...
                                            </div>
                                        )}
                                        {event.organizer && (
                                            <div className={`text-xs ${colorMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                                Organizer: {event.organizer.firstName} {event.organizer.lastName}
                                            </div>
                                        )}
                                    </div>
                                    <span className={`text-[10px] px-2 py-1 rounded ${colorMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                                        {event.eventType || 'Event'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* User Calendar Panel */}
            {showUserPanel && (
                <div className={`mb-3 p-4 rounded-xl shadow-md ${colorMode ? 'bg-[#1e293b] border border-purple-500/30' : 'bg-white border border-purple-200'}`}>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className={`text-sm font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                            👥 Team Calendars
                        </h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    const allVisible = {};
                                    (teamMembers || []).forEach(m => { allVisible[m.id] = true; });
                                    setUserCalendarVisibility(allVisible);
                                }}
                                className={`px-2 py-1 rounded text-[10px] font-medium ${colorMode ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                            >
                                Show All
                            </button>
                            <button
                                onClick={() => {
                                    const noneVisible = {};
                                    (teamMembers || []).forEach(m => { noneVisible[m.id] = false; });
                                    setUserCalendarVisibility(noneVisible);
                                }}
                                className={`px-2 py-1 rounded text-[10px] font-medium ${colorMode ? 'bg-gray-600 text-white hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            >
                                Hide All
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {(teamMembers || []).map(user => (
                            <div key={user.id} className="flex items-center gap-2">
                                <button
                                    onClick={() => setUserCalendarVisibility(prev => ({
                                        ...prev,
                                        [user.id]: !prev[user.id]
                                    }))}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        userCalendarVisibility[user.id] !== false
                                            ? (colorMode ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-800 border border-purple-300')
                                            : (colorMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500')
                                    }`}
                                >
                                    <span 
                                        className="w-3 h-3 rounded-full" 
                                        style={{ backgroundColor: userColors[user.id] || colorPresets[teamMembers.indexOf(user) % colorPresets.length] }}
                                    />
                                    {user?.firstName} {user?.lastName?.charAt(0)}.
                                </button>
                                {/* Color Picker Button */}
                                <button
                                    onClick={() => setShowColorPicker(showColorPicker === user.id ? null : user.id)}
                                    className={`w-5 h-5 rounded-full border-2 ${colorMode ? 'border-gray-600' : 'border-gray-300'}`}
                                    style={{ backgroundColor: userColors[user.id] || colorPresets[teamMembers.indexOf(user) % colorPresets.length] }}
                                    title="Change color"
                                />
                            </div>
                        ))}
                    </div>
                    {/* Color Picker Dropdown */}
                    {showColorPicker && (
                        <div className={`mt-3 p-3 rounded-lg ${colorMode ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
                            <div className={`text-xs font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                Select a color:
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {colorPresets.map((color, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleColorChange(showColorPicker, color)}
                                        className="w-6 h-6 rounded-full hover:scale-110 transition-transform border-2 border-white shadow"
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                            {/* Custom Color Input */}
                            <div className="flex items-center gap-2 mt-2">
                                <input
                                    type="color"
                                    onChange={(e) => handleColorChange(showColorPicker, e.target.value)}
                                    className="w-8 h-8 rounded cursor-pointer"
                                />
                                <span className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>Custom color</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Recent Events Panel */}
            {showRecentEvents && (
                <div className={`mb-3 p-4 rounded-xl shadow-md ${colorMode ? 'bg-[#1e293b] border border-green-500/30' : 'bg-white border border-green-200'}`}>
                    <h3 className={`text-sm font-bold mb-3 ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                        📋 Last 15 Events
                    </h3>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {(calendarEvents || []).slice(0, 15).map((event, idx) => (
                            <div 
                                key={event._id || idx}
                                onClick={() => handleEventClick(event)}
                                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                                    colorMode ? 'hover:bg-[#374151]' : 'hover:bg-gray-100'
                                }`}
                            >
                                <div className={`w-3 h-3 rounded-full ${getEventColor(event.type)}`} />
                                <div className="flex-1 min-w-0">
                                    <div className={`text-xs font-medium truncate ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                                        {event.title || 'Untitled Event'}
                                    </div>
                                    <div className={`text-[10px] ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {event.date} • {event.time}
                                    </div>
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded ${colorMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                                    {event.type}
                                </span>
                            </div>
                        ))}
                        {(!calendarEvents || calendarEvents.length === 0) && (
                            <div className={`text-center text-xs py-4 ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                No recent events
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Filter Tabs */}
            <div className={`mb-3 p-3 rounded-xl shadow-md ${colorMode ? 'bg-[#1e293b] border border-[#3b82f6]/20' : 'bg-white border border-gray-200'}`}>
                <div className="flex flex-wrap gap-1.5">
                    {[
                        { key: 'all', label: 'All Events', icon: '📅' },
                        { key: 'meeting', label: 'Meetings', icon: '👥' },
                        { key: 'training', label: 'Training', icon: '📚' },
                        { key: 'maintenance', label: 'Maintenance', icon: '🔧' },
                        { key: 'inspection', label: 'Inspections', icon: '🔍' },
                        { key: 'deadline', label: 'Deadlines', icon: '⏰' },
                        { key: 'project-start', label: 'Project Start', icon: '🚀' },
                        { key: 'project-end', label: 'Project End', icon: '🏁' },
                        { key: 'delivery', label: 'Deliveries', icon: '📦' },
                        { key: 'labor', label: 'Labor', icon: '👷' }
                    ].map(filter => (
                        <button
                            key={filter.key}
                            onClick={() => setFilterType(filter.key)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 shadow-sm ${
                                filterType === filter.key
                                    ? `${colorMode ? 'bg-[#3b82f6] text-white shadow-md' : 'bg-[var(--color-primary-blueprint-blue)] text-white shadow-md'}`
                                    : `${colorMode ? 'bg-[#374151] text-gray-300 hover:text-white hover:bg-[#4b5563]' : 'bg-gray-100 text-gray-600 hover:text-gray-800 hover:bg-gray-200'}`
                            }`}
                        >
                            <span className="text-xs">{filter.icon}</span>
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Calendar Navigation */}
            <div className={`flex items-center justify-between mb-3 p-3 rounded-xl shadow-md ${colorMode ? 'bg-[#1e293b] border border-[#3b82f6]/20' : 'bg-white border border-gray-200'}`}>
                <button
                    onClick={() => navigateMonth(-1)}
                    className={`p-1.5 rounded-md transition-all duration-200 shadow-sm ${
                        colorMode 
                            ? 'text-gray-300 hover:text-white hover:bg-[#374151]' 
                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                    }`}
                >
                    <ChevronLeftIcon className="w-4 h-4" />
                </button>
                
                <h2 className={`text-base font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                    {formatDate(currentDate)}
                </h2>
                
                <button
                    onClick={() => navigateMonth(1)}
                    className={`p-1.5 rounded-md transition-all duration-200 shadow-sm ${
                        colorMode 
                            ? 'text-gray-300 hover:text-white hover:bg-[#374151]' 
                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                    }`}
                >
                    <ChevronRightIcon className="w-4 h-4" />
                </button>
            </div>

            {/* Calendar Grid - Month View */}
            {viewMode === 'month' && (
                <div className={`rounded-lg shadow-lg border overflow-hidden ${colorMode ? 'bg-[#1e293b] border-[#3b82f6]/30' : 'bg-white border-gray-200'}`}>
                    {/* Day Headers */}
                    <div className={`grid grid-cols-7 ${colorMode ? 'bg-gradient-to-r from-[#0f172a] to-[#1e293b] border-b border-[#3b82f6]/40' : 'bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200'}`}>
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className={`p-2 text-center text-xs font-bold ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {day}
                            </div>
                        ))}
                    </div>
                    
                    {/* Calendar Days */}
                    <div className="grid grid-cols-7">
                        {calendarDays.map((day, index) => (
                            <div
                                key={index}
                                onClick={() => handleDateClick(day.date)}
                                className={`min-h-[60px] p-1 border-r border-b cursor-pointer transition-all duration-200 ${
                                    colorMode 
                                        ? 'border-[#3b82f6]/20 hover:bg-[#374151]/50' 
                                        : 'border-gray-200 hover:bg-blue-50/50'
                                } ${!day.isCurrentMonth ? (colorMode ? 'bg-[#1e293b]/30' : 'bg-gray-50') : ''}`}
                            >
                                {/* Date Number */}
                                <div className={`text-xs font-bold mb-1 ${
                                    isToday(day.date) 
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-md' 
                                        : isSelected(day.date)
                                            ? `${colorMode ? 'text-blue-400' : 'text-blue-600'} font-bold`
                                            : day.isCurrentMonth 
                                                ? (colorMode ? 'text-white' : 'text-gray-900')
                                                : (colorMode ? 'text-gray-500' : 'text-gray-400')
                                }`}>
                                    {day.date.getDate()}
                                </div>
                                
                                {/* Events */}
                                <div className="space-y-0.5">
                                    {getFilteredEvents(day.events).slice(0, 1).map(event => {
                                        const eventStyle = getEventStyle(event);
                                        return (
                                            <div
                                                key={event.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEventClick(event);
                                                }}
                                                className={`text-xs p-0.5 rounded cursor-pointer transition-all duration-200 ${eventStyle.className}`}
                                                style={eventStyle.style}
                                                title={`${event.time} - ${event.title}`}
                                            >
                                                <div className="truncate font-medium text-xs">{event.title}</div>
                                                <div className="text-xs opacity-90">{event.time}</div>
                                            </div>
                                        );
                                    })}
                                    {getFilteredEvents(day.events).length > 1 && (
                                        <div className={`text-xs px-1 py-0.5 rounded shadow-sm ${colorMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-600'}`}>
                                            +{getFilteredEvents(day.events).length - 1} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Calendar Grid - Week View */}
            {viewMode === 'week' && (
                <div className={`rounded-lg shadow-lg border overflow-hidden ${colorMode ? 'bg-[#1e293b] border-[#3b82f6]/30' : 'bg-white border-gray-200'}`}>
                    {/* Day Headers with Dates */}
                    <div className={`grid grid-cols-7 ${colorMode ? 'bg-gradient-to-r from-[#0f172a] to-[#1e293b] border-b border-[#3b82f6]/40' : 'bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200'}`}>
                        {getDaysInWeek(selectedDate).map((day, index) => (
                            <div 
                                key={index} 
                                className={`p-2 text-center cursor-pointer transition-all ${
                                    isSelected(day.date) ? (colorMode ? 'bg-[#3b82f6]/30' : 'bg-blue-100') : ''
                                }`}
                                onClick={() => handleDateClick(day.date)}
                            >
                                <div className={`text-xs font-bold ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index]}
                                </div>
                                <div className={`text-sm font-bold ${
                                    isToday(day.date) 
                                        ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mx-auto' 
                                        : colorMode ? 'text-white' : 'text-gray-900'
                                }`}>
                                    {day.date.getDate()}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {/* Week Events Grid */}
                    <div className="grid grid-cols-7">
                        {getDaysInWeek(selectedDate).map((day, dayIndex) => (
                            <div 
                                key={dayIndex} 
                                className={`min-h-[300px] p-2 border-r ${colorMode ? 'border-[#3b82f6]/20' : 'border-gray-200'}`}
                            >
                                <div className="space-y-1">
                                    {getFilteredEvents(day.events).map(event => {
                                        const eventStyle = getEventStyle(event);
                                        return (
                                            <div
                                                key={event.id}
                                                onClick={() => handleEventClick(event)}
                                                className={`text-xs p-2 rounded cursor-pointer transition-all duration-200 ${eventStyle.className}`}
                                                style={eventStyle.style}
                                            >
                                                <div className="font-bold text-[10px] opacity-80">{event.time}</div>
                                                <div className="font-medium truncate">{event.title}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Calendar Grid - Day View */}
            {viewMode === 'day' && (
                <div className={`rounded-lg shadow-lg border overflow-hidden ${colorMode ? 'bg-[#1e293b] border-[#3b82f6]/30' : 'bg-white border-gray-200'}`}>
                    {/* Day Header */}
                    <div className={`p-4 text-center ${colorMode ? 'bg-gradient-to-r from-[#0f172a] to-[#1e293b] border-b border-[#3b82f6]/40' : 'bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200'}`}>
                        <div className={`text-lg font-bold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="flex justify-center gap-2 mt-2">
                            <button 
                                onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))}
                                className={`px-3 py-1 rounded text-xs ${colorMode ? 'bg-[#374151] text-white hover:bg-[#4b5563]' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                            >
                                ← Previous Day
                            </button>
                            <button 
                                onClick={() => setSelectedDate(new Date())}
                                className="px-3 py-1 rounded text-xs bg-blue-600 text-white hover:bg-blue-700"
                            >
                                Today
                            </button>
                            <button 
                                onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)))}
                                className={`px-3 py-1 rounded text-xs ${colorMode ? 'bg-[#374151] text-white hover:bg-[#4b5563]' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                            >
                                Next Day →
                            </button>
                        </div>
                    </div>
                    
                    {/* Hourly Schedule */}
                    <div className="max-h-[600px] overflow-y-auto">
                        {getHoursForDay(selectedDate).map((hourSlot, index) => (
                            <div 
                                key={index} 
                                className={`flex border-b ${colorMode ? 'border-[#3b82f6]/20' : 'border-gray-200'}`}
                            >
                                {/* Time Label */}
                                <div className={`w-20 p-2 text-xs font-medium ${colorMode ? 'text-gray-400 bg-[#0f172a]' : 'text-gray-500 bg-gray-50'}`}>
                                    {hourSlot.timeStr}
                                </div>
                                {/* Events for this hour */}
                                <div className="flex-1 min-h-[50px] p-1">
                                    {hourSlot.events.map(event => {
                                        const eventStyle = getEventStyle(event);
                                        return (
                                            <div
                                                key={event.id}
                                                onClick={() => handleEventClick(event)}
                                                className={`text-xs p-2 rounded cursor-pointer transition-all duration-200 ${eventStyle.className} mb-1`}
                                                style={eventStyle.style}
                                            >
                                                <div className="font-medium">{event.title}</div>
                                                <div className="opacity-80 text-[10px]">{event.description || 'No description'}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Event Modal */}
            {showEventModal && selectedEvent && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] backdrop-blur-sm">
                    <div className={`rounded-xl shadow-2xl max-w-md w-full mx-4 border ${colorMode ? 'bg-[#1e293b] border-[#3b82f6]/30' : 'bg-white border-gray-200'}`}>
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className={`text-xl font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Event Details</h3>
                                <button
                                    onClick={closeEventModal}
                                    className={`p-2 rounded-lg transition-all duration-200 ${colorMode ? 'text-gray-300 hover:text-white hover:bg-[#374151]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <div className={`inline-block px-3 py-1.5 rounded-lg text-sm font-medium text-white shadow-md ${selectedEvent.color}`}>
                                        {selectedEvent.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </div>
                                </div>
                                
                                <div>
                                    <h4 className={`font-bold text-lg mb-2 ${colorMode ? 'text-white' : 'text-gray-800'}`}>{selectedEvent.title}</h4>
                                    <p className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {selectedEvent.time} • {selectedDate.toLocaleDateString()}
                                    </p>
                                </div>
                                
                                {selectedEvent.project && (
                                    <div className={`p-4 rounded-lg shadow-sm ${colorMode ? 'bg-[#374151] border border-[#3b82f6]/20' : 'bg-blue-50 border border-blue-200'}`}>
                                        <p className={`text-sm font-bold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Related Project:</p>
                                        <p className={`text-sm ${colorMode ? 'text-white' : 'text-gray-800'}`}>{selectedEvent.project.name}</p>
                                    </div>
                                )}
                                
                            </div>
                            
                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={closeEventModal}
                                    className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 shadow-md ${
                                        colorMode 
                                            ? 'bg-gray-600 text-white hover:bg-gray-700' 
                                            : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                    }`}
                                >
                                    Close
                                </button>
                                {selectedEvent.project && (
                                    <button
                                        onClick={() => {
                                            closeEventModal();
                                            if (onProjectSelect) {
                                                onProjectSelect(selectedEvent.project, 'Project Workflow', null, 'Company Calendar');
                                            }
                                        }}
                                        className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 shadow-md ${
                                            colorMode 
                                                ? 'bg-gradient-to-r from-[#3b82f6] to-[#2563eb] text-white hover:from-[#2563eb] hover:to-[#1d4ed8]' 
                                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
                                        }`}
                                    >
                                        View Project
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Event Modal */}
            {showAddEventModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] backdrop-blur-sm">
                    <div className={`rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto border ${colorMode ? 'bg-[#1e293b] border-[#3b82f6]/30' : 'bg-white border-gray-200'}`}>
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className={`text-xl font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Add New Event</h3>
                                <button
                                    onClick={closeAddEventModal}
                                    className={`p-2 rounded-lg transition-all duration-200 ${colorMode ? 'text-gray-300 hover:text-white hover:bg-[#374151]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            
                            <div className="space-y-5">
                                {/* Event Title */}
                                <div>
                                    <label className={`block text-sm font-bold mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Event Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={newEvent.title}
                                        onChange={(e) => handleNewEventChange('title', e.target.value)}
                                        className={`w-full px-4 py-3 rounded-lg border text-sm shadow-sm ${
                                            colorMode 
                                                ? 'bg-[#374151] border-gray-600 text-white placeholder-gray-400 focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20' 
                                                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                                        } focus:outline-none transition-all duration-200`}
                                        placeholder="Enter event title"
                                    />
                                </div>

                                {/* Assign to User(s) */}
                                <div>
                                    <label className={`block text-sm font-bold mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Assign to User(s) *
                                    </label>
                                    <div className={`w-full px-4 py-3 rounded-lg border text-sm shadow-sm min-h-[46px] ${
                                        colorMode 
                                            ? 'bg-[#374151] border-gray-600' 
                                            : 'bg-white border-gray-300'
                                    }`}>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {(selectedAssignees || []).map(userId => {
                                                const user = (teamMembers || []).find(u => u.id === userId);
                                                return (
                                                    <span key={userId} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                                                        {user ? `${user.firstName} ${user.lastName}` : 'Unknown User'}
                                                        <button
                                                            onClick={() => setSelectedAssignees(prev => prev.filter(id => id !== userId))}
                                                            className="ml-1 text-blue-600 hover:text-blue-800"
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                        <select
                                            onChange={(e) => {
                                                const userId = e.target.value;
                                                if (userId && !selectedAssignees.includes(userId)) {
                                                    setSelectedAssignees(prev => [...prev, userId]);
                                                }
                                                e.target.value = '';
                                            }}
                                            className={`w-full bg-transparent focus:outline-none ${colorMode ? 'text-white' : 'text-gray-900'}`}
                                        >
                                            <option value="">Select a user...</option>
                                            {(teamMembers || []).filter(u => !(selectedAssignees || []).includes(u.id)).map(user => (
                                                <option key={user.id} value={user.id}>
                                                    {user?.firstName} {user?.lastName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                </div>

                                {/* Event Type */}
                                <div>
                                    <label className={`block text-sm font-bold mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Event Type
                                    </label>
                                    <select
                                        value={newEvent.type}
                                        onChange={(e) => handleNewEventChange('type', e.target.value)}
                                        className={`w-full px-4 py-3 rounded-lg border text-sm shadow-sm ${
                                            colorMode 
                                                ? 'bg-[#374151] border-gray-600 text-white focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20' 
                                                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                                        } focus:outline-none transition-all duration-200`}
                                    >
                                        <option value="meeting">Meeting</option>
                                        <option value="training">Training</option>
                                        <option value="maintenance">Maintenance</option>
                                        <option value="inspection">Inspection</option>
                                        <option value="deadline">Deadline</option>
                                        <option value="project-start">Project Start</option>
                                        <option value="project-end">Project End</option>
                                        <option value="delivery">Delivery</option>
                                        <option value="labor">Labor</option>
                                    </select>
                                </div>

                                {/* Date and Time */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block text-sm font-bold mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Date
                                        </label>
                                        <input
                                            type="date"
                                            value={newEvent.date}
                                            onChange={(e) => handleNewEventChange('date', e.target.value)}
                                            className={`w-full px-4 py-3 rounded-lg border text-sm shadow-sm ${
                                                colorMode 
                                                    ? 'bg-[#374151] border-gray-600 text-white focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20' 
                                                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                                            } focus:outline-none transition-all duration-200`}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block text-sm font-bold mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Time
                                        </label>
                                        <input
                                            type="time"
                                            value={newEvent.time}
                                            onChange={(e) => handleNewEventChange('time', e.target.value)}
                                            className={`w-full px-4 py-3 rounded-lg border text-sm shadow-sm ${
                                                colorMode 
                                                    ? 'bg-[#374151] border-gray-600 text-white focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20' 
                                                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                                            } focus:outline-none transition-all duration-200`}
                                        />
                                    </div>
                                </div>

                                {/* Priority */}
                                <div>
                                    <label className={`block text-sm font-bold mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Priority
                                    </label>
                                    <select
                                        value={newEvent.priority}
                                        onChange={(e) => handleNewEventChange('priority', e.target.value)}
                                        className={`w-full px-4 py-3 rounded-lg border text-sm shadow-sm ${
                                            colorMode 
                                                ? 'bg-[#374151] border-gray-600 text-white focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20' 
                                                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                                        } focus:outline-none transition-all duration-200`}
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>

                                {/* Related Project */}
                                <div>
                                    <label className={`block text-sm font-bold mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Related Project (Optional)
                                    </label>
                                    <select
                                        value={newEvent.projectId}
                                        onChange={(e) => handleNewEventChange('projectId', e.target.value)}
                                        className={`w-full px-4 py-3 rounded-lg border text-sm shadow-sm ${
                                            colorMode 
                                                ? 'bg-[#374151] border-gray-600 text-white focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20' 
                                                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                                        } focus:outline-none transition-all duration-200`}
                                    >
                                        <option value="">No project</option>
                                        {(projects || []).map(project => (
                                            <option key={project.id} value={project.id}>
                                                {project.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className={`block text-sm font-bold mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Description (Optional)
                                    </label>
                                    <textarea
                                        value={newEvent.description}
                                        onChange={(e) => handleNewEventChange('description', e.target.value)}
                                        rows={3}
                                        className={`w-full px-4 py-3 rounded-lg border text-sm shadow-sm ${
                                            colorMode 
                                                ? 'bg-[#374151] border-gray-600 text-white placeholder-gray-400 focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20' 
                                                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                                        } focus:outline-none transition-all duration-200`}
                                        placeholder="Enter event description..."
                                    />
                                </div>
                            </div>
                            
                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={closeAddEventModal}
                                    className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 shadow-md ${
                                        colorMode 
                                            ? 'bg-gray-600 text-white hover:bg-gray-700' 
                                            : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                    }`}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmitNewEvent}
                                    className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 shadow-md ${
                                        colorMode 
                                            ? 'bg-gradient-to-r from-[#3b82f6] to-[#2563eb] text-white hover:from-[#2563eb] hover:to-[#1d4ed8]' 
                                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
                                    }`}
                                >
                                    Create Event
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Wrap in error boundary for better error handling
const CompanyCalendarPageWithErrorBoundary = (props) => (
    <CalendarErrorBoundary>
        <CompanyCalendarPage {...props} />
    </CalendarErrorBoundary>
);

export default CompanyCalendarPageWithErrorBoundary; 