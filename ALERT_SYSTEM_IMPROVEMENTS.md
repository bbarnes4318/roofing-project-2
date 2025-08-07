# Real-Time Alert System Improvements

## Critical Issues & Solutions

### 1. Database Query Optimization

**Issue**: N+1 query problem causing 300+ queries for 100 projects

**Solution**: Batch load all required data in single queries
```javascript
// AlertGenerationService.js - Optimized batch loading
static async generateBatchAlerts(projectIds) {
  // Single query to get all active line items
  const activeItems = await prisma.$queryRaw`
    SELECT 
      pwt.project_id,
      pwt.id as tracker_id,
      wli.id as line_item_id,
      wli.item_name,
      wli.responsible_role,
      wli.alert_days,
      ws.display_name as section_name,
      wp.phase_type
    FROM project_workflow_trackers pwt
    JOIN workflow_line_items wli ON wli.id = pwt.current_line_item_id
    JOIN workflow_sections ws ON ws.id = wli.section_id
    JOIN workflow_phases wp ON wp.id = ws.phase_id
    WHERE pwt.project_id = ANY(${projectIds})
      AND wli.is_active = true
  `;
  
  // Batch create alerts
  const alertData = activeItems.map(item => ({
    type: 'Work Flow Line Item',
    priority: 'MEDIUM',
    status: 'ACTIVE',
    title: `${item.item_name}`,
    projectId: item.project_id,
    workflowId: item.tracker_id,
    stepId: item.line_item_id,
    // ... other fields
  }));
  
  return prisma.workflowAlert.createMany({ data: alertData });
}
```

### 2. Add Missing Database Indexes

```sql
-- Add these indexes to improve query performance
CREATE INDEX idx_workflow_alerts_project_status 
  ON workflow_alerts(project_id, status);

CREATE INDEX idx_workflow_alerts_created_project 
  ON workflow_alerts(created_at DESC, project_id);

CREATE INDEX idx_project_workflow_trackers_line_item 
  ON project_workflow_trackers(current_line_item_id);

-- Add composite unique constraint to prevent duplicates
ALTER TABLE workflow_alerts 
  ADD CONSTRAINT unique_active_alert 
  UNIQUE (project_id, step_id, status) 
  WHERE status = 'ACTIVE';
```

### 3. WebSocket Real-Time Delivery

**Client-side socket.js updates:**
```javascript
// Add missing alert event handlers
setupEventHandlers() {
  // ... existing handlers ...
  
  // Critical missing handlers for alerts
  this.socket.on('workflow_updated', (data) => {
    this.emit('workflowUpdate', data);
    // Trigger alert refresh
    this.emit('alertsChanged', { projectId: data.projectId });
  });
  
  this.socket.on('alerts_refresh', (data) => {
    this.emit('alertsChanged', data);
  });
  
  this.socket.on('new_alert', (data) => {
    this.emit('newAlert', data);
    // Show notification
    if (Notification.permission === 'granted') {
      new Notification(data.title, {
        body: data.message,
        icon: '/alert-icon.png'
      });
    }
  });
}
```

**Server-side alert emission:**
```javascript
// WorkflowProgressionService.js - Emit after alert creation
const io = req.app.get('io');
if (io && alert) {
  // Emit to assigned user
  io.to(`user_${alert.assignedToId}`).emit('new_alert', {
    id: alert.id,
    title: alert.title,
    message: alert.message,
    priority: alert.priority,
    projectId: alert.projectId
  });
  
  // Emit to project room
  io.to(`project_${projectId}`).emit('alerts_refresh', {
    projectId,
    type: 'workflow_progression'
  });
}
```

### 4. Transaction-Safe Alert Generation

```javascript
// WorkflowProgressionService.js - Ensure atomic operations
async completeLineItem(projectId, lineItemId, completedById = null) {
  return await prisma.$transaction(async (tx) => {
    // 1. Update workflow state
    const tracker = await tx.projectWorkflowTracker.update({
      where: { projectId },
      data: { /* updates */ }
    });
    
    // 2. Mark old alerts complete
    await tx.workflowAlert.updateMany({
      where: { stepId: lineItemId, status: 'ACTIVE' },
      data: { status: 'COMPLETED' }
    });
    
    // 3. Create new alert IN TRANSACTION
    if (tracker.currentLineItemId) {
      const alert = await tx.workflowAlert.create({
        data: { /* alert data */ }
      });
      
      // 4. Emit socket event AFTER transaction commits
      tx.$queryRaw`SELECT pg_notify('alert_created', ${JSON.stringify({
        alertId: alert.id,
        projectId: projectId
      })})`;
    }
    
    return tracker;
  });
}
```

### 5. Alert Queue System

```javascript
// New AlertQueueService.js
const Bull = require('bull');
const alertQueue = new Bull('alerts', {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  }
});

// Process alerts asynchronously
alertQueue.process(async (job) => {
  const { projectId, lineItemId, type } = job.data;
  
  try {
    const alert = await AlertGenerationService.generateActiveLineItemAlert(
      projectId, 
      'workflow-id', 
      lineItemId
    );
    
    // Emit socket event on success
    if (alert) {
      emitAlertNotification(alert);
    }
    
    return alert;
  } catch (error) {
    console.error('Alert generation failed:', error);
    throw error; // Bull will retry
  }
});

// Add to queue instead of direct generation
static async queueAlert(projectId, lineItemId) {
  return alertQueue.add({
    projectId,
    lineItemId,
    type: 'workflow_progression'
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  });
}
```

### 6. Connection Resilience

```javascript
// Enhanced socket reconnection strategy
class SocketService {
  setupReconnectionHandlers() {
    let reconnectBackoff = 1000;
    
    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected:', reason);
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, reconnect immediately
        this.socket.connect();
      } else {
        // Client disconnect, use exponential backoff
        setTimeout(() => {
          this.socket.connect();
          reconnectBackoff = Math.min(reconnectBackoff * 2, 30000);
        }, reconnectBackoff);
      }
    });
    
    this.socket.on('connect', () => {
      reconnectBackoff = 1000; // Reset backoff
      // Re-subscribe to rooms
      this.rejoinRooms();
    });
  }
}
```

### 7. Alert Caching Strategy

```javascript
// Use Redis for alert caching
const redis = require('redis');
const client = redis.createClient();

class AlertCacheService {
  static async getCachedAlerts(userId) {
    const cached = await client.get(`alerts:${userId}`);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const alerts = await AlertGenerationService.getUserAlerts(userId);
    await client.setex(`alerts:${userId}`, 60, JSON.stringify(alerts));
    return alerts;
  }
  
  static async invalidateCache(userId) {
    await client.del(`alerts:${userId}`);
  }
}
```

## Implementation Priority

1. **Week 1**: Fix database indexes and N+1 queries
2. **Week 1**: Add missing WebSocket events
3. **Week 2**: Implement transaction-safe alert generation
4. **Week 2**: Add alert deduplication constraints
5. **Week 3**: Implement alert queue system
6. **Week 3**: Add Redis caching layer
7. **Week 4**: Enhanced monitoring and error handling

## Monitoring Metrics

- Alert generation latency (target: <100ms)
- WebSocket delivery success rate (target: >99%)
- Database query count per request (target: <10)
- Alert duplication rate (target: 0%)
- Socket reconnection time (target: <5s)

## Testing Checklist

- [ ] Load test with 1000+ concurrent projects
- [ ] Simulate network failures and reconnections
- [ ] Test alert deduplication under race conditions
- [ ] Verify transaction rollback on failures
- [ ] Test queue retry mechanism
- [ ] Validate WebSocket event delivery
- [ ] Check database index performance