/**
 * Cleanup Orphan Reminders Script
 * 
 * This script removes reminders (calendar events) that have:
 * 1. No organizer (organizerId = null) - these appear as "System Admin"
 * 2. Titles matching the known mock data reminders
 * 
 * Run with: node server/scripts/cleanup-orphan-reminders.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Known mock reminder titles that were incorrectly seeded
const MOCK_REMINDER_TITLES = [
  'Weekly Progress Meeting',
  'Client Follow-up Call',
  'Final Payment Due',
  'Permit Application Deadline',
  'Equipment Maintenance',
  'Material Delivery Confirmation',
  'Safety Inspection',
  'Contract Review Meeting'
];

async function cleanupOrphanReminders() {
  console.log('🧹 Starting cleanup of orphan reminders...\n');
  
  try {
    // 1. Find all reminders without an organizer (System Admin fallback)
    const orphanReminders = await prisma.calendarEvent.findMany({
      where: {
        eventType: 'REMINDER',
        organizerId: null
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        projectId: true
      }
    });
    
    console.log(`📊 Found ${orphanReminders.length} reminders with no organizer (System Admin)\n`);
    
    if (orphanReminders.length > 0) {
      console.log('These reminders will be deleted:');
      orphanReminders.forEach((r, i) => {
        console.log(`  ${i + 1}. "${r.title}" (ID: ${r.id.substring(0, 8)}...) - Created: ${r.createdAt.toISOString()}`);
      });
      console.log('');
    }
    
    // 2. Find reminders matching mock data titles
    const mockTitleReminders = await prisma.calendarEvent.findMany({
      where: {
        eventType: 'REMINDER',
        title: {
          in: MOCK_REMINDER_TITLES
        }
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        organizerId: true
      }
    });
    
    console.log(`📊 Found ${mockTitleReminders.length} reminders matching mock data titles\n`);
    
    // Combine both sets (removing duplicates by ID)
    const allToDelete = new Map();
    orphanReminders.forEach(r => allToDelete.set(r.id, r));
    mockTitleReminders.forEach(r => allToDelete.set(r.id, r));
    
    const uniqueToDelete = Array.from(allToDelete.keys());
    console.log(`📊 Total unique reminders to delete: ${uniqueToDelete.length}\n`);
    
    if (uniqueToDelete.length === 0) {
      console.log('✅ No orphan reminders found. Database is clean!\n');
      return;
    }
    
    // Prompt for confirmation
    console.log('⚠️  This will permanently delete these reminders from the database.');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Delete the reminders
    console.log('🗑️  Deleting orphan reminders...');
    
    const deleteResult = await prisma.calendarEvent.deleteMany({
      where: {
        id: {
          in: uniqueToDelete
        }
      }
    });
    
    console.log(`\n✅ Successfully deleted ${deleteResult.count} orphan reminders!\n`);
    
    // Verify cleanup
    const remainingOrphans = await prisma.calendarEvent.count({
      where: {
        eventType: 'REMINDER',
        organizerId: null
      }
    });
    
    console.log(`📊 Remaining reminders with no organizer: ${remainingOrphans}`);
    
    if (remainingOrphans === 0) {
      console.log('🎉 All orphan reminders have been cleaned up!\n');
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Check mode - just show what would be deleted without deleting
async function checkOrphanReminders() {
  console.log('🔍 Checking for orphan reminders (read-only mode)...\n');
  
  try {
    const orphanReminders = await prisma.calendarEvent.findMany({
      where: {
        eventType: 'REMINDER',
        organizerId: null
      },
      include: {
        project: {
          select: {
            projectNumber: true,
            projectName: true,
            customer: {
              select: {
                primaryName: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`📊 Found ${orphanReminders.length} reminders with no organizer:\n`);
    
    orphanReminders.forEach((r, i) => {
      const projectInfo = r.project 
        ? `#${r.project.projectNumber} - ${r.project.customer?.primaryName || r.project.projectName}`
        : 'No project';
      console.log(`  ${i + 1}. "${r.title}"`);
      console.log(`     Project: ${projectInfo}`);
      console.log(`     Created: ${r.createdAt.toISOString()}`);
      console.log(`     ID: ${r.id}`);
      console.log('');
    });
    
    if (orphanReminders.length > 0) {
      console.log('\n💡 To delete these reminders, run:');
      console.log('   node server/scripts/cleanup-orphan-reminders.js --delete\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
const args = process.argv.slice(2);
if (args.includes('--delete')) {
  cleanupOrphanReminders();
} else {
  checkOrphanReminders();
}
