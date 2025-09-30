/**
 * BubblesSmartWidget - Proactive AI Assistant Widget
 * 
 * This widget uses Bubbles' comprehensive awareness to:
 * - Show proactive suggestions
 * - Alert to important items
 * - Provide quick actions
 * - Display contextual insights
 */

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './BubblesSmartWidget.css';

export function BubblesSmartWidget({ projectId = null }) {
  const [snapshot, setSnapshot] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadBubblesContext();
    // Refresh every 30 seconds
    const interval = setInterval(loadBubblesContext, 30000);
    return () => clearInterval(interval);
  }, [projectId]);

  async function loadBubblesContext() {
    try {
      const params = projectId ? `?projectId=${projectId}` : '';
      console.log('🫧 BubblesSmartWidget: Fetching snapshot...');
      const response = await api.get(`/bubbles/context/snapshot${params}`);
      console.log('🫧 BubblesSmartWidget: Response:', response.data);
      
      if (response.data && response.data.snapshot) {
        setSnapshot(response.data.snapshot);
        generateSuggestions(response.data.snapshot);
      } else {
        console.error('🫧 BubblesSmartWidget: Invalid response format:', response.data);
        // Set mock data for now
        setSnapshot({
          insights: { summary: { activeProjects: 0, overdueTasks: 0, activeAlerts: 0, upcomingReminders: 0 } },
          pendingWork: { tasks: [], alerts: [], reminders: [] },
          recentActivity: []
        });
      }
      setLoading(false);
    } catch (error) {
      console.error('🫧 BubblesSmartWidget: Failed to load context:', error);
      console.error('🫧 BubblesSmartWidget: Error details:', error.response?.data || error.message);
      // Set mock data on error
      setSnapshot({
        insights: { summary: { activeProjects: 0, overdueTasks: 0, activeAlerts: 0, upcomingReminders: 0 } },
        pendingWork: { tasks: [], alerts: [], reminders: [] },
        recentActivity: []
      });
      setLoading(false);
    }
  }

  function generateSuggestions(data) {
    const suggestions = [];
    
    // Safety check
    if (!data || !data.insights || !data.insights.summary) {
      console.error('🫧 BubblesSmartWidget: Invalid data structure:', data);
      return;
    }

    // Overdue tasks
    if (data.insights.summary.overdueTasks > 0) {
      suggestions.push({
        type: 'warning',
        icon: '⚠️',
        title: `${data.insights.summary.overdueTasks} Overdue Tasks`,
        message: 'You have tasks that need attention',
        action: 'View Tasks',
        link: '/tasks?filter=overdue'
      });
    }

    // Active alerts
    if (data.insights.summary.activeAlerts > 0) {
      suggestions.push({
        type: 'alert',
        icon: '🔔',
        title: `${data.insights.summary.activeAlerts} Active Alerts`,
        message: 'Workflow items need your attention',
        action: 'View Alerts',
        link: '/alerts'
      });
    }

    // Upcoming reminders (next 24 hours)
    if (data.insights.summary.upcomingReminders > 0) {
      suggestions.push({
        type: 'info',
        icon: '📅',
        title: `${data.insights.summary.upcomingReminders} Upcoming Reminders`,
        message: 'Events scheduled in the next 7 days',
        action: 'View Calendar',
        link: '/calendar'
      });
    }

    // Current project insights
    if (data.currentProject) {
      const progress = data.currentProject.progress || 0;
      
      if (progress < 25) {
        suggestions.push({
          type: 'info',
          icon: '🚀',
          title: 'Project Just Started',
          message: `${data.currentProject.name} is ${progress}% complete`,
          action: 'View Project',
          link: `/projects/${data.currentProject.id}`
        });
      } else if (progress > 75) {
        suggestions.push({
          type: 'success',
          icon: '🎯',
          title: 'Project Nearly Complete',
          message: `${data.currentProject.name} is ${progress}% complete`,
          action: 'View Project',
          link: `/projects/${data.currentProject.id}`
        });
      }
    }

    // Pending work summary
    const totalPending = data.pendingWork.tasks.length + 
                        data.pendingWork.alerts.length + 
                        data.pendingWork.reminders.length;
    
    if (totalPending > 10) {
      suggestions.push({
        type: 'warning',
        icon: '📊',
        title: 'Heavy Workload',
        message: `You have ${totalPending} pending items`,
        action: 'Prioritize',
        link: '/dashboard'
      });
    }

    // Recent activity insights
    if (data.recentActivity.length > 0) {
      const recentMessages = data.recentActivity.filter(a => a.activityType === 'message').length;
      if (recentMessages > 5) {
        suggestions.push({
          type: 'info',
          icon: '💬',
          title: 'Active Conversations',
          message: `${recentMessages} new messages in the last hour`,
          action: 'View Messages',
          link: '/messages'
        });
      }
    }

    setSuggestions(suggestions.slice(0, 5)); // Show top 5
  }

  // Show widget even if no snapshot - use defaults
  const safeSnapshot = snapshot || {
    insights: { summary: { activeProjects: 0, overdueTasks: 0, activeAlerts: 0, upcomingReminders: 0 } },
    pendingWork: { tasks: [], alerts: [], reminders: [] },
    recentActivity: [],
    currentProject: null
  };

  return (
    <div className={`bubbles-widget ${expanded ? 'expanded' : 'collapsed'}`}>
      <div className="bubbles-header" onClick={() => setExpanded(!expanded)}>
        <div className="bubbles-icon">🫧</div>
        <div className="bubbles-title">
          <h3>Bubbles Assistant</h3>
          <p className="bubbles-subtitle">
            {suggestions.length > 0 
              ? `${suggestions.length} insights for you`
              : 'Everything looks good!'}
          </p>
        </div>
        <button className="bubbles-toggle">
          {expanded ? '▼' : '▲'}
        </button>
      </div>

      {expanded && (
        <div className="bubbles-content">
          {/* Quick Stats */}
          {loading ? (
            <div className="bubbles-stats">
              <div className="stat-item">
                <span className="stat-value">...</span>
                <span className="stat-label">Loading</span>
              </div>
            </div>
          ) : (
            <div className="bubbles-stats">
              <div className="stat-item">
                <span className="stat-value">{safeSnapshot.insights.summary.activeProjects}</span>
                <span className="stat-label">Active Projects</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{safeSnapshot.pendingWork.tasks.length}</span>
                <span className="stat-label">Your Tasks</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{safeSnapshot.pendingWork.alerts.length}</span>
                <span className="stat-label">Alerts</span>
              </div>
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="bubbles-suggestions">
              <h4>Bubbles Suggests:</h4>
              {suggestions.map((suggestion, index) => (
                <div key={index} className={`suggestion-card ${suggestion.type}`}>
                  <div className="suggestion-icon">{suggestion.icon}</div>
                  <div className="suggestion-content">
                    <h5>{suggestion.title}</h5>
                    <p>{suggestion.message}</p>
                  </div>
                  <a href={suggestion.link} className="suggestion-action">
                    {suggestion.action} →
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Current Project Context */}
          {safeSnapshot.currentProject && (
            <div className="bubbles-current-project">
              <h4>Current Project</h4>
              <div className="project-card">
                <div className="project-header">
                  <h5>{safeSnapshot.currentProject.name}</h5>
                  <span className="project-number">#{safeSnapshot.currentProject.number}</span>
                </div>
                <div className="project-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${safeSnapshot.currentProject.progress}%` }}
                    />
                  </div>
                  <span className="progress-text">{safeSnapshot.currentProject.progress}% Complete</span>
                </div>
                <div className="project-meta">
                  <span className="project-status">{safeSnapshot.currentProject.status}</span>
                  <span className="project-customer">{safeSnapshot.currentProject.customer}</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bubbles-actions">
            <button 
              className="action-btn primary"
              onClick={() => window.location.href = '/bubbles'}
            >
              💬 Chat with Bubbles
            </button>
            <button 
              className="action-btn secondary"
              onClick={loadBubblesContext}
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BubblesSmartWidget;
