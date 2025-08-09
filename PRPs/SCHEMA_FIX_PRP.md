# PROJECT REQUIREMENTS PLAN (PRP)
## Database Schema Mismatch Resolution - WorkflowStep Model

---

## 1. EXECUTIVE SUMMARY

### Project Name
Critical Schema Mismatch Fix - WorkflowStep Model `stepOrder` Field

### Purpose
Resolve the fatal database schema inconsistency that is preventing workflow progression functionality in the roofing project management system.

### Background
The PRP validation report identified a critical error where `workflowInitializationService.js` attempts to create WorkflowStep records with a `stepOrder` field that doesn't exist in the Prisma schema, causing workflow completion to fail entirely.

### Scope
- Analyze current schema discrepancies
- Update Prisma schema to include missing field
- Generate and apply database migration
- Validate fix through testing
- Ensure no breaking changes to existing data

---

## 2. PROBLEM ANALYSIS

### Current Error
```
Unknown argument `stepOrder`. Available options are listed in green.
Location: server/services/workflowInitializationService.js:257
```

### Impact Assessment
- **Critical**: Workflow progression completely blocked
- **User Impact**: Cannot complete any workflow tasks
- **System Impact**: Core automation feature non-functional
- **Business Impact**: Project lifecycle management broken

### Root Cause
Schema evolution mismatch between service layer expectations and database definition.

---

## 3. TECHNICAL REQUIREMENTS

### 3.1 Schema Analysis Requirements
- **TR-001**: Examine current WorkflowStep model in `server/prisma/schema.prisma`
- **TR-002**: Analyze service usage in `server/services/workflowInitializationService.js`
- **TR-003**: Identify all references to `stepOrder` field across codebase
- **TR-004**: Determine appropriate field type and constraints

### 3.2 Schema Update Requirements
- **TR-005**: Add `stepOrder` field to WorkflowStep model
- **TR-006**: Define appropriate data type (likely `Int`)
- **TR-007**: Add proper field constraints and defaults
- **TR-008**: Ensure backward compatibility with existing data

### 3.3 Migration Requirements
- **TR-009**: Generate Prisma migration for schema changes
- **TR-010**: Apply migration to development database
- **TR-011**: Handle existing WorkflowStep records appropriately
- **TR-012**: Verify migration success

### 3.4 Validation Requirements
- **TR-013**: Test WorkflowStep creation with new field
- **TR-014**: Validate workflow completion functionality
- **TR-015**: Ensure no regressions in related features
- **TR-016**: Confirm API endpoints work correctly

---

## 4. EXECUTION PLAN

### Phase 1: Analysis and Discovery

#### Task 1.1: Examine Current Schema
- **Action**: Read and analyze `server/prisma/schema.prisma` WorkflowStep model
- **Expected Outcome**: Complete understanding of current field structure
- **Validation**: Document all existing fields and relationships

#### Task 1.2: Analyze Service Layer Usage
- **Action**: Examine `server/services/workflowInitializationService.js:257`
- **Expected Outcome**: Understand how `stepOrder` is being used
- **Validation**: Identify expected data type and usage pattern

#### Task 1.3: Search for Related References
- **Action**: Search codebase for all `stepOrder` references
- **Expected Outcome**: Complete list of files using this field
- **Validation**: No missed dependencies

### Phase 2: Schema Design and Implementation

#### Task 2.1: Design Schema Changes
- **Action**: Define proper `stepOrder` field specification
- **Expected Outcome**: Complete field definition with type, constraints, defaults
- **Validation**: Schema design meets service requirements

#### Task 2.2: Update Prisma Schema
- **Action**: Add `stepOrder` field to WorkflowStep model
- **Expected Outcome**: Valid Prisma schema file
- **Validation**: `npx prisma validate` passes

#### Task 2.3: Generate Migration
- **Action**: Create Prisma migration for schema changes
- **Expected Outcome**: Migration files created successfully
- **Validation**: Migration files contain expected changes

### Phase 3: Database Migration and Testing

#### Task 3.1: Apply Migration
- **Action**: Execute `npx prisma migrate dev` or equivalent
- **Expected Outcome**: Database updated with new field
- **Validation**: Database schema matches Prisma schema

#### Task 3.2: Handle Existing Data
- **Action**: Update existing WorkflowStep records if needed
- **Expected Outcome**: All records have valid `stepOrder` values
- **Validation**: No NULL or invalid stepOrder values

#### Task 3.3: Regenerate Prisma Client
- **Action**: Run `npx prisma generate`
- **Expected Outcome**: Updated Prisma client with new field
- **Validation**: TypeScript types include stepOrder field

### Phase 4: Validation and Testing

#### Task 4.1: Test WorkflowStep Creation
- **Action**: Attempt to create WorkflowStep with stepOrder field
- **Expected Outcome**: Creation succeeds without errors
- **Validation**: Database record contains stepOrder value

#### Task 4.2: Test Workflow Completion
- **Action**: Complete a workflow line item via API
- **Expected Outcome**: Completion succeeds, next item activated
- **Validation**: Workflow progression works end-to-end

#### Task 4.3: Regression Testing
- **Action**: Test related workflow functionality
- **Expected Outcome**: No existing features broken
- **Validation**: All workflow APIs remain functional

---

## 5. FIELD SPECIFICATION

### Proposed `stepOrder` Field Definition
Based on typical usage patterns in workflow systems:

```prisma
model WorkflowStep {
  // ... existing fields ...
  stepOrder      Int              // Sequential order within workflow
  // ... rest of fields ...
}
```

### Rationale
- **Type**: `Int` - Sequential numeric ordering
- **Constraints**: No default needed (service provides value)
- **Indexing**: Consider adding index for query performance
- **Nullable**: Not nullable (required for proper ordering)

---

## 6. RISK ASSESSMENT

### 6.1 Technical Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Migration failure | Low | High | Backup database before migration |
| Data corruption | Very Low | High | Test on development environment first |
| Breaking changes | Medium | Medium | Thorough regression testing |
| Performance impact | Low | Low | Monitor query performance post-migration |

### 6.2 Business Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| System downtime | Low | Medium | Apply during maintenance window |
| Feature regression | Low | High | Comprehensive testing protocol |

---

## 7. SUCCESS CRITERIA

### Primary Success Criteria
- ✅ WorkflowStep records can be created with stepOrder field
- ✅ Workflow completion API endpoints function correctly
- ✅ No existing functionality is broken
- ✅ Database migration completes successfully

### Performance Criteria
- WorkflowStep creation time: < 100ms
- Migration execution time: < 30 seconds
- No degradation in query performance

### Quality Criteria
- Zero data loss during migration
- All existing WorkflowStep records remain accessible
- Schema validation passes

---

## 8. TESTING PROTOCOL

### 8.1 Pre-Migration Testing
1. Backup current database
2. Document current WorkflowStep record count
3. Test current (broken) workflow completion behavior

### 8.2 Post-Migration Testing
1. Verify schema update applied correctly
2. Test WorkflowStep creation with stepOrder
3. Test workflow completion end-to-end
4. Validate existing data integrity
5. Performance regression testing

### 8.3 Rollback Plan
If migration fails:
1. Restore database from backup
2. Revert schema changes
3. Investigate failure cause
4. Re-plan migration approach

---

## 9. IMPLEMENTATION COMMANDS

### Development Environment
```bash
# 1. Update schema file
# (manual editing of server/prisma/schema.prisma)

# 2. Validate schema
cd server
npx prisma validate

# 3. Generate migration
npx prisma migrate dev --name add_step_order_field

# 4. Generate client
npx prisma generate

# 5. Restart application
npm run dev
```

### Production Environment
```bash
# 1. Deploy migration
npx prisma migrate deploy

# 2. Generate client
npx prisma generate

# 3. Restart application servers
```

---

## 10. DELIVERABLES

### Primary Deliverables
1. **Updated Prisma Schema** - `server/prisma/schema.prisma` with stepOrder field
2. **Database Migration** - Generated migration files
3. **Validation Report** - Test results confirming fix
4. **Documentation** - Updated schema documentation

### Supporting Deliverables
1. **Backup Scripts** - Database backup procedures
2. **Rollback Plan** - Detailed rollback instructions
3. **Performance Metrics** - Before/after performance comparison
4. **Test Results** - Comprehensive testing validation

---

## 11. ACCEPTANCE CRITERIA

The schema mismatch fix will be considered successful when:

1. **Technical Acceptance**
   - `npx prisma validate` passes without errors
   - WorkflowStep creation includes stepOrder field
   - No Prisma client generation errors
   - All existing data remains accessible

2. **Functional Acceptance**
   - Workflow completion API calls succeed
   - Next workflow items activate correctly
   - No errors in application logs
   - End-to-end workflow progression works

3. **Quality Acceptance**
   - Zero data loss confirmed
   - No performance degradation measured
   - All regression tests pass
   - Documentation updated

---

## APPENDIX A: ERROR CONTEXT

### Original Error Message
```
Invalid `prisma.workflowStep.create()` invocation in
C:\Users\Jimbo\OneDrive\roofing-project-2\server\services\workflowInitializationService.js:257:39

Unknown argument `stepOrder`. Available options are listed in green.
```

### Impact on PRP Validation
- Prevented completion of Phase 2 validation tasks
- Blocked testing of workflow progression functionality
- Caused 30% reduction in overall validation success rate

---

## APPENDIX B: SCHEMA INVESTIGATION CHECKLIST

### Pre-Implementation Checklist
- [ ] Current WorkflowStep model documented
- [ ] Service usage patterns analyzed
- [ ] All stepOrder references identified
- [ ] Field specification finalized
- [ ] Migration strategy confirmed
- [ ] Rollback plan prepared
- [ ] Testing protocol defined

### Post-Implementation Checklist
- [ ] Schema migration successful
- [ ] Prisma client regenerated
- [ ] WorkflowStep creation tested
- [ ] Workflow completion validated
- [ ] Performance verified
- [ ] Documentation updated
- [ ] Rollback tested (in dev environment)

---

*Document Version: 1.0*  
*Created: 2025-08-07*  
*Priority: CRITICAL*  
*Status: READY FOR EXECUTION*