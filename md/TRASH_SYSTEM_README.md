# Trash System Implementation

## Overview
This implementation provides a complete 90-day trash system for the Documents & Resources page, including database schema, backend API, and scheduled cleanup.

## Database Changes

### New Fields Added to `company_assets` Table:
- `is_deleted` (BOOLEAN) - Flag indicating if asset is in trash
- `deleted_at` (TIMESTAMP) - When the asset was moved to trash
- `deleted_by_id` (VARCHAR) - User who deleted the asset
- `trash_expiry_date` (TIMESTAMP) - When the asset will be permanently deleted (90 days)

### Indexes Added:
- `idx_company_assets_trash` - For efficient trash queries
- `idx_company_assets_deleted_at` - For cleanup operations

## Backend API Changes

### New Bulk Operations:
- `moveToTrash` - Moves assets to trash with 90-day expiry
- `restore` - Restores assets from trash

### Updated List Endpoint:
- Added `trash=true` query parameter to list trash items
- Default behavior excludes deleted items

## Frontend Changes

### New Components:
- `DeleteConfirmationModal` - Professional delete confirmation
- `FolderRenameModal` - Folder renaming interface
- `FileRenameModal` - File renaming on upload

### Enhanced Features:
- Trash button in header with visual indicator
- Trash view modal showing deleted items with dates
- Drag and drop reordering for folders
- Folder rename functionality
- Fixed upload behavior (no new tabs)

## Setup Instructions

### 1. Run Database Migration
```bash
# Run the migration script
node run-trash-migration.js

# Or manually execute the SQL
psql -d your_database -f add-trash-system.sql
```

### 2. Update Prisma Schema
```bash
# Generate new Prisma client
npx prisma generate

# Push schema changes to database
npx prisma db push
```

### 3. Setup Scheduled Cleanup
```bash
# Make the setup script executable
chmod +x setup-cron-job.sh

# Run the setup script
./setup-cron-job.sh
```

### 4. Test the System
```bash
# Test the cleanup job manually
node server/jobs/cleanupTrash.js

# Check cron job is installed
crontab -l
```

## How It Works

### 1. Soft Delete Process
When a user deletes an item:
1. Item is marked as `is_deleted = true`
2. `deleted_at` is set to current timestamp
3. `deleted_by_id` is set to current user
4. `trash_expiry_date` is set to 90 days from now
5. Item is hidden from normal views

### 2. Trash Management
- Users can view trash via the trash button
- Items show deletion date and who deleted them
- Items can be restored from trash
- Items are automatically cleaned up after 90 days

### 3. Scheduled Cleanup
- Runs daily at 2:00 AM
- Finds items where `trash_expiry_date < NOW()`
- Permanently deletes files from DigitalOcean Spaces
- Removes database records
- Cleans up embeddings

## API Endpoints

### List Assets (with trash support)
```
GET /api/company-docs-enhanced/assets?trash=true
```

### Move to Trash
```
POST /api/company-docs-enhanced/bulk-operation
{
  "operation": "moveToTrash",
  "assetIds": ["asset1", "asset2"]
}
```

### Restore from Trash
```
POST /api/company-docs-enhanced/bulk-operation
{
  "operation": "restore",
  "assetIds": ["asset1", "asset2"]
}
```

## Monitoring

### Log Files
- Trash cleanup logs: `/var/log/trash-cleanup.log`
- Application logs: Check your application logging

### Database Queries
```sql
-- Check trash items
SELECT * FROM company_assets WHERE is_deleted = true;

-- Check expired items
SELECT * FROM company_assets 
WHERE is_deleted = true 
AND trash_expiry_date < NOW();

-- Check cleanup statistics
SELECT 
  COUNT(*) as total_trash,
  COUNT(CASE WHEN trash_expiry_date < NOW() THEN 1 END) as expired
FROM company_assets 
WHERE is_deleted = true;
```

## Troubleshooting

### Common Issues

1. **Migration Fails**
   - Check database permissions
   - Ensure Prisma client is updated
   - Verify database connection

2. **Cleanup Job Fails**
   - Check DigitalOcean Spaces credentials
   - Verify file permissions
   - Check cron job is installed

3. **Frontend Not Working**
   - Clear browser cache
   - Check API endpoints are accessible
   - Verify authentication tokens

### Manual Cleanup
If the scheduled job fails, you can run manual cleanup:
```bash
node server/jobs/cleanupTrash.js
```

## Security Considerations

- Only authenticated users can delete/restore items
- Deleted items are tracked with user information
- Files are securely deleted from cloud storage
- Database records are properly cleaned up

## Performance Notes

- Trash queries use indexed fields for efficiency
- Cleanup job processes items in batches
- File deletion from Spaces is done asynchronously
- Database operations are optimized with proper indexes
