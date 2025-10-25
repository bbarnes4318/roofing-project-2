#!/bin/bash

# Setup cron job for trash cleanup
# This script sets up a daily cleanup job for expired trash items

echo "🗑️ Setting up trash cleanup cron job..."

# Get the current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLEANUP_SCRIPT="$SCRIPT_DIR/server/jobs/cleanupTrash.js"

# Check if the cleanup script exists
if [ ! -f "$CLEANUP_SCRIPT" ]; then
    echo "❌ Cleanup script not found at: $CLEANUP_SCRIPT"
    exit 1
fi

# Create the cron job entry (runs daily at 2 AM)
CRON_ENTRY="0 2 * * * cd $SCRIPT_DIR && node $CLEANUP_SCRIPT >> /var/log/trash-cleanup.log 2>&1"

# Add to crontab
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

echo "✅ Cron job added successfully!"
echo "📅 Trash cleanup will run daily at 2:00 AM"
echo "📝 Logs will be written to: /var/log/trash-cleanup.log"
echo ""
echo "To view the cron job: crontab -l"
echo "To remove the cron job: crontab -e (then delete the line)"
echo "To test the cleanup: node $CLEANUP_SCRIPT"
