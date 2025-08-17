# Complete Database Schema Report
Generated from database.ods

## 1. Users Table
**Total Records: 13**

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| createdAt | DateTime | Record creation timestamp |
| updatedAt | DateTime | Last update timestamp |
| firstName | String | User's first name |
| lastName | String | User's last name |
| email | String (Unique) | User's email address |
| password | String | Hashed password |
| avatar | String? | Avatar URL (optional) |
| phone | String? | Phone number (optional) |
| position | String? | Job position (optional) |
| department | String? | Department (optional) |
| bio | String? | User biography (optional) |
| role | UserRole | User role (ADMIN, MANAGER, FOREMAN, etc.) |
| permissions | Permission[] | Array of permissions |
| isActive | Boolean | Whether user is active |
| isVerified | Boolean | Email verification status |
| emailVerificationToken | String? | Token for email verification |
| emailVerificationExpires | DateTime? | Expiration for email token |
| passwordResetToken | String? | Password reset token |
| passwordResetExpires | DateTime? | Password reset expiration |
| passwordChangedAt | DateTime? | Last password change |
| loginAttempts | Int | Failed login attempts |
| lockUntil | DateTime? | Account lock expiration |
| lastLogin | DateTime? | Last login timestamp |
| lastLoginIP | String? | Last login IP address |
| twoFactorSecret | String? | 2FA secret |
| twoFactorEnabled | Boolean | 2FA enabled status |
| theme | Theme | UI theme preference |
| notificationPreferences | Json? | Notification settings |
| language | String | Language preference |
| timezone | String | Timezone setting |
| skills | String[] | Array of skills |
| certifications | Json? | Certifications data |
| experience | Int? | Years of experience |
| emergencyContact | Json? | Emergency contact info |
| address | Json? | Address information |

## 2. Customers Table
**Total Records: 25**

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| createdAt | DateTime | Record creation timestamp |
| updatedAt | DateTime | Last update timestamp |
| primaryName | String | Primary contact name |
| primaryEmail | String | Primary contact email |
| primaryPhone | String | Primary contact phone |
| secondaryName | String? | Secondary contact name |
| secondaryEmail | String? | Secondary contact email |
| secondaryPhone | String? | Secondary contact phone |
| primaryContact | ContactType | PRIMARY or SECONDARY |
| address | String | Customer address |
| notes | String? | Additional notes |

## 3. Workflow Alerts Table
**Total Records: 17 (newly generated)**

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| createdAt | DateTime | Alert creation time |
| updatedAt | DateTime | Last update time |
| type | String | Alert type (WORKFLOW_TASK, OVERDUE, etc.) |
| priority | Priority | HIGH, MEDIUM, LOW |
| status | AlertStatus | ACTIVE, ACKNOWLEDGED, DISMISSED, COMPLETED |
| title | String | Alert title |
| message | String | Alert message |
| stepName | String | Associated workflow step |
| isRead | Boolean | Read status |
| readAt | DateTime? | When alert was read |
| acknowledged | Boolean | Acknowledgment status |
| acknowledgedAt | DateTime? | When acknowledged |
| dueDate | DateTime? | Due date for alert |
| projectId | String | Associated project |
| assignedToId | String? | Assigned user |
| createdById | String? | Creator user |
| metadata | Json? | Additional metadata |
| responsibleRole | String | Responsible role |
| lineItemId | String? | Associated line item |
| phaseId | String? | Associated phase |
| sectionId | String? | Associated section |

## 4. Role Assignments Table
**Total Records: 4**

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| createdAt | DateTime | Record creation |
| updatedAt | DateTime | Last update |
| roleType | String | Type of role |
| userId | String | User ID reference |
| assignedAt | DateTime | Assignment date |
| assignedById | String | Who assigned the role |
| isActive | Boolean | Active status |

## 5. Workflow Phases Table
**Total Records: 6**

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Update timestamp |
| phaseName | String | Name of phase |
| phaseType | ProjectPhase | LEAD, PROSPECT, APPROVED, EXECUTION, etc. |
| displayOrder | Int | Display order |
| description | String? | Phase description |
| isActive | Boolean | Active status |
| isCurrent | Boolean | Current phase flag |
| version | Int | Version number |

## 6. Workflow Sections Table
**Total Records: 30**

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Update timestamp |
| sectionNumber | Int | Section number |
| sectionName | String | Section name |
| displayName | String | Display name |
| displayOrder | Int | Display order |
| description | String? | Section description |
| isActive | Boolean | Active status |
| phaseId | String | Parent phase ID |
| isCurrent | Boolean | Current section flag |
| version | Int | Version number |

## 7. Workflow Line Items Table
**Total Records: 86**

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Update timestamp |
| itemLetter | String | Item letter (a, b, c, etc.) |
| itemName | String | Name of line item |
| responsibleRole | String | Role responsible (OFFICE, FIELD_DIRECTOR, etc.) |
| displayOrder | Int | Display order |
| description | String? | Item description |
| isActive | Boolean | Active status |
| estimatedMinutes | Int? | Estimated completion time |
| alertDays | Int | Days before alert |
| sectionId | String | Parent section ID |
| isCurrent | Boolean | Current item flag |
| searchVector | String? | Search optimization |
| version | Int | Version number |

## 8. Projects Table
**Total Records: 25**

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Update timestamp |
| projectNumber | Int | Project number |
| projectName | String | Project name |
| projectType | ProjectType | ROOF_REPLACEMENT, KITCHEN_REMODEL, etc. |
| status | ProjectStatus | PENDING, IN_PROGRESS, COMPLETED, ON_HOLD |
| archived | Boolean | Archive status |
| archivedAt | DateTime? | Archive date |
| progress | Float | Progress percentage |
| description | String? | Project description |
| priority | Priority | HIGH, MEDIUM, LOW |
| budget | Decimal? | Project budget |
| estimatedCost | Decimal? | Estimated cost |
| actualCost | Decimal? | Actual cost |
| startDate | DateTime | Start date |
| endDate | DateTime? | End date |
| notes | String? | Project notes |
| pmPhone | String? | Project manager phone |
| pmEmail | String? | Project manager email |
| customerId | String | Customer ID reference |
| projectManagerId | String? | Project manager ID |
| createdById | String? | Creator ID |
| phase | ProjectPhase | Current phase |
| searchVector | String? | Search optimization |

## 9. Project Workflow Trackers Table
**Total Records: 25**

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Update timestamp |
| projectId | String | Associated project |
| currentPhaseId | String? | Current phase |
| currentSectionId | String? | Current section |
| currentLineItemId | String? | Current line item |
| lastCompletedItemId | String? | Last completed item |
| phaseStartedAt | DateTime? | Phase start time |
| sectionStartedAt | DateTime? | Section start time |
| lineItemStartedAt | DateTime? | Line item start time |

## 10. Completed Workflow Items Table
**Total Records: 3**

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| createdAt | DateTime | Creation timestamp |
| trackerId | String | Tracker ID reference |
| phaseId | String | Phase ID |
| sectionId | String | Section ID |
| lineItemId | String | Line item ID |
| completedAt | DateTime | Completion timestamp |
| completedById | String | User who completed |
| notes | String? | Completion notes |

---

## Database Statistics

- **Total Tables**: 10
- **Total Records**: ~230
- **Active Projects**: 17
- **Active Users**: 13
- **Active Alerts**: 17 (newly generated)
- **Workflow Phases**: 6
- **Workflow Sections**: 30
- **Workflow Line Items**: 86

## Key Relationships

1. **Projects** → **Customers** (Many-to-One)
2. **Projects** → **Project Workflow Trackers** (One-to-One)
3. **Projects** → **Workflow Alerts** (One-to-Many)
4. **Workflow Phases** → **Workflow Sections** (One-to-Many)
5. **Workflow Sections** → **Workflow Line Items** (One-to-Many)
6. **Users** → **Role Assignments** (One-to-Many)
7. **Project Workflow Trackers** → **Completed Workflow Items** (One-to-Many)

## Alert Generation Summary

Successfully generated alerts for all 17 active projects:
- Each project has an alert for its current workflow line item
- Alerts are assigned to available users with appropriate roles
- Due dates are calculated based on line item alert days
- All alerts are in ACTIVE status waiting for acknowledgment