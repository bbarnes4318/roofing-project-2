# Project Profile Tabs - Filtering Test Guide

## Overview
This guide provides step-by-step instructions to test that the Messages and Alerts tabs in the Project Profile display only content specific to the selected project.

## Testing the Messages Tab

### Setup
1. **Navigate to Project Profile**: From the dashboard or projects page, select a project to view its profile
2. **Switch to Messages Tab**: Click on the "Messages" button/tab in the project profile

### Test Cases

#### Test 1: Verify Project-Specific Filtering
**Expected Result**: Only messages related to the currently selected project should be displayed

**Steps to Test**:
1. Note the project number and name displayed at the top of the Messages tab
2. Check that the header shows: "Showing messages for: #[PROJECT_NUMBER] - [PROJECT_NAME]"
3. Examine all displayed messages to verify they all belong to the current project
4. Switch to a different project and repeat - should show different messages

#### Test 2: Verify Subject Filtering Still Works
**Expected Result**: Subject filter should work on the project-specific messages

**Steps to Test**:
1. In the Messages tab, use the subject filter dropdown
2. Select a specific subject (e.g., "Material Delivery")
3. Verify only messages with that subject are shown for the current project
4. Select "All Subjects" to see all messages for the current project again

#### Test 3: Verify Add Message Form
**Expected Result**: New messages should be associated with the current project

**Steps to Test**:
1. Click the "+ Add Message" button
2. Fill out the form and send a message
3. Verify the message appears in the current project's message list
4. Switch to another project - the message should NOT appear there

## Testing the Alerts Tab

### Setup
1. **Navigate to Project Profile**: From the dashboard or projects page, select a project to view its profile
2. **Switch to Alerts Tab**: Click on the "Alerts" button/tab in the project profile

### Test Cases

#### Test 1: Verify Project-Specific Filtering
**Expected Result**: Only alerts related to the currently selected project should be displayed

**Steps to Test**:
1. Note the project information displayed: "Showing alerts for project: #[PROJECT_NUMBER] - [PROJECT_NAME]"
2. Check that user information is also shown: "User: [USER_NAME] ([USER_ROLE])"
3. Examine all displayed alerts to verify they all belong to the current project
4. Switch to a different project and repeat - should show different alerts

#### Test 2: Verify User Group Filtering Still Works
**Expected Result**: User group filter should work on the project-specific alerts

**Steps to Test**:
1. In the Alerts tab, use the "Filter by user group" dropdown
2. Select a specific user group (e.g., "Project Manager")
3. Verify only alerts for that user group are shown for the current project
4. Select "All User Groups" to see all alerts for the current project again

#### Test 3: Verify No Cross-Project Contamination
**Expected Result**: Alerts from other projects should never appear

**Steps to Test**:
1. Navigate to Project A's Alerts tab
2. Note the alerts shown and their count
3. Navigate to Project B's Alerts tab
4. Verify completely different set of alerts (or no alerts if none exist for Project B)
5. Return to Project A - should show the same alerts as step 2

## Key Implementation Details

### Messages Tab Changes
- ✅ **Header Updated**: Shows current project number and name
- ✅ **Project Filter Removed**: No longer shows "All Projects" dropdown
- ✅ **Filtering Logic Enhanced**: Uses string comparison for robust project ID matching
- ✅ **Subject Filter Preserved**: Users can still filter by message subject

### Alerts Tab Changes  
- ✅ **Header Updated**: Shows current project and user information
- ✅ **Project Filter Removed**: No longer shows "All Projects" dropdown  
- ✅ **User Group Filter Preserved**: Users can still filter by user role/group
- ✅ **Core Filtering Logic**: Already filtered by project ID, enhanced for consistency

## Expected Behavior Summary

| Tab | Project Filtering | Additional Filters | Cross-Project Data |
|-----|------------------|-------------------|-------------------|
| Messages | ✅ Locked to current project | Subject filter only | ❌ Never shown |
| Alerts | ✅ Locked to current project | User group filter only | ❌ Never shown |

## Manual Testing Checklist

- [ ] Messages tab header shows correct project info
- [ ] Messages tab displays only current project's messages
- [ ] Messages subject filter works on project-specific data
- [ ] Add message form creates messages for current project
- [ ] Alerts tab header shows correct project info  
- [ ] Alerts tab displays only current project's alerts
- [ ] Alerts user group filter works on project-specific data
- [ ] Switching between projects shows different content
- [ ] No alerts/messages from other projects leak through

## Troubleshooting

If filtering isn't working correctly, check:

1. **Console Errors**: Open browser dev tools and check for JavaScript errors
2. **Project ID Types**: Verify project IDs are being compared correctly (string vs number)
3. **API Response**: Check network tab to see if API is returning project-specific data
4. **State Management**: Ensure project state is properly maintained when switching

## Success Criteria

✅ **Messages Tab**: Shows only messages for the selected project, with subject filtering available  
✅ **Alerts Tab**: Shows only alerts for the selected project, with user group filtering available  
✅ **No Cross-Contamination**: Content from other projects never appears  
✅ **Proper Headers**: Clear indication of which project's data is being displayed  