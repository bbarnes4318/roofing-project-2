/**
 * BubblesContextualHelp - Smart Help System
 * 
 * Shows contextual help and suggestions based on:
 * - Current page/route
 * - User's recent activity
 * - Incomplete tasks
 * - Common next actions
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';
import './BubblesContextualHelp.css';

export function BubblesContextualHelp() {
  const location = useLocation();
  const [help, setHelp] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    loadContextualHelp();
  }, [location.pathname]);

  async function loadContextualHelp() {
    try {
      console.log('🫧 ContextualHelp: Fetching snapshot...');
      const snapshot = await api.get('/bubbles/context/snapshot');
      console.log('🫧 ContextualHelp: Response:', snapshot.data);
      
      const context = snapshot.data.snapshot || {
        insights: { summary: { activeProjects: 0, overdueTasks: 0, activeAlerts: 0, upcomingReminders: 0 } },
        pendingWork: { tasks: [], alerts: [], reminders: [] },
        recentActivity: []
      };

      // Generate contextual help based on current page
      const helpContent = generateHelpForPage(location.pathname, context);
      
      if (helpContent) {
        setHelp(helpContent);
        setVisible(true);
        
        // Auto-hide after 10 seconds
        setTimeout(() => setVisible(false), 10000);
      }
    } catch (error) {
      console.error('🫧 ContextualHelp: Failed to load:', error);
      console.error('🫧 ContextualHelp: Error details:', error.response?.data || error.message);
      // Show basic help even on error
      const basicHelp = generateHelpForPage(location.pathname, {
        insights: { summary: { activeProjects: 0, overdueTasks: 0, activeAlerts: 0, upcomingReminders: 0 } },
        pendingWork: { tasks: [], alerts: [], reminders: [] },
        recentActivity: []
      });
      if (basicHelp) {
        setHelp(basicHelp);
        setVisible(true);
        setTimeout(() => setVisible(false), 10000);
      }
    }
  }

  function generateHelpForPage(path, context) {
    // Dashboard
    if (path === '/' || path === '/dashboard') {
      const tips = [];
      
      if (context.insights.summary.overdueTasks > 0) {
        tips.push({
          icon: '⚠️',
          text: `You have ${context.insights.summary.overdueTasks} overdue tasks. Click on Tasks to prioritize them.`
        });
      }
      
      if (context.insights.summary.activeAlerts > 0) {
        tips.push({
          icon: '🔔',
          text: `${context.insights.summary.activeAlerts} workflow alerts need your attention.`
        });
      }

      if (context.insights.summary.activeProjects === 0) {
        tips.push({
          icon: '🚀',
          text: 'Ready to start? Create a new project to get going!'
        });
      }

      return tips.length > 0 ? {
        title: 'Dashboard Insights',
        tips,
        action: { text: 'Ask Bubbles', link: '/bubbles' }
      } : null;
    }

    // Projects Page
    if (path.startsWith('/projects')) {
      const projectId = path.split('/')[2];
      
      if (projectId && context.currentProject) {
        const tips = [];
        const progress = context.currentProject.progress || 0;

        if (progress < 10) {
          tips.push({
            icon: '📋',
            text: 'Project just started! Make sure all initial tasks are assigned.'
          });
        } else if (progress > 90) {
          tips.push({
            icon: '🎉',
            text: 'Almost done! Review final checklist and prepare for completion.'
          });
        }

        if (context.pendingWork.alerts.length > 0) {
          tips.push({
            icon: '⏰',
            text: `${context.pendingWork.alerts.length} workflow items need action on this project.`
          });
        }

        return tips.length > 0 ? {
          title: 'Project Tips',
          tips,
          action: { text: 'View Workflow', link: `/projects/${projectId}/workflow` }
        } : null;
      }

      return {
        title: 'Projects',
        tips: [
          { icon: '💡', text: 'Click on a project to see detailed workflow and progress.' },
          { icon: '🔍', text: 'Use filters to find projects by status or phase.' }
        ],
        action: { text: 'Create Project', link: '/projects/new' }
      };
    }

    // Tasks Page
    if (path === '/tasks') {
      const overdue = context.insights.summary.overdueTasks || 0;
      const pending = context.pendingWork.tasks.length || 0;

      return {
        title: 'Task Management',
        tips: [
          overdue > 0 ? { icon: '⚠️', text: `${overdue} tasks are overdue - prioritize these first!` } : null,
          pending > 5 ? { icon: '📊', text: `You have ${pending} pending tasks. Consider delegating some.` } : null,
          { icon: '✅', text: 'Mark tasks complete as you finish them to track progress.' }
        ].filter(Boolean),
        action: { text: 'Ask Bubbles to Prioritize', link: '/bubbles?q=prioritize my tasks' }
      };
    }

    // Documents Page
    if (path === '/documents' || path === '/documents-resources') {
      return {
        title: 'Documents & Resources',
        tips: [
          { icon: '📁', text: 'Organize files into folders for easy access.' },
          { icon: '🔍', text: 'Bubbles can find documents by name or content - just ask!' },
          { icon: '📤', text: 'Upload important documents so the whole team can access them.' }
        ],
        action: { text: 'Ask Bubbles to Find a Document', link: '/bubbles' }
      };
    }

    // Messages/Communication
    if (path === '/messages' || path === '/activities') {
      const recentMessages = context.recentActivity.filter(a => a.activityType === 'message').length;

      return {
        title: 'Communication',
        tips: [
          recentMessages > 0 ? { icon: '💬', text: `${recentMessages} new messages in recent activity.` } : null,
          { icon: '📧', text: 'Bubbles can send emails and messages for you - just ask!' },
          { icon: '🔔', text: 'Important updates are highlighted in your activity feed.' }
        ].filter(Boolean),
        action: { text: 'Chat with Bubbles', link: '/bubbles' }
      };
    }

    // Calendar/Reminders
    if (path === '/calendar') {
      const upcoming = context.insights.summary.upcomingReminders || 0;

      return {
        title: 'Calendar & Reminders',
        tips: [
          upcoming > 0 ? { icon: '📅', text: `${upcoming} events coming up in the next 7 days.` } : null,
          { icon: '⏰', text: 'Ask Bubbles to set reminders for important deadlines.' },
          { icon: '🔄', text: 'Sync your calendar with project milestones.' }
        ].filter(Boolean),
        action: { text: 'Set a Reminder', link: '/bubbles?q=set a reminder' }
      };
    }

    // Bubbles Chat Page
    if (path === '/bubbles') {
      return {
        title: 'Chat with Bubbles',
        tips: [
          { icon: '💡', text: 'Ask me about project status, tasks, or any data in the system.' },
          { icon: '📊', text: 'I can analyze trends, identify risks, and suggest optimizations.' },
          { icon: '🚀', text: 'Try: "What should I work on next?" or "Show me overdue items"' }
        ],
        action: null
      };
    }

    return null;
  }

  if (!visible || !help) return null;

  return (
    <div className="bubbles-contextual-help">
      <button 
        className="help-close"
        onClick={() => setVisible(false)}
        aria-label="Close help"
      >
        ×
      </button>

      <div className="help-header">
        <span className="help-icon">🫧</span>
        <h3>{help.title}</h3>
      </div>

      <div className="help-tips">
        {help.tips.map((tip, index) => (
          <div key={index} className="help-tip">
            <span className="tip-icon">{tip.icon}</span>
            <p>{tip.text}</p>
          </div>
        ))}
      </div>

      {help.action && (
        <div className="help-action">
          <a href={help.action.link} className="help-action-btn">
            {help.action.text} →
          </a>
        </div>
      )}

      <button 
        className="help-dismiss"
        onClick={() => setVisible(false)}
      >
        Got it!
      </button>
    </div>
  );
}

export default BubblesContextualHelp;
