# Agent Onboarding Data Export

This guide explains how to retrieve all documents and information about agents who completed onboarding on your Digital Ocean hosted website.

## 📋 Overview

The export script connects to your Digital Ocean PostgreSQL database and extracts complete information about all users who completed the onboarding process.

## 🎯 What Gets Exported

The script exports the following information for each agent:

### Basic Information
- ID, First Name, Last Name, Full Name
- Email, Phone Numbers
- Avatar URL

### Role & Position Details
- System Role (ADMIN, MANAGER, PROJECT_MANAGER, FOREMAN, WORKER, CLIENT)
- Position Title (Owner, Field Director, Office Staff, Project Manager, Administrator)
- Department

### Account Status
- Active Status
- Verification Status
- Account Creation Date
- Last Login Date & IP Address

### Onboarding Specific Data
- Onboarding Completion Date/Time
- Selected Role During Onboarding
- Workflow Setup Preferences (for Owners)
- Complete Onboarding Data JSON

### Additional Information
- Skills & Certifications
- Experience Level
- Emergency Contact Information
- Address Details
- Language & Timezone Preferences
- Theme Preferences
- Notification Preferences

## 🚀 How to Run the Export

### Windows Users

1. **Open PowerShell or Command Prompt** in the project directory
2. **Run the batch file:**
   ```cmd
   export-agents.bat
   ```
   
   OR run directly with Node:
   ```cmd
   cd server
   node scripts\export-onboarding-agents.js
   ```

### Mac/Linux Users

1. **Open Terminal** in the project directory
2. **Make the script executable** (first time only):
   ```bash
   chmod +x export-agents.sh
   ```
3. **Run the shell script:**
   ```bash
   ./export-agents.sh
   ```
   
   OR run directly with Node:
   ```bash
   cd server
   node scripts/export-onboarding-agents.js
   ```

## 📦 Prerequisites

Before running the export, ensure:

1. **Node.js is installed** (version 14 or higher)
2. **Dependencies are installed**: 
   ```bash
   npm install
   cd server
   npm install
   ```
3. **Database connection is configured** in your `.env` file:
   ```
   DATABASE_URL="postgresql://user:password@host:port/database"
   ```
4. **Access to your Digital Ocean database** (network connectivity)

## 📁 Output Files

The script creates three files in the `exports` folder:

### 1. JSON File (`onboarding-agents-[timestamp].json`)
- Complete structured data in JSON format
- Contains all fields and nested objects
- Best for: Further processing, data analysis, importing into other systems

**Example structure:**
```json
[
  {
    "id": "cmen0vdvu0000ap0dlgm1npuz",
    "firstName": "John",
    "lastName": "Smith",
    "fullName": "John Smith",
    "email": "john@example.com",
    "phone": "+1234567890",
    "role": "ADMIN",
    "position": "Owner",
    "hasCompletedOnboarding": true,
    "onboardingCompletedAt": "2024-11-05T10:30:00.000Z",
    "onboardingRole": "OWNER",
    "workflowSetup": {
      "workflowType": "residential",
      "teamSize": "small"
    }
  }
]
```

### 2. CSV File (`onboarding-agents-[timestamp].csv`)
- Spreadsheet-compatible format
- Flattened data structure
- Best for: Excel, Google Sheets, reporting tools

**Columns:**
```
ID, First Name, Last Name, Email, Phone, Role, Position, Department, 
Is Active, Is Verified, Created At, Onboarding Completed At, 
Onboarding Role, Last Login, Last Login IP, Workflow Setup, Skills, Address
```

### 3. Summary Report (`onboarding-summary-[timestamp].txt`)
- Human-readable summary
- Statistics and breakdowns
- Recent activity overview
- Best for: Quick review, management reports

**Example:**
```
ONBOARDING AGENTS SUMMARY REPORT
═══════════════════════════════════════════════════════════════

OVERVIEW
--------
Total Agents Completed Onboarding: 45
Active Users: 42 (93.3%)
Verified Users: 40 (88.9%)
Onboarded in Last 7 Days: 5

ROLE BREAKDOWN
--------------
ADMIN                : 10 (22.2%)
PROJECT_MANAGER      : 15 (33.3%)
FOREMAN              :  8 (17.8%)
WORKER               : 12 (26.7%)
```

## 🔍 Understanding the Data

### Onboarding Completion Indicator

Users who completed onboarding are identified by:
1. Having `onboarding_completed:` in their bio field
2. Having a designated position (Owner, Field Director, Office Staff, Project Manager, Administrator)

### Role Mapping

During onboarding, users select a role that maps to system roles:
- **Owner** → ADMIN role
- **Field Director** → FOREMAN role  
- **Office Staff** → WORKER role
- **Project Manager** → PROJECT_MANAGER role
- **Administrator** → ADMIN role

### Workflow Setup (Owner Only)

Owners who complete onboarding also provide workflow configuration:
- Workflow type (residential, commercial, etc.)
- Team size
- Default workflow preferences
- Custom alert configurations

## 🛠️ Troubleshooting

### "Database connection failed"
- **Check**: DATABASE_URL in your .env file
- **Verify**: Digital Ocean database is running
- **Test**: Network connectivity to Digital Ocean
- **Confirm**: Database credentials are correct

### "No users with completed onboarding found"
Possible reasons:
1. No users have actually completed the onboarding flow yet
2. The onboarding data storage format has changed
3. Connected to wrong database (dev vs production)

**Solution**: Check the console output for the database URL (masked) to confirm you're connected to the right database.

### "Permission denied" or "Cannot find module"
**Solution**: Install dependencies:
```bash
cd server
npm install
```

### Script won't run (Permission error on Mac/Linux)
**Solution**: Make script executable:
```bash
chmod +x export-agents.sh
```

## 🔐 Security Notes

1. **Sensitive Data**: The exported files contain PII (Personally Identifiable Information)
2. **Storage**: Keep exports in a secure location
3. **Sharing**: Use encrypted methods when sharing export files
4. **Cleanup**: Delete old exports when no longer needed
5. **Access**: Limit access to exports to authorized personnel only

## 📊 Using the Exported Data

### Import to Excel/Google Sheets
1. Open Excel or Google Sheets
2. Go to File → Import
3. Select the CSV file
4. Choose "Comma" as delimiter

### Import to Database
Use the JSON file to import into another database system:
```javascript
const data = require('./exports/onboarding-agents-2024-11-05.json');
// Process and import data
```

### Data Analysis
Use the JSON file for programmatic analysis:
```javascript
const agents = require('./exports/onboarding-agents-2024-11-05.json');

// Example: Count by role
const roleCounts = agents.reduce((acc, agent) => {
  acc[agent.role] = (acc[agent.role] || 0) + 1;
  return acc;
}, {});
```

## 🆘 Support

If you encounter issues:

1. **Check the console output** for detailed error messages
2. **Verify database connection** with a simple test query
3. **Review the Digital Ocean database logs** for connection issues
4. **Contact system administrator** if database access is restricted

## 📝 Script Location

- **Main Script**: `server/scripts/export-onboarding-agents.js`
- **Windows Runner**: `export-agents.bat`
- **Mac/Linux Runner**: `export-agents.sh`
- **Output Directory**: `server/exports/`

## 🔄 Automation

To automate regular exports, you can:

### Windows Task Scheduler
1. Open Task Scheduler
2. Create New Task
3. Set trigger (e.g., daily at 2 AM)
4. Set action: Run `export-agents.bat`

### Mac/Linux Cron Job
Add to crontab:
```bash
# Daily at 2 AM
0 2 * * * cd /path/to/project && ./export-agents.sh
```

## 📞 Questions?

For questions about:
- **Data structure**: See the JSON output file
- **Database schema**: Check `server/prisma/schema.prisma`
- **Onboarding flow**: Review `server/routes/onboarding.js`

---

**Last Updated**: November 5, 2024  
**Version**: 1.0.0


