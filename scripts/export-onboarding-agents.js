/**
 * Export Agents Who Completed Onboarding
 * 
 * This script connects to your Digital Ocean PostgreSQL database
 * and extracts all information about users who completed onboarding.
 * 
 * Outputs:
 * - JSON file with detailed agent information
 * - CSV file for spreadsheet import
 * - Summary report
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Initialize Prisma
const prisma = new PrismaClient();

/**
 * Parse onboarding data from the bio field
 * The bio field contains: "onboarding_completed:2024-11-05T10:30:00.000Z|data:{...json...}"
 */
function parseOnboardingData(bioString) {
  if (!bioString || !bioString.includes('onboarding_completed:')) {
    return null;
  }

  try {
    const parts = bioString.split('|data:');
    const completedAtMatch = bioString.match(/onboarding_completed:([^|]+)/);
    const completedAt = completedAtMatch ? completedAtMatch[1] : null;

    let onboardingData = null;
    if (parts.length > 1) {
      try {
        onboardingData = JSON.parse(parts[1]);
      } catch (e) {
        console.warn('Could not parse onboarding data JSON');
      }
    }

    return {
      completedAt,
      ...onboardingData
    };
  } catch (error) {
    console.warn('Error parsing bio field:', error.message);
    return null;
  }
}

/**
 * Format user data for export
 */
function formatUserData(user) {
  const onboardingInfo = parseOnboardingData(user.bio);
  
  return {
    // Basic Information
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`,
    email: user.email,
    phone: user.phone,
    secondaryPhone: user.secondaryPhone,
    preferredPhone: user.preferredPhone,
    
    // Role & Position
    role: user.role,
    position: user.position,
    department: user.department,
    
    // Account Details
    isActive: user.isActive,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLogin: user.lastLogin,
    lastLoginIP: user.lastLoginIP,
    
    // Onboarding Information
    hasCompletedOnboarding: true,
    onboardingCompletedAt: onboardingInfo?.completedAt,
    onboardingRole: onboardingInfo?.role,
    workflowSetup: onboardingInfo?.workflowSetup,
    onboardingData: onboardingInfo,
    
    // Additional Info
    avatar: user.avatar,
    skills: user.skills,
    certifications: user.certifications,
    experience: user.experience,
    emergencyContact: user.emergencyContact,
    address: user.address,
    language: user.language,
    timezone: user.timezone,
    
    // Preferences
    theme: user.theme,
    notificationPreferences: user.notificationPreferences,
  };
}

/**
 * Convert to CSV row
 */
function formatCsvRow(userData) {
  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  return [
    escape(userData.id),
    escape(userData.firstName),
    escape(userData.lastName),
    escape(userData.email),
    escape(userData.phone),
    escape(userData.role),
    escape(userData.position),
    escape(userData.department),
    escape(userData.isActive),
    escape(userData.isVerified),
    escape(userData.createdAt),
    escape(userData.onboardingCompletedAt),
    escape(userData.onboardingRole),
    escape(userData.lastLogin),
    escape(userData.lastLoginIP),
    escape(JSON.stringify(userData.workflowSetup)),
    escape(JSON.stringify(userData.skills)),
    escape(JSON.stringify(userData.address)),
  ].join(',');
}

/**
 * Main export function
 */
async function exportOnboardingAgents() {
  console.log('🚀 Starting onboarding data export...\n');
  console.log('📍 Connecting to Digital Ocean database...');

  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Connected to database successfully\n');

    // Fetch all users who completed onboarding
    console.log('🔍 Querying users who completed onboarding...');
    
    const allUsers = await prisma.user.findMany({
      where: {
        OR: [
          {
            bio: {
              contains: 'onboarding_completed:'
            }
          },
          {
            position: {
              in: ['Owner', 'Field Director', 'Office Staff', 'Project Manager', 'Administrator']
            }
          }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Found ${allUsers.length} users who completed onboarding\n`);

    if (allUsers.length === 0) {
      console.log('⚠️  No users with completed onboarding found.');
      console.log('💡 This could mean:');
      console.log('   1. No users have completed the onboarding flow yet');
      console.log('   2. The onboarding data is stored in a different format');
      console.log('   3. The database connection is pointing to the wrong environment\n');
      return;
    }

    // Format the data
    const formattedData = allUsers.map(formatUserData);

    // Create output directory
    const outputDir = path.join(__dirname, '..', 'exports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    
    // 1. Export as JSON
    const jsonPath = path.join(outputDir, `onboarding-agents-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(formattedData, null, 2));
    console.log(`✅ JSON export saved to: ${jsonPath}`);

    // 2. Export as CSV
    const csvPath = path.join(outputDir, `onboarding-agents-${timestamp}.csv`);
    const csvHeaders = [
      'ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Role', 'Position', 
      'Department', 'Is Active', 'Is Verified', 'Created At', 'Onboarding Completed At',
      'Onboarding Role', 'Last Login', 'Last Login IP', 'Workflow Setup', 'Skills', 'Address'
    ].join(',');
    const csvRows = formattedData.map(formatCsvRow);
    const csvContent = [csvHeaders, ...csvRows].join('\n');
    fs.writeFileSync(csvPath, csvContent);
    console.log(`✅ CSV export saved to: ${csvPath}`);

    // 3. Generate summary report
    const summaryPath = path.join(outputDir, `onboarding-summary-${timestamp}.txt`);
    const summary = generateSummaryReport(formattedData);
    fs.writeFileSync(summaryPath, summary);
    console.log(`✅ Summary report saved to: ${summaryPath}`);

    // Print summary to console
    console.log('\n' + '='.repeat(80));
    console.log(summary);
    console.log('='.repeat(80) + '\n');

    console.log('✨ Export completed successfully!');
    console.log(`📁 All files are in: ${outputDir}\n`);

  } catch (error) {
    console.error('❌ Error during export:', error);
    console.error('\n🔍 Error details:', error.message);
    
    if (error.code === 'P1001') {
      console.error('\n⚠️  Database connection error. Please check:');
      console.error('   - DATABASE_URL in your .env file');
      console.error('   - Digital Ocean database is running and accessible');
      console.error('   - Network connectivity to Digital Ocean');
    }
    
    throw error;
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Database connection closed');
  }
}

/**
 * Generate a summary report
 */
function generateSummaryReport(data) {
  const total = data.length;
  const roleBreakdown = {};
  const positionBreakdown = {};
  const activeCount = data.filter(u => u.isActive).length;
  const verifiedCount = data.filter(u => u.isVerified).length;
  const recentOnboarding = data.filter(u => {
    const completedAt = new Date(u.onboardingCompletedAt);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return completedAt > sevenDaysAgo;
  }).length;

  data.forEach(user => {
    roleBreakdown[user.role] = (roleBreakdown[user.role] || 0) + 1;
    if (user.position) {
      positionBreakdown[user.position] = (positionBreakdown[user.position] || 0) + 1;
    }
  });

  const report = `
ONBOARDING AGENTS SUMMARY REPORT
Generated: ${new Date().toLocaleString()}
Database: Digital Ocean PostgreSQL

═══════════════════════════════════════════════════════════════════════════════

OVERVIEW
--------
Total Agents Completed Onboarding: ${total}
Active Users: ${activeCount} (${((activeCount/total)*100).toFixed(1)}%)
Verified Users: ${verifiedCount} (${((verifiedCount/total)*100).toFixed(1)}%)
Onboarded in Last 7 Days: ${recentOnboarding}

ROLE BREAKDOWN
--------------
${Object.entries(roleBreakdown)
  .sort((a, b) => b[1] - a[1])
  .map(([role, count]) => `${role.padEnd(20)}: ${count.toString().padStart(3)} (${((count/total)*100).toFixed(1)}%)`)
  .join('\n')}

POSITION BREAKDOWN
------------------
${Object.entries(positionBreakdown)
  .sort((a, b) => b[1] - a[1])
  .map(([pos, count]) => `${pos.padEnd(20)}: ${count.toString().padStart(3)} (${((count/total)*100).toFixed(1)}%)`)
  .join('\n')}

RECENT ONBOARDING (Last 10)
----------------------------
${data.slice(0, 10).map(u => 
  `${u.fullName.padEnd(25)} | ${u.email.padEnd(30)} | ${u.role.padEnd(15)} | ${new Date(u.onboardingCompletedAt).toLocaleDateString()}`
).join('\n')}

═══════════════════════════════════════════════════════════════════════════════

For detailed information, see the JSON and CSV exports.
`.trim();

  return report;
}

// Run the export
if (require.main === module) {
  exportOnboardingAgents()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { exportOnboardingAgents, parseOnboardingData, formatUserData };








