import React from 'react';
import { NavigationProvider } from '../../contexts/NavigationContext';
import BackButton, { HeaderBackButton, CardBackButton, MinimalBackButton, ContextAwareBackButton } from '../common/BackButton';

// Example integration component showing how to wrap your app
export const AppWithNavigation = ({ children }) => {
  return (
    <NavigationProvider>
      {children}
    </NavigationProvider>
  );
};

// Example of updating existing page components to use context-aware navigation
export const ExampleProjectPage = ({ project }) => {
  return (
    <div className="p-6">
      {/* Add back button to any page */}
      <HeaderBackButton />
      
      {/* Your existing content */}
      <div className="mt-4">
        <h1>{project.name}</h1>
        {/* ... rest of your component */}
      </div>
    </div>
  );
};

// Example of updating existing workflow components
export const ExampleWorkflowPage = ({ project, stepId, sectionId }) => {
  return (
    <div className="p-6">
      {/* Context-aware back button that changes based on where user came from */}
      <ContextAwareBackButton />
      
      {/* Your existing workflow content */}
      <div className="mt-4">
        <h1>Project Workflow</h1>
        {/* ... rest of your workflow component */}
      </div>
    </div>
  );
};

// Example of updating existing message components
export const ExampleMessagesPage = ({ projectId, messageId }) => {
  return (
    <div className="p-6">
      {/* Card-style back button */}
      <CardBackButton />
      
      {/* Your existing messages content */}
      <div className="mt-4">
        <h1>Project Messages</h1>
        {/* ... rest of your messages component */}
      </div>
    </div>
  );
};

// Example of updating existing alert components  
export const ExampleAlertsPage = ({ projectId, alertId }) => {
  return (
    <div className="p-6">
      {/* Minimal back button */}
      <MinimalBackButton showLabel={true} />
      
      {/* Your existing alerts content */}
      <div className="mt-4">
        <h1>Project Alerts</h1>
        {/* ... rest of your alerts component */}
      </div>
    </div>
  );
};

export default {
  AppWithNavigation,
  ExampleProjectPage,
  ExampleWorkflowPage,
  ExampleMessagesPage,
  ExampleAlertsPage
};