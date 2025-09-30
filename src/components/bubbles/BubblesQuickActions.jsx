/**
 * BubblesQuickActions - Smart Quick Action Menu
 * 
 * Floating action button that shows contextual quick actions based on:
 * - Current page
 * - User's pending work
 * - Common workflows
 */

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './BubblesQuickActions.css';

export function BubblesQuickActions() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadQuickActions();
    }
  }, [open, location.pathname]);

  async function loadQuickActions() {
    setLoading(true);
    try {
      console.log('🫧 QuickActions: Fetching snapshot...');
      const response = await api.get('/bubbles/context/snapshot');
      console.log('🫧 QuickActions: Response:', response.data);
      
      const context = response.data.snapshot || {
        insights: { summary: { activeProjects: 0, overdueTasks: 0, activeAlerts: 0, upcomingReminders: 0 } },
        pendingWork: { tasks: [], alerts: [], reminders: [] },
        recentActivity: [],
        currentProject: null
      };
      
      const quickActions = generateQuickActions(location.pathname, context);
      console.log('🫧 QuickActions: Generated actions:', quickActions);
      setActions(quickActions);
    } catch (error) {
      console.error('🫧 QuickActions: Failed to load:', error);
      console.error('🫧 QuickActions: Error details:', error.response?.data || error.message);
      // Generate basic actions even on error using default context
      const defaultContext = {
        insights: { summary: { activeProjects: 0, overdueTasks: 0, activeAlerts: 0, upcomingReminders: 0 } },
        pendingWork: { tasks: [], alerts: [], reminders: [] },
        recentActivity: [],
        currentProject: null
      };
      const fallbackActions = generateQuickActions(location.pathname, defaultContext);
      console.log('🫧 QuickActions: Using fallback actions:', fallbackActions);
      setActions(fallbackActions);
    } finally {
      setLoading(false);
    }
  }

  function generateQuickActions(path, context) {
    const actions = [];
    
    // Safe access to context properties
    const summary = context?.insights?.summary || {};
    const pendingWork = context?.pendingWork || { tasks: [], alerts: [], reminders: [] };
    const currentProject = context?.currentProject || null;

    // Always available: Chat with Bubbles
    actions.push({
      icon: '💬',
      label: 'Ask Bubbles',
      description: 'Get help or insights',
      action: () => navigate('/bubbles'),
      color: '#0089D1'
    });

    // Context-specific actions based on current page
    if (path === '/' || path === '/dashboard') {
      if (summary.overdueTasks > 0) {
        actions.push({
          icon: '⚠️',
          label: 'View Overdue Tasks',
          description: `${summary.overdueTasks} tasks need attention`,
          action: () => navigate('/tasks?filter=overdue'),
          color: '#dc3545'
        });
      }

      if (summary.activeAlerts > 0) {
        actions.push({
          icon: '🔔',
          label: 'Check Alerts',
          description: `${summary.activeAlerts} active alerts`,
          action: () => navigate('/alerts'),
          color: '#ffc107'
        });
      }

      actions.push({
        icon: '➕',
        label: 'New Project',
        description: 'Start a new project',
        action: () => navigate('/projects/new'),
        color: '#28a745'
      });
    }

    // Project-specific actions
    if (path.startsWith('/projects/') && currentProject) {
      const projectId = currentProject.id;

      actions.push({
        icon: '📊',
        label: 'Project Status',
        description: 'Ask Bubbles about this project',
        action: () => navigate(`/bubbles?q=status of project ${currentProject.number}`),
        color: '#0089D1'
      });

      actions.push({
        icon: '✅',
        label: 'Complete Task',
        description: 'Mark a workflow item complete',
        action: () => navigate(`/bubbles?q=complete task for project ${currentProject.number}`),
        color: '#28a745'
      });

      actions.push({
        icon: '📧',
        label: 'Email Customer',
        description: 'Send update to customer',
        action: () => navigate(`/bubbles?q=email customer for project ${currentProject.number}`),
        color: '#17a2b8'
      });

      actions.push({
        icon: '📄',
        label: 'Find Document',
        description: 'Search project documents',
        action: () => navigate(`/documents?project=${projectId}`),
        color: '#6c757d'
      });
    }

    // Task-specific actions
    if (path === '/tasks') {
      actions.push({
        icon: '➕',
        label: 'New Task',
        description: 'Create a new task',
        action: () => navigate('/tasks/new'),
        color: '#28a745'
      });

      actions.push({
        icon: '🎯',
        label: 'Prioritize Tasks',
        description: 'Ask Bubbles to help prioritize',
        action: () => navigate('/bubbles?q=help me prioritize my tasks'),
        color: '#0089D1'
      });
    }

    // Document actions
    if (path === '/documents' || path === '/documents-resources') {
      actions.push({
        icon: '📤',
        label: 'Upload Document',
        description: 'Add a new file',
        action: () => {
          // Trigger upload modal
          window.dispatchEvent(new CustomEvent('open-upload-modal'));
          setOpen(false);
        },
        color: '#28a745'
      });

      actions.push({
        icon: '🔍',
        label: 'Find Document',
        description: 'Ask Bubbles to search',
        action: () => navigate('/bubbles?q=find document'),
        color: '#0089D1'
      });
    }

    // Calendar actions
    if (path === '/calendar') {
      actions.push({
        icon: '⏰',
        label: 'Set Reminder',
        description: 'Create a new reminder',
        action: () => navigate('/bubbles?q=set a reminder'),
        color: '#17a2b8'
      });

      actions.push({
        icon: '📅',
        label: 'Schedule Meeting',
        description: 'Add calendar event',
        action: () => navigate('/calendar/new'),
        color: '#28a745'
      });
    }

    // Always show: Quick search
    actions.push({
      icon: '🔍',
      label: 'Search Everything',
      description: 'Search across all data',
      action: () => {
        const searchTerm = prompt('What are you looking for?');
        if (searchTerm) {
          navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
        }
      },
      color: '#6c757d'
    });

    return actions;
  }

  function handleActionClick(action) {
    action.action();
    setOpen(false);
  }

  return (
    <div className="bubbles-quick-actions">
      {/* Action Menu */}
      {open && (
        <>
          <div className="quick-actions-overlay" onClick={() => setOpen(false)} />
          <div className="quick-actions-menu">
            <div className="quick-actions-header">
              <h3>Quick Actions</h3>
              <button onClick={() => setOpen(false)}>×</button>
            </div>

            {loading ? (
              <div className="quick-actions-loading">
                <div className="spinner">🫧</div>
                <p>Loading actions...</p>
              </div>
            ) : (
              <div className="quick-actions-list">
                {actions.map((action, index) => (
                  <button
                    key={index}
                    className="quick-action-item"
                    onClick={() => handleActionClick(action)}
                    style={{ '--action-color': action.color }}
                  >
                    <div className="action-icon">{action.icon}</div>
                    <div className="action-content">
                      <div className="action-label">{action.label}</div>
                      <div className="action-description">{action.description}</div>
                    </div>
                    <div className="action-arrow">→</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Floating Action Button */}
      <button
        className={`quick-actions-fab ${open ? 'open' : ''}`}
        onClick={() => setOpen(!open)}
        aria-label="Quick Actions"
      >
        {open ? '×' : '⚡'}
      </button>
    </div>
  );
}

export default BubblesQuickActions;
