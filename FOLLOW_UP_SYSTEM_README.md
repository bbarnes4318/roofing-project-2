# Automatic Follow-up System

This document describes the automatic follow-up system implemented for tasks, reminders, and alerts in the Kenstruction platform.

## Overview

The follow-up system automatically sends follow-up reminders to users after a configurable number of days for:
- **Tasks** - Follow-up reminders for incomplete tasks
- **Reminders** - Follow-up for calendar reminders
- **Alerts** - Follow-up for workflow alerts
- **Workflow Alerts** - Follow-up for system-generated workflow alerts

## Features

### User Configuration
- **Enable/Disable**: Users can toggle automatic follow-ups on/off
- **Customizable Timing**: Set different follow-up days for different item types
- **Max Attempts**: Configure maximum number of follow-up attempts
- **Custom Messages**: Set personalized follow-up messages
- **Settings UI**: Easy-to-use interface in the Settings page

### Automatic Processing
- **Scheduled Processing**: Runs every hour to check for due follow-ups
- **Smart Filtering**: Only processes follow-ups for active/relevant items
- **Notification Integration**: Creates in-app notifications for follow-ups
- **Status Tracking**: Tracks follow-up status (pending, sent, completed, cancelled, failed)

## Database Schema

### FollowUpSettings Table
```sql
CREATE TABLE follow_up_settings (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR UNIQUE NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  task_follow_up_days INTEGER DEFAULT 7,
  reminder_follow_up_days INTEGER DEFAULT 3,
  alert_follow_up_days INTEGER DEFAULT 5,
  max_follow_up_attempts INTEGER DEFAULT 3,
  follow_up_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### FollowUpTracking Table
```sql
CREATE TABLE follow_up_tracking (
  id VARCHAR PRIMARY KEY,
  original_item_id VARCHAR NOT NULL,
  original_item_type VARCHAR NOT NULL,
  project_id VARCHAR NOT NULL,
  assigned_to_id VARCHAR NOT NULL,
  follow_up_days INTEGER NOT NULL,
  scheduled_for TIMESTAMP NOT NULL,
  status VARCHAR DEFAULT 'PENDING',
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancelled_reason VARCHAR,
  follow_up_message TEXT,
  metadata JSON,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### Settings Management
- `GET /api/follow-up/settings` - Get user's follow-up settings
- `PUT /api/follow-up/settings` - Update follow-up settings

### Follow-up Tracking
- `GET /api/follow-up/tracking` - Get user's follow-up tracking
- `PUT /api/follow-up/tracking/:id/cancel` - Cancel a follow-up
- `PUT /api/follow-up/tracking/:id/complete` - Mark follow-up as completed
- `GET /api/follow-up/stats` - Get follow-up statistics

### Internal Management
- `POST /api/follow-up/create` - Create follow-up (internal use)

## Configuration Options

### Follow-up Days
- **Task Follow-up Days**: Number of days after task creation (default: 7)
- **Reminder Follow-up Days**: Number of days after reminder creation (default: 3)
- **Alert Follow-up Days**: Number of days after alert creation (default: 5)

### Follow-up Behavior
- **Max Attempts**: Maximum number of follow-up attempts (default: 3)
- **Custom Message**: Personalized follow-up message
- **Auto-cancellation**: Follow-ups are cancelled if original item is no longer relevant

## User Interface

### Settings Page
The follow-up settings are accessible through the Settings page under the "Follow-ups" tab:

1. **Enable/Disable Toggle**: Master switch for automatic follow-ups
2. **Day Configuration**: Set follow-up days for each item type
3. **Max Attempts**: Configure retry behavior
4. **Custom Message**: Personalize follow-up notifications
5. **Tracking Dashboard**: View and manage active follow-ups

### Follow-up Tracking
Users can view and manage their follow-ups:
- **Status Filtering**: Filter by status (pending, sent, completed, etc.)
- **Statistics**: View follow-up statistics and metrics
- **Manual Actions**: Cancel or complete follow-ups manually

## Automatic Integration

### Task Creation
When a task is created, the system automatically:
1. Checks if the assigned user has follow-up settings enabled
2. Creates a follow-up tracking record if enabled
3. Schedules the follow-up based on user's task follow-up days

### Alert Creation
When workflow alerts are created, the system:
1. Checks if the assigned user has follow-up settings enabled
2. Creates follow-up tracking for workflow alerts
3. Uses the user's alert follow-up days setting

### Reminder Creation
For calendar reminders and other notifications:
1. Checks user's follow-up settings
2. Creates appropriate follow-up tracking
3. Uses reminder follow-up days setting

## Scheduled Processing

### Cron Job
The system runs a scheduled job every hour to:
1. Check for follow-ups that are due
2. Verify the original item is still relevant
3. Send follow-up notifications
4. Update follow-up status
5. Handle failed follow-ups

### Processing Logic
```javascript
// Pseudo-code for follow-up processing
for each pending follow-up {
  if (follow-up is due) {
    if (original item is still relevant) {
      send notification
      update status to 'SENT'
      increment attempts
    } else {
      cancel follow-up
    }
  }
}
```

## Error Handling

### Graceful Degradation
- Follow-up creation failures don't affect original item creation
- Processing errors are logged but don't stop the scheduler
- User settings are validated before saving

### Retry Logic
- Failed follow-ups are retried up to max attempts
- Exponential backoff for retry attempts
- Automatic cancellation after max attempts

## Security Considerations

### Access Control
- Users can only manage their own follow-up settings
- Follow-up tracking is user-specific
- Admin endpoints require manager+ permissions

### Data Privacy
- Follow-up messages are user-configurable
- No sensitive data in follow-up metadata
- Proper data cleanup on user deletion

## Monitoring and Logging

### Logging
- Follow-up creation and processing events
- Error logging for debugging
- Performance metrics for optimization

### Statistics
- Total follow-ups created
- Success/failure rates
- User engagement metrics
- Processing performance

## Future Enhancements

### Planned Features
- Email notifications for follow-ups
- SMS integration for urgent follow-ups
- Advanced scheduling (weekends, holidays)
- Team-level follow-up settings
- Analytics and reporting

### Integration Opportunities
- Calendar integration for reminder follow-ups
- Project management tool integration
- Third-party notification services
- Mobile app push notifications

## Troubleshooting

### Common Issues

1. **Follow-ups not being created**
   - Check if user has follow-up settings enabled
   - Verify user has proper role assignments
   - Check database connectivity

2. **Follow-ups not being processed**
   - Verify scheduler is running
   - Check cron job configuration
   - Review error logs

3. **Settings not saving**
   - Validate input data
   - Check user permissions
   - Verify database constraints

### Debug Commands
```bash
# Check scheduler status
curl -X GET /api/follow-up/scheduler/status

# Manually trigger processing
curl -X POST /api/follow-up/process

# Get user settings
curl -X GET /api/follow-up/settings
```

## Testing

### Test Script
Run the included test script to verify the system:
```bash
node test-follow-up-system.js
```

### Manual Testing
1. Create a user account
2. Enable follow-up settings
3. Create a task or alert
4. Verify follow-up is created
5. Wait for scheduled processing
6. Check notification delivery

## Support

For issues or questions about the follow-up system:
1. Check the application logs
2. Verify user settings
3. Test with the provided test script
4. Review the API documentation
5. Contact system administrator
