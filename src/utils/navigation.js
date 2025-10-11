import { hasPermission, hasAnyPermission } from './permissions';

// Navigation items configuration
export const NAVIGATION_ITEMS = {
  dashboard: {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: '📊',
    permission: null, // Always visible
    roles: ['ADMIN', 'MANAGER', 'PROJECT_MANAGER', 'FOREMAN', 'WORKER', 'CLIENT', 'SUBCONTRACTOR']
  },
  
  projects: {
    id: 'projects',
    label: 'Projects',
    path: '/projects',
    icon: '🏗️',
    permission: 'projects.read',
    roles: ['ADMIN', 'MANAGER', 'PROJECT_MANAGER', 'FOREMAN', 'WORKER', 'CLIENT', 'SUBCONTRACTOR']
  },
  
  createProject: {
    id: 'create-project',
    label: 'Create Project',
    path: '/projects/create',
    icon: '➕',
    permission: 'projects.create',
    roles: ['ADMIN', 'MANAGER', 'PROJECT_MANAGER']
  },
  
  financials: {
    id: 'financials',
    label: 'Financials',
    path: '/financials',
    icon: '💰',
    permission: 'finances.view',
    roles: ['ADMIN', 'MANAGER', 'PROJECT_MANAGER']
  },
  
  reports: {
    id: 'reports',
    label: 'Reports',
    path: '/reports',
    icon: '📈',
    permission: 'reports.view',
    roles: ['ADMIN', 'MANAGER', 'PROJECT_MANAGER', 'FOREMAN']
  },
  
  documents: {
    id: 'documents',
    label: 'Documents',
    path: '/documents',
    icon: '📄',
    permission: 'documents.download',
    roles: ['ADMIN', 'MANAGER', 'PROJECT_MANAGER', 'FOREMAN', 'WORKER', 'CLIENT', 'SUBCONTRACTOR']
  },
  
  calendar: {
    id: 'calendar',
    label: 'Calendar',
    path: '/calendar',
    icon: '📅',
    permission: 'calendar.view',
    roles: ['ADMIN', 'MANAGER', 'PROJECT_MANAGER', 'FOREMAN', 'WORKER']
  },
  
  bubbles: {
    id: 'bubbles',
    label: 'Bubbles AI',
    path: '/bubbles',
    icon: '🤖',
    permission: 'ai.bubbles',
    roles: ['ADMIN', 'MANAGER', 'PROJECT_MANAGER', 'FOREMAN']
  },
  
  users: {
    id: 'users',
    label: 'User Management',
    path: '/users',
    icon: '👥',
    permission: 'users.read',
    roles: ['ADMIN', 'MANAGER']
  },
  
  settings: {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: '⚙️',
    permission: 'settings.view',
    roles: ['ADMIN', 'MANAGER', 'PROJECT_MANAGER']
  },
  
  workflow: {
    id: 'workflow',
    label: 'Workflow',
    path: '/workflow',
    icon: '🔄',
    permission: 'workflow.view',
    roles: ['ADMIN', 'MANAGER', 'PROJECT_MANAGER', 'FOREMAN', 'WORKER']
  },
  
  communication: {
    id: 'communication',
    label: 'Communication',
    path: '/communication',
    icon: '💬',
    permission: 'communication.send',
    roles: ['ADMIN', 'MANAGER', 'PROJECT_MANAGER', 'FOREMAN']
  }
};

// Get navigation items based on user role and permissions
export const getNavigationItems = (userRole) => {
  if (!userRole) return [];

  const items = Object.values(NAVIGATION_ITEMS);
  
  return items.filter(item => {
    // Check if user role is in allowed roles
    const roleAllowed = item.roles.includes(userRole.toUpperCase());
    
    // Check permission if specified
    if (item.permission) {
      return roleAllowed && hasPermission(userRole, item.permission);
    }
    
    return roleAllowed;
  });
};

// Get navigation items grouped by category
export const getGroupedNavigationItems = (userRole) => {
  const items = getNavigationItems(userRole);
  
  return {
    main: items.filter(item => 
      ['dashboard', 'projects', 'createProject', 'bubbles'].includes(item.id)
    ),
    management: items.filter(item => 
      ['financials', 'reports', 'documents', 'calendar', 'workflow'].includes(item.id)
    ),
    admin: items.filter(item => 
      ['users', 'settings', 'communication'].includes(item.id)
    )
  };
};

// Check if user can access a specific route
export const canAccessRoute = (userRole, routePath) => {
  const item = Object.values(NAVIGATION_ITEMS).find(item => item.path === routePath);
  
  if (!item) return false;
  
  const roleAllowed = item.roles.includes(userRole?.toUpperCase());
  
  if (item.permission) {
    return roleAllowed && hasPermission(userRole, item.permission);
  }
  
  return roleAllowed;
};

// Get breadcrumb navigation for current route
export const getBreadcrumbs = (userRole, currentPath) => {
  const breadcrumbs = [];
  
  // Find the navigation item for current path
  const currentItem = Object.values(NAVIGATION_ITEMS).find(item => 
    item.path === currentPath || currentPath.startsWith(item.path + '/')
  );
  
  if (currentItem) {
    breadcrumbs.push({
      label: currentItem.label,
      path: currentItem.path,
      current: true
    });
  }
  
  return breadcrumbs;
};

// Get quick actions based on user role
export const getQuickActions = (userRole) => {
  const actions = [];
  
  if (hasPermission(userRole, 'projects.create')) {
    actions.push({
      id: 'create-project',
      label: 'Create Project',
      icon: '➕',
      path: '/projects/create',
      color: 'blue'
    });
  }
  
  if (hasPermission(userRole, 'ai.bubbles')) {
    actions.push({
      id: 'ask-bubbles',
      label: 'Ask Bubbles',
      icon: '🤖',
      path: '/bubbles',
      color: 'purple'
    });
  }
  
  if (hasPermission(userRole, 'reports.generate')) {
    actions.push({
      id: 'generate-report',
      label: 'Generate Report',
      icon: '📊',
      path: '/reports',
      color: 'green'
    });
  }
  
  if (hasPermission(userRole, 'documents.upload')) {
    actions.push({
      id: 'upload-document',
      label: 'Upload Document',
      icon: '📄',
      path: '/documents',
      color: 'orange'
    });
  }
  
  return actions;
};

// Get user-specific dashboard widgets
export const getDashboardWidgets = (userRole) => {
  const widgets = [];
  
  // Always show basic widgets
  widgets.push('recent-projects', 'upcoming-tasks');
  
  // Add role-specific widgets
  if (hasPermission(userRole, 'finances.view')) {
    widgets.push('financial-summary', 'revenue-chart');
  }
  
  if (hasPermission(userRole, 'reports.view')) {
    widgets.push('performance-metrics', 'project-status');
  }
  
  if (hasPermission(userRole, 'calendar.view')) {
    widgets.push('calendar-events', 'schedule-overview');
  }
  
  if (hasPermission(userRole, 'ai.bubbles')) {
    widgets.push('ai-insights', 'smart-recommendations');
  }
  
  if (hasPermission(userRole, 'users.read')) {
    widgets.push('team-activity', 'user-management');
  }
  
  return widgets;
};

export default {
  NAVIGATION_ITEMS,
  getNavigationItems,
  getGroupedNavigationItems,
  canAccessRoute,
  getBreadcrumbs,
  getQuickActions,
  getDashboardWidgets
};
