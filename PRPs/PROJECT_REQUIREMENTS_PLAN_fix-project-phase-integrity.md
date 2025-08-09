# Project Requirements Plan: Fix Project Phase Integrity

## 1. FEATURE SPECIFICATION

**Feature Name**: Project Phase Integrity Correction
**Priority**: Critical
**Type**: Data Integrity Fix / Technical Debt Resolution

**Description**: Execute a comprehensive full-stack audit and correction to eliminate critical data integrity issues with project phases, ensuring a single consistent source of truth across database, backend, and frontend systems.

## 2. PROBLEM STATEMENT

### Current Issue
Major data inconsistency exists in project phases that is corrupting user workflows and compromising application reliability. The database and application contain incorrect and phantom phases that must be completely eliminated.

### Impact
- User workflow corruption
- Application instability
- Data inconsistency across system layers
- Compromised reliability and user trust

### Root Cause
Presence of unauthorized phases in the system:
- "Invoicing" 
- "Prospect: Non-Insurance Phase"

## 3. SOLUTION REQUIREMENTS

### 3.1 Functional Requirements

**FR-1: Single Source of Truth Definition**
- System SHALL only recognize exactly six phases in specified order:
  1. Lead
  2. Prospect
  3. Approved
  4. Execution
  5. 2nd Supplement
  6. Completion

**FR-2: Database Integrity**
- All phantom phases SHALL be permanently removed from database schema
- Existing projects assigned to phantom phases SHALL be reassigned to logical defaults
- Database schema SHALL enforce the six-phase constraint

**FR-3: Backend Alignment**
- All backend code references to phantom phases SHALL be removed
- API endpoints SHALL only support the six official phases
- Backend validation SHALL reject any phantom phase references

**FR-4: Frontend Consistency**
- UI components SHALL display only the six official phases
- Phase dropdowns and filters SHALL contain only official phases
- Project Workflow tab SHALL reflect clean data source

### 3.2 Technical Requirements

**TR-1: Database Migration**
- Create migration script to remove phantom phases from schema
- Update existing project records with phantom phase assignments
- Validate schema consistency post-migration

**TR-2: Code Cleanup**
- Perform global case-sensitive search for phantom phase references
- Remove all hardcoded phantom phase values
- Update validation logic and business rules

**TR-3: System Verification**
- Application restart capability
- Console error monitoring
- UI stability validation

## 4. IMPLEMENTATION PLAN

### Phase 1: Database Correction (Critical Path)
1. Analyze `prisma/schema.prisma` for Phase enum/table definition
2. Create migration script to delete phantom phases
3. Update existing project records with phantom phase assignments
4. Execute migration and validate results

### Phase 2: Backend Codebase Alignment
1. Global search in `server/` directory for phantom phase references
2. Remove/refactor dependent logic and validation rules
3. Update API endpoints to use only official phases
4. Test backend functionality

### Phase 3: Frontend Codebase Alignment
1. Global search in `src/` directory for phantom phase references
2. Clean UI components, state management, and hardcoded arrays
3. Update Project Workflow tab specifically
4. Test frontend functionality

### Phase 4: System-Wide Verification
1. Restart application
2. Navigate to Project Workflow section
3. Verify only six official phases display in correct order
4. Monitor for console errors and application stability

## 5. ACCEPTANCE CRITERIA

### Primary Success Criteria
- [ ] Database contains only the six official phases
- [ ] No project records assigned to phantom phases
- [ ] Backend code contains no references to phantom phases
- [ ] Frontend UI displays only official phases in correct order
- [ ] Project Workflow tab shows clean data
- [ ] Application runs without new console errors

### Quality Gates
- [ ] Database migration successfully executed
- [ ] All phantom phase references removed from codebase
- [ ] System restart completes without errors
- [ ] UI displays phases in exact specified order

## 6. RISK ASSESSMENT

### High Risk
- Data loss during migration if not properly backed up
- Application downtime during deployment
- Cascade effects on dependent systems

### Mitigation Strategies
- Create database backup before migration
- Test migration on development environment first
- Implement rollback procedures
- Monitor system stability post-deployment

## 7. TESTING STRATEGY

### Unit Tests
- Database schema validation
- API endpoint phase validation
- UI component phase rendering

### Integration Tests
- End-to-end workflow with official phases only
- Database-to-UI data consistency
- Phase progression logic

### System Tests
- Full application restart and stability
- User workflow completion with official phases
- Performance impact assessment

## 8. DEPLOYMENT CONSIDERATIONS

### Prerequisites
- Database backup completed
- Development environment testing passed
- Rollback procedures documented

### Deployment Steps
1. Execute database migration
2. Deploy backend code changes
3. Deploy frontend code changes
4. Restart application services
5. Validate system functionality

### Post-Deployment
- Monitor application logs
- Validate user workflows
- Confirm data integrity
- Document lessons learned

## 9. SUCCESS METRICS

### Technical Metrics
- Zero phantom phase references in codebase
- 100% project records using official phases
- Zero new console errors post-deployment

### User Experience Metrics
- Project Workflow tab displays correctly
- Phase progression works as expected
- No user workflow interruptions

### Operational Metrics
- System stability maintained
- Application performance unchanged
- Zero rollbacks required

## 10. TIMELINE

**Estimated Duration**: 1-2 days
**Critical Path**: Database correction → Backend alignment → Frontend alignment → Verification

**Milestone Schedule**:
- Day 1: Database correction and backend alignment
- Day 2: Frontend alignment and system verification

## 11. DEPENDENCIES

### Internal Dependencies
- Access to database migration tools
- Development environment for testing
- Application restart capability

### External Dependencies
- Database backup/restore capability
- Deployment pipeline access
- Monitoring tools availability

---

**Document Version**: 1.0  
**Created**: 2025-08-07  
**Status**: Draft  
**Next Review**: Upon implementation completion