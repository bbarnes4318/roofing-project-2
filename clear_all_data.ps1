# Clear All Application Data Script
Write-Host "🧹 Starting complete data clearance..." -ForegroundColor Red

# Navigate to server directory
Set-Location "server"

# Clear PostgreSQL database using Prisma
Write-Host "🗄️ Clearing PostgreSQL database..." -ForegroundColor Yellow
npx prisma migrate reset --force --skip-seed

# Clear all mock data files
Write-Host "📁 Clearing mock data files..." -ForegroundColor Yellow

# Clear src/data/mockData.js
$srcMockData = @"
// Clean, simple mock data with 5-digit project IDs
export const teamMembers = [];

export const crews = [];

// All mock data removed - no projects will show
export const initialProjects = [];

// All mock data removed - no tasks will show
export const initialTasks = [];

export const initialActivityData = [];

export const filteredActivityData = initialActivityData;

// Clean mock alerts with 5-digit project IDs
// All mock data removed - no alerts will show
export const mockAlerts = [];

// Export mockAlerts for use in the application
export { mockAlerts as alerts };
"@

Set-Content -Path "..\src\data\mockData.js" -Value $srcMockData

# Clear data/mockData.js
$dataMockData = @"
export const teamMembers = [];

// All mock data removed - no projects will show
export const initialProjects = [];

// All mock data removed - no tasks will show
export const initialTasks = [];

export const initialActivityData = [];
"@

Set-Content -Path "..\data\mockData.js" -Value $dataMockData

# Clear the seed file to prevent re-seeding
$emptySeed = @"
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Database cleared - no seed data will be created');
  
  // Clear existing data (in correct order to avoid foreign key constraints)
  await prisma.workflowStepAttachment.deleteMany();
  await prisma.workflowSubTask.deleteMany();
  await prisma.workflowStep.deleteMany();
  await prisma.projectWorkflow.deleteMany();
  await prisma.taskDependency.deleteMany();
  await prisma.task.deleteMany();
  await prisma.documentDownload.deleteMany();
  await prisma.document.deleteMany();
  await prisma.calendarEventAttendee.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.messageRead.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationParticipant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.projectTeamMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ All data cleared successfully');
}

main()
  .catch((e) => {
    console.error('❌ Error during clearing:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.`$disconnect();
  });
"@

Set-Content -Path "prisma\seed.js" -Value $emptySeed

Write-Host "✅ All data cleared successfully!" -ForegroundColor Green
Write-Host "📊 Database: Cleared" -ForegroundColor Green
Write-Host "📁 Mock files: Cleared" -ForegroundColor Green
Write-Host "🌱 Seed file: Reset" -ForegroundColor Green

# Return to original directory
Set-Location ".." 