# Bubbles AI - Complete Implementation Example

## Quick Start: Add Bubbles UX to Your App in 5 Minutes

### Step 1: Verify Backend is Running

Make sure the server is running with the new context routes:

```bash
cd server
npm run dev
```

You should see in the logs:
```
✅ SERVER: Bubbles Context routes registered at /api/bubbles/context
```

### Step 2: Add Components to App.jsx

Open `src/App.jsx` and add the Bubbles components:

```jsx
// At the top with other imports
import { 
  BubblesSmartWidget, 
  BubblesContextualHelp, 
  BubblesQuickActions 
} from './components/bubbles';

// In your App component's return statement, add these at the end:
function App() {
  return (
    <div className="App">
      {/* Your existing app structure */}
      <Router>
        {/* ... your routes ... */}
      </Router>

      {/* Add Bubbles UX Components - they work anywhere! */}
      <BubblesSmartWidget />
      <BubblesContextualHelp />
      <BubblesQuickActions />
    </div>
  );
}
```

### Step 3: Verify API Client Exists

Check if `src/services/api.js` exists. If not, create it:

```javascript
// src/services/api.js
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to all requests
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors globally
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Redirect to login if unauthorized
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### Step 4: Test It!

1. Start your React app:
   ```bash
   npm start
   ```

2. Log in to the application

3. You should now see:
   - **Bottom-right:** Smart Widget showing insights
   - **Top-right:** Contextual Help (appears when you visit pages)
   - **Bottom-left:** Quick Actions button

## Real-World Usage Examples

### Example 1: Dashboard with Bubbles

```jsx
// src/pages/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';

function DashboardPage() {
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    loadInsights();
  }, []);

  async function loadInsights() {
    try {
      const response = await apiClient.get('/api/bubbles/context/insights');
      setInsights(response.data);
    } catch (error) {
      console.error('Failed to load insights:', error);
    }
  }

  if (!insights) return <div>Loading...</div>;

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>

      {/* Show important metrics */}
      <div className="metrics-grid">
        <MetricCard
          title="Active Projects"
          value={insights.summary.activeProjects}
          icon="📊"
          link="/projects"
        />
        <MetricCard
          title="Overdue Tasks"
          value={insights.summary.overdueTasks}
          icon="⚠️"
          link="/tasks?filter=overdue"
          alert={insights.summary.overdueTasks > 0}
        />
        <MetricCard
          title="Active Alerts"
          value={insights.summary.activeAlerts}
          icon="🔔"
          link="/alerts"
        />
        <MetricCard
          title="Upcoming Events"
          value={insights.summary.upcomingReminders}
          icon="📅"
          link="/calendar"
        />
      </div>

      {/* Recent Activity */}
      <div className="recent-activity">
        <h2>Recent Activity</h2>
        {insights.recentActivity.map(activity => (
          <ActivityCard key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  );
}
```

### Example 2: Project Page with Smart Context

```jsx
// src/pages/ProjectDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../services/api';

function ProjectDetailPage() {
  const { projectId } = useParams();
  const [context, setContext] = useState(null);

  useEffect(() => {
    loadProjectContext();
  }, [projectId]);

  async function loadProjectContext() {
    try {
      const response = await apiClient.get(`/api/bubbles/context/project/${projectId}`);
      setContext(response.data);
    } catch (error) {
      console.error('Failed to load project context:', error);
    }
  }

  if (!context) return <div>Loading...</div>;

  const { project, incompleteItems } = context;

  return (
    <div className="project-detail">
      {/* Project Header */}
      <div className="project-header">
        <h1>{project.projectName}</h1>
        <span className="project-number">#{project.projectNumber}</span>
        <span className={`status ${project.status.toLowerCase()}`}>
          {project.status}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="progress-section">
        <h3>Progress: {project.progress}%</h3>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      {/* Customer Info */}
      <div className="customer-section">
        <h3>Customer</h3>
        <p>{project.customer.primaryName}</p>
        <p>{project.customer.primaryEmail}</p>
        <p>{project.customer.primaryPhone}</p>
      </div>

      {/* Incomplete Items */}
      {incompleteItems.length > 0 && (
        <div className="incomplete-items">
          <h3>Incomplete Items ({incompleteItems.length})</h3>
          {incompleteItems.map(item => (
            <div key={item.id} className="workflow-item">
              <span className="item-name">{item.itemName}</span>
              <span className="item-phase">{item.phaseName}</span>
              <span className="item-section">{item.sectionName}</span>
              <button onClick={() => completeItem(item.id)}>
                Mark Complete
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Recent Messages */}
      <div className="messages-section">
        <h3>Recent Messages</h3>
        {project.project_messages.slice(0, 5).map(msg => (
          <MessageCard key={msg.id} message={msg} />
        ))}
      </div>

      {/* Documents */}
      <div className="documents-section">
        <h3>Documents ({project.documents.length})</h3>
        {project.documents.slice(0, 5).map(doc => (
          <DocumentCard key={doc.id} document={doc} />
        ))}
      </div>
    </div>
  );
}
```

### Example 3: Smart Task List

```jsx
// src/pages/TasksPage.jsx
import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';

function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadTasks();
  }, [filter]);

  async function loadTasks() {
    try {
      const params = {};
      if (filter === 'overdue') {
        // Bubbles will filter on backend
        params.status = 'TO_DO';
      } else if (filter === 'high-priority') {
        params.priority = 'HIGH';
      }

      const response = await apiClient.get('/api/bubbles/context/tasks', { params });
      setTasks(response.data.tasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  }

  // Smart filter presets based on actual data
  const filterPresets = [
    { 
      id: 'all', 
      label: 'All Tasks', 
      count: tasks.length 
    },
    { 
      id: 'overdue', 
      label: 'Overdue', 
      count: tasks.filter(t => new Date(t.dueDate) < new Date()).length 
    },
    { 
      id: 'high-priority', 
      label: 'High Priority', 
      count: tasks.filter(t => t.priority === 'HIGH').length 
    },
    { 
      id: 'today', 
      label: 'Due Today', 
      count: tasks.filter(t => isToday(t.dueDate)).length 
    }
  ];

  return (
    <div className="tasks-page">
      <h1>Tasks</h1>

      {/* Smart Filters */}
      <div className="filter-bar">
        {filterPresets.map(preset => (
          <button
            key={preset.id}
            className={filter === preset.id ? 'active' : ''}
            onClick={() => setFilter(preset.id)}
          >
            {preset.label} ({preset.count})
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="task-list">
        {tasks.map(task => (
          <TaskCard 
            key={task.id} 
            task={task}
            onComplete={() => completeTask(task.id)}
          />
        ))}
      </div>

      {/* Empty State with Bubbles Help */}
      {tasks.length === 0 && (
        <div className="empty-state">
          <h3>No tasks found</h3>
          <p>Ask Bubbles to help you create tasks for your projects.</p>
          <button onClick={() => window.location.href = '/bubbles?q=create tasks'}>
            Ask Bubbles
          </button>
        </div>
      )}
    </div>
  );
}
```

### Example 4: Intelligent Search

```jsx
// src/components/GlobalSearch.jsx
import React, { useState } from 'react';
import { apiClient } from '../services/api';

function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await apiClient.get(`/api/bubbles/context/search?q=${encodeURIComponent(query)}`);
      setResults(response.data.results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="global-search">
      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search everything..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit">🔍</button>
      </form>

      {loading && <div>Searching...</div>}

      {results && (
        <div className="search-results">
          <p>{results.totalResults} results found</p>

          {/* Projects */}
          {results.projects.length > 0 && (
            <div className="result-section">
              <h3>Projects ({results.projects.length})</h3>
              {results.projects.map(project => (
                <SearchResultCard 
                  key={project.id}
                  type="project"
                  item={project}
                  link={`/projects/${project.id}`}
                />
              ))}
            </div>
          )}

          {/* Tasks */}
          {results.tasks.length > 0 && (
            <div className="result-section">
              <h3>Tasks ({results.tasks.length})</h3>
              {results.tasks.map(task => (
                <SearchResultCard 
                  key={task.id}
                  type="task"
                  item={task}
                  link={`/tasks/${task.id}`}
                />
              ))}
            </div>
          )}

          {/* Messages */}
          {results.messages.length > 0 && (
            <div className="result-section">
              <h3>Messages ({results.messages.length})</h3>
              {results.messages.map(message => (
                <SearchResultCard 
                  key={message.id}
                  type="message"
                  item={message}
                  link={`/messages/${message.id}`}
                />
              ))}
            </div>
          )}

          {/* Documents */}
          {results.documents.length > 0 && (
            <div className="result-section">
              <h3>Documents ({results.documents.length})</h3>
              {results.documents.map(doc => (
                <SearchResultCard 
                  key={doc.id}
                  type="document"
                  item={doc}
                  link={`/documents/${doc.id}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## Testing Checklist

- [ ] Server is running with context routes
- [ ] Frontend can connect to `/api/bubbles/context/*` endpoints
- [ ] Smart Widget appears in bottom-right
- [ ] Contextual Help appears when visiting pages
- [ ] Quick Actions button appears in bottom-left
- [ ] All components show real data from your application
- [ ] Components update when data changes
- [ ] Mobile responsive design works

## Troubleshooting

### Widget Not Showing
1. Check browser console for errors
2. Verify API client is configured correctly
3. Check if authentication token is present
4. Verify backend routes are registered

### No Data in Components
1. Check if user is logged in
2. Verify API endpoints return data
3. Check network tab for failed requests
4. Verify Prisma queries are working

### Performance Issues
1. Check cache is working (30-second TTL)
2. Verify queries are optimized
3. Consider reducing refresh intervals
4. Check database indexes

## Next Steps

1. **Customize the components** to match your design system
2. **Add more contextual actions** based on your workflows
3. **Track metrics** to measure UX improvements
4. **Gather user feedback** and iterate
5. **Expand to more pages** and contexts

---

**You now have a truly intelligent application that anticipates user needs!** 🎉
