# Context-Aware Navigation Integration Guide

This guide explains how to integrate the context-aware navigation system into your existing dashboard and routing components.

## Overview

The navigation system consists of:

1. **NavigationContext** - Tracks navigation state and context
2. **BackButton Components** - Context-aware back buttons
3. **Dashboard Section Components** - Enhanced dashboard sections with navigation tracking
4. **Integration Utilities** - Helpers for existing components

## Step 1: Wrap Your App with NavigationProvider

First, wrap your main App component with the NavigationProvider:

```jsx
// src/App.jsx
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { NavigationProvider } from './contexts/NavigationContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <NavigationProvider>
          {/* Your existing app content */}
          <Routes>
            {/* Your existing routes */}
          </Routes>
        </NavigationProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
```

## Step 2: Update Dashboard Page

Replace existing dashboard sections with the new context-aware components:

```jsx
// src/components/pages/DashboardPage.jsx
import React from 'react';
import ProjectsByPhaseSection from '../dashboard/ProjectsByPhaseSection';
import MyProjectMessagesSection from '../dashboard/MyProjectMessagesSection';
import CurrentAlertsSection from '../dashboard/CurrentAlertsSection';
import CurrentProjectAccessSection from '../dashboard/CurrentProjectAccessSection';

const DashboardPage = ({ 
  projects, 
  activity, 
  alerts, 
  onProjectSelect,
  colorMode 
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 text-gray-900">
      {/* Replace your existing sections with these enhanced versions */}
      
      {/* Current Projects by Phase */}
      <ProjectsByPhaseSection
        projectsByPhase={projectsByPhase}
        PROJECT_PHASES={PROJECT_PHASES}
        onProjectSelect={onProjectSelect}
        sortConfig={sortConfig}
        getSortedPhaseProjects={getSortedPhaseProjects}
        getProjectProgress={getProjectProgress}
        colorMode={colorMode}
      />

      {/* My Project Messages */}
      <MyProjectMessagesSection
        activity={activity}
        projects={projects}
        onProjectSelect={onProjectSelect}
        colorMode={colorMode}
        useRealData={true}
      />

      {/* Current Alerts */}
      <CurrentAlertsSection
        alerts={alerts}
        projects={projects}
        onProjectSelect={onProjectSelect}
        onAlertDismiss={handleAlertDismiss}
        colorMode={colorMode}
      />

      {/* Current Project Access */}
      <CurrentProjectAccessSection
        projects={projects}
        onProjectSelect={onProjectSelect}
        colorMode={colorMode}
      />
    </div>
  );
};

export default DashboardPage;
```

## Step 3: Add Back Buttons to Existing Pages

Add context-aware back buttons to your existing page components:

### Project Pages

```jsx
// src/components/pages/ProjectDetailPage.jsx
import React from 'react';
import { HeaderBackButton } from '../common/BackButton';

const ProjectDetailPage = ({ project }) => {
  return (
    <div className="p-6">
      {/* Context-aware back button */}
      <HeaderBackButton />
      
      <div className="mt-4">
        <h1>{project.name}</h1>
        {/* Your existing project detail content */}
      </div>
    </div>
  );
};
```

### Workflow Pages

```jsx
// src/components/pages/ProjectWorkflowPage.jsx
import React from 'react';
import { ContextAwareBackButton } from '../common/BackButton';

const ProjectWorkflowPage = ({ project, targetLineItemId, targetSectionId }) => {
  return (
    <div className="p-6">
      {/* This button will show different labels based on where user came from */}
      <ContextAwareBackButton />
      
      <div className="mt-4">
        <h1>Project Workflow</h1>
        {/* Your existing workflow content */}
      </div>
    </div>
  );
};
```

### Message Pages

```jsx
// src/components/pages/ProjectMessagesPage.jsx
import React from 'react';
import { CardBackButton } from '../common/BackButton';

const ProjectMessagesPage = ({ projectId, messageId }) => {
  return (
    <div className="p-6">
      <CardBackButton />
      
      <div className="mt-4">
        <h1>Project Messages</h1>
        {/* Your existing messages content */}
      </div>
    </div>
  );
};
```

### Alert Pages

```jsx
// src/components/pages/ProjectAlertsPage.jsx
import React from 'react';
import { MinimalBackButton } from '../common/BackButton';

const ProjectAlertsPage = ({ projectId, alertId }) => {
  return (
    <div className="p-6">
      <MinimalBackButton showLabel={true} />
      
      <div className="mt-4">
        <h1>Project Alerts</h1>
        {/* Your existing alerts content */}
      </div>
    </div>
  );
};
```

## Step 4: Update Navigation Handlers

Update your existing `onProjectSelect` handlers to work with the new context system:

```jsx
// Example: Updated onProjectSelect handler
const handleProjectSelect = (project, targetPage, navigationContext, sourceSection) => {
  // The navigation context now includes all the information needed for back navigation
  console.log('Navigation Context:', navigationContext);
  
  // Your existing navigation logic
  switch (targetPage) {
    case 'Project Workflow':
      navigate(`/project/${project.id}/workflow`, {
        state: { 
          project, 
          targetLineItemId: navigationContext?.targetLineItemId,
          targetSectionId: navigationContext?.targetSectionId,
          navigationContext 
        }
      });
      break;
      
    case 'Messages':
      navigate(`/project/${project.id}/messages`, {
        state: { 
          project, 
          messageId: navigationContext?.messageId,
          navigationContext 
        }
      });
      break;
      
    case 'Alerts':
      navigate(`/project/${project.id}/alerts`, {
        state: { 
          project, 
          alertId: navigationContext?.alertId,
          navigationContext 
        }
      });
      break;
      
    default:
      navigate(`/project/${project.id}`, {
        state: { project, navigationContext }
      });
  }
};
```

## Step 5: Restore Context in Routes

Update your route components to use navigation context when available:

```jsx
// src/App.jsx routes
<Routes>
  <Route path="/" element={<DashboardPage />} />
  <Route path="/dashboard" element={<DashboardPage />} />
  
  {/* Updated routes with context support */}
  <Route 
    path="/project/:projectId" 
    element={<ProjectDetailPageWrapper />} 
  />
  <Route 
    path="/project/:projectId/workflow" 
    element={<ProjectWorkflowPageWrapper />} 
  />
  <Route 
    path="/project/:projectId/messages" 
    element={<ProjectMessagesPageWrapper />} 
  />
  <Route 
    path="/project/:projectId/alerts" 
    element={<ProjectAlertsPageWrapper />} 
  />
</Routes>

// Example wrapper component
const ProjectWorkflowPageWrapper = () => {
  const { projectId } = useParams();
  const location = useLocation();
  const { currentContext } = useNavigation();
  
  // Get project and context from navigation state or API
  const project = location.state?.project;
  const targetLineItemId = location.state?.targetLineItemId;
  const targetSectionId = location.state?.targetSectionId;
  
  return (
    <ProjectWorkflowPage 
      project={project}
      targetLineItemId={targetLineItemId}
      targetSectionId={targetSectionId}
    />
  );
};
```

## Available Back Button Variants

The system provides several back button variants:

1. **BackButton** - Default back button with full customization
2. **HeaderBackButton** - Styled for page headers
3. **CardBackButton** - Styled for cards and modals
4. **MinimalBackButton** - Minimal styling, optional label
5. **ContextAwareBackButton** - Changes style based on navigation context

## Context Information Available

Each navigation action captures:

- **section** - Source dashboard section
- **type** - Navigation type (project, message, alert, project-cube)
- **returnPath** - Path to return to
- **selectedData** - The item that was selected
- **filters** - Active filters in the source section
- **expandedState** - Expanded/collapsed states
- **scrollPosition** - Scroll position to restore
- **projectId, messageId, alertId** - Relevant IDs
- **targetLineItemId, targetSectionId** - Workflow targeting

## Customization

### Custom Back Button Behavior

```jsx
import { useNavigation } from '../contexts/NavigationContext';

const CustomBackButton = () => {
  const { navigateBack, canNavigateBack, currentContext } = useNavigation();

  const handleCustomBack = () => {
    // Add custom logic before navigating back
    console.log('Navigating back from:', currentContext);
    
    if (canNavigateBack()) {
      navigateBack();
    } else {
      // Fallback behavior
      navigate('/dashboard');
    }
  };

  return (
    <button onClick={handleCustomBack}>
      Custom Back
    </button>
  );
};
```

### Advanced Context Tracking

```jsx
import { useSectionNavigation } from '../contexts/NavigationContext';

const CustomSection = () => {
  const {
    saveFilters,
    getSavedFilters,
    saveExpandedState,
    getSavedExpandedState,
    updateScrollPosition,
    navigateToProject
  } = useSectionNavigation('My Custom Section');

  // Use these methods to track and restore section state
};
```

## Testing the Integration

1. **Navigate through dashboard sections** - Verify that clicking items tracks context
2. **Use back buttons** - Confirm they return to exact previous location
3. **Check filter restoration** - Filters should be preserved when returning
4. **Verify scroll position** - Page should restore to previous scroll position
5. **Test expanded states** - Expanded/collapsed states should be maintained

## Migration Notes

- **Existing navigation will still work** - The system is backward compatible
- **Gradual migration** - You can update components one at a time
- **Context is optional** - Components work without context tracking
- **Performance impact** - Minimal, only tracks when needed

## Troubleshooting

- **Back button not appearing**: Ensure NavigationProvider wraps your app
- **Context not restoring**: Check that navigation context is being saved
- **Filters not persisting**: Verify saveFilters is called when filters change
- **Scroll position not restoring**: Ensure updateScrollPosition is called on scroll

This integration provides a seamless back navigation experience while maintaining all existing functionality.