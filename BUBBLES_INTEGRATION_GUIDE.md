# Bubbles AI - Integration Guide

## Quick Start

Bubbles AI now has comprehensive access to all application data. Here's how to use it:

## Files Created/Modified

### New Files
1. **`server/services/BubblesContextService.js`** - Core data aggregation service
2. **`server/routes/bubbles-context.js`** - RESTful API endpoints for context access
3. **`BUBBLES_COMPREHENSIVE_AWARENESS.md`** - Complete documentation
4. **`BUBBLES_INTEGRATION_GUIDE.md`** - This file

### Modified Files
1. **`server/server.js`** - Added route registration for bubbles-context
2. **`server/routes/bubbles.js`** - Added import for BubblesContextService

## Server Integration

The routes are already registered in `server.js`:

```javascript
// Line 91: Import the context routes
const bubblesContextRoutes = require('./routes/bubbles-context');

// Line 745-746: Register the routes
app.use('/api/bubbles/context', bubblesContextRoutes);
console.log('✅ SERVER: Bubbles Context routes registered at /api/bubbles/context');
```

## Using the Context Service

### In Server-Side Code

```javascript
const bubblesContextService = require('../services/BubblesContextService');

// Get comprehensive project context
const projectContext = await bubblesContextService.getProjectContext(projectId);

// Get recent activity
const activity = await bubblesContextService.getRecentActivity(50, userId);

// Get all tasks for a user
const tasks = await bubblesContextService.getAllTasks({ 
  assignedToId: userId, 
  status: 'TO_DO' 
});

// Search across all data
const results = await bubblesContextService.searchAll('inspection report');

// Get application insights
const insights = await bubblesContextService.getInsights(userId);
```

### In Frontend Code

```javascript
// Get comprehensive snapshot
const response = await fetch('/api/bubbles/context/snapshot?projectId=123', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();

// Get project context
const projectData = await fetch('/api/bubbles/context/project/123', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Search across all data
const searchResults = await fetch('/api/bubbles/context/search?q=inspection', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## Available Endpoints

All endpoints require authentication and are prefixed with `/api/bubbles/context`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/project/:projectId` | GET | Complete project context |
| `/activity?limit=50` | GET | Recent activity feed |
| `/tasks?filters` | GET | All tasks with filters |
| `/reminders?filters` | GET | Calendar events/reminders |
| `/emails?filters` | GET | Email history with tracking |
| `/messages?filters` | GET | Project messages |
| `/alerts?filters` | GET | Workflow alerts |
| `/documents?projectId` | GET | Project docs + company assets |
| `/customer/:customerId` | GET | Customer context |
| `/user/:userId?` | GET | User context (defaults to current) |
| `/search?q=term` | GET | Search all data |
| `/insights` | GET | Application insights |
| `/snapshot?projectId` | GET | Complete app state |

## Response Format

All endpoints return consistent JSON:

```json
{
  "success": true,
  "data": {
    // Endpoint-specific data
    "generatedAt": "2025-09-30T02:44:46.000Z"
  },
  "message": "Description of what was retrieved"
}
```

## Enhancing Bubbles Chat

To make Bubbles use this context in chat responses, you can modify the chat endpoint to fetch relevant context:

```javascript
// In server/routes/bubbles.js chat endpoint
router.post('/chat', async (req, res) => {
  const { message, projectId } = req.body;
  const userId = req.user.id;
  
  // Get comprehensive context
  let enrichedContext = {};
  
  if (projectId) {
    enrichedContext.project = await bubblesContextService.getProjectContext(projectId);
    enrichedContext.incompleteItems = await bubblesContextService.getIncompleteWorkflowItems(projectId);
  }
  
  enrichedContext.userTasks = await bubblesContextService.getAllTasks({
    assignedToId: userId,
    status: 'TO_DO'
  });
  
  enrichedContext.recentActivity = await bubblesContextService.getRecentActivity(10, userId);
  
  // Pass enrichedContext to AI for more intelligent responses
  const aiResponse = await openAIService.generateResponse(message, {
    systemPrompt: getSystemPrompt(req.user, projectContext, currentWorkflowData),
    additionalContext: enrichedContext
  });
  
  // Return response
  res.json({ success: true, response: aiResponse });
});
```

## Frontend Integration Examples

### React Hook for Bubbles Context

```javascript
// hooks/useBubblesContext.js
import { useState, useEffect } from 'react';
import { apiClient } from '../services/api';

export function useBubblesContext(type, params = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function fetchContext() {
      try {
        setLoading(true);
        const response = await apiClient.get(`/api/bubbles/context/${type}`, { params });
        setData(response.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchContext();
  }, [type, JSON.stringify(params)]);
  
  return { data, loading, error };
}

// Usage in component
function ProjectInsights({ projectId }) {
  const { data, loading } = useBubblesContext('project', { projectId });
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <h2>{data.project.projectName}</h2>
      <p>Progress: {data.project.progress}%</p>
      <p>Incomplete Items: {data.incompleteItems.length}</p>
    </div>
  );
}
```

### Bubbles Dashboard Widget

```javascript
// components/BubblesDashboard.jsx
import { useBubblesContext } from '../hooks/useBubblesContext';

export function BubblesDashboard() {
  const { data: snapshot } = useBubblesContext('snapshot');
  
  if (!snapshot) return null;
  
  return (
    <div className="bubbles-dashboard">
      <h2>Bubbles Insights</h2>
      
      <div className="insights-grid">
        <div className="insight-card">
          <h3>Active Projects</h3>
          <p>{snapshot.insights.summary.activeProjects}</p>
        </div>
        
        <div className="insight-card">
          <h3>Overdue Tasks</h3>
          <p>{snapshot.insights.summary.overdueTasks}</p>
        </div>
        
        <div className="insight-card">
          <h3>Active Alerts</h3>
          <p>{snapshot.insights.summary.activeAlerts}</p>
        </div>
        
        <div className="insight-card">
          <h3>Upcoming Reminders</h3>
          <p>{snapshot.insights.summary.upcomingReminders}</p>
        </div>
      </div>
      
      <div className="recent-activity">
        <h3>Recent Activity</h3>
        {snapshot.recentActivity.map(activity => (
          <div key={activity.id} className="activity-item">
            <span className="activity-type">{activity.activityType}</span>
            <span className="activity-time">{activity.timestamp}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Testing

### Test the Context Service

```bash
# Start the server
npm run dev

# Test endpoints (replace YOUR_TOKEN with actual JWT)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/bubbles/context/snapshot

curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/bubbles/context/activity?limit=10

curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/bubbles/context/search?q=test
```

### Verify in Browser Console

```javascript
// In browser console (after logging in)
const token = localStorage.getItem('token');

fetch('/api/bubbles/context/snapshot', {
  headers: { 'Authorization': `Bearer ${token}` }
})
  .then(r => r.json())
  .then(data => console.log('Bubbles Context:', data));
```

## Performance Tips

1. **Use Caching**: The service has built-in 30-second caching
2. **Filter Queries**: Use query parameters to limit data returned
3. **Pagination**: For large datasets, implement pagination
4. **Selective Fields**: Only request fields you need
5. **Parallel Requests**: Use Promise.all for multiple context requests

## Troubleshooting

### Service Not Loading
Check server logs for:
```
✅ SERVER: Bubbles Context routes registered at /api/bubbles/context
```

### 401 Unauthorized
Ensure you're passing a valid JWT token in the Authorization header.

### 404 Not Found
Verify the route is registered in `server.js` and the server has restarted.

### Slow Responses
- Check database connection
- Verify Prisma queries are optimized
- Monitor cache hit rates
- Consider adding indexes

## Next Steps

1. **Integrate with Bubbles Chat**: Use context in AI responses
2. **Build Dashboard Widgets**: Display insights to users
3. **Add Real-Time Updates**: WebSocket integration for live data
4. **Create Notifications**: Alert users based on context patterns
5. **Implement Analytics**: Track usage and patterns

## Support

For questions or issues:
1. Check `BUBBLES_COMPREHENSIVE_AWARENESS.md` for detailed documentation
2. Review server logs for errors
3. Test endpoints with curl/Postman
4. Verify database connectivity

---

**Bubbles AI is now fully aware of your entire application!** 🎉
