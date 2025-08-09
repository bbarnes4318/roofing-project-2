# Standardize Project Manager Term - Project Requirements Plan (PRP)

## Executive Summary

**Problem Statement:** The application uses inconsistent terminology for project managers across different components and API responses, causing confusion and potential bugs. Terms like "PM", "Project Manager", "Product Manager", and "PRODUCT_MANAGER" are used interchangeably.

**Objective:** Standardize all references to project managers throughout the codebase to use consistent terminology and role naming, improving clarity and reducing potential confusion.

**Business Impact:** Improved user experience through consistent terminology and reduced developer confusion when working with project manager-related code.

## Current State Assessment

### Terminology Inconsistencies Found
- **Frontend Display**: "PM", "Project Manager", "Product Manager"
- **API Responses**: "PRODUCT_MANAGER", "PROJECT_MANAGER" 
- **Role Types**: Mixed usage of product vs project manager terms
- **Database Schema**: Inconsistent field naming and role references

### Technical Impact Areas
- **User Interface**: Confusing labels and role displays
- **API Integration**: Mismatched role type mappings
- **Role Assignment**: Unclear role hierarchy and permissions
- **Documentation**: Mixed terminology throughout codebase

## Requirements Specification

### 1. Terminology Standardization Requirements
- **R1.1**: Establish "Project Manager" as the standard term throughout application
- **R1.2**: Replace all instances of "Product Manager" with "Project Manager"
- **R1.3**: Standardize role type to "PROJECT_MANAGER" in backend systems
- **R1.4**: Update all UI displays to show "Project Manager" consistently

### 2. Role Type Consistency Requirements
- **R2.1**: Update role assignment APIs to use PROJECT_MANAGER consistently
- **R2.2**: Modify role mapping functions to handle legacy terms
- **R2.3**: Ensure database role types align with standard terminology
- **R2.4**: Update role validation to accept standard terms

### 3. Display Consistency Requirements
- **R3.1**: Standardize short form display as "PM" when space is limited
- **R3.2**: Use "Project Manager" for full form displays
- **R3.3**: Update role assignment dropdowns to show correct titles
- **R3.4**: Ensure tooltips and help text use consistent terminology

### 4. Backward Compatibility Requirements
- **R4.1**: Maintain API backward compatibility during transition
- **R4.2**: Handle legacy data that may use old terminology
- **R4.3**: Provide migration path for existing role assignments
- **R4.4**: Ensure no functionality breaks during standardization

## Technical Implementation Plan

### Phase 1: Backend Role Standardization
**Timeline**: 2-3 hours
**Priority**: High

#### 1.1 Role Type Updates
- Update role types in `server/routes/roles.js`
- Modify role assignment APIs to standardize terminology
- Update role validation to handle both old and new terms
- Ensure database consistency for role assignments

#### 1.2 API Response Standardization
- Modify role mapping functions to return consistent terminology
- Update role display name mappings
- Ensure API responses use standardized role types
- Add backward compatibility for legacy role references

### Phase 2: Frontend Display Standardization
**Timeline**: 2-3 hours
**Priority**: High

#### 2.1 Component Updates
- Update all project cards to display "Project Manager" consistently
- Modify role assignment dropdowns to use standard terminology
- Update dashboard displays to show correct role titles
- Ensure tooltip and help text consistency

#### 2.2 Role Assignment Interface
- Update My Projects page role assignment dropdowns
- Modify settings page role assignment interface
- Ensure consistent role labeling in all forms
- Update validation messages to use standard terms

### Phase 3: Data Migration and Testing
**Timeline**: 1-2 hours
**Priority**: Medium

#### 3.1 Data Consistency Check
- Verify existing role assignments use correct terminology
- Update any legacy role type references in database
- Ensure role assignment functionality works with new terms
- Test backward compatibility with existing data

#### 3.2 Comprehensive Testing
- Test all role assignment workflows
- Verify project manager displays across all components
- Ensure API responses are consistent
- Validate role-based permissions still work correctly

## Implementation Details

### Files Requiring Updates

#### Backend Files
1. **server/routes/roles.js**
   - Update role type mappings from PRODUCT_MANAGER to PROJECT_MANAGER
   - Modify role validation to accept standard terminology
   - Update API responses to use consistent role names

2. **Role Assignment APIs**
   - Ensure consistent role type handling
   - Update role validation logic
   - Maintain backward compatibility

#### Frontend Files
1. **src/components/pages/ProjectsPage.jsx**
   - Update project manager field labels
   - Modify role assignment dropdown options
   - Ensure consistent terminology in forms

2. **src/components/common/ProjectRoleDropdowns.jsx**
   - Update role display names
   - Modify dropdown options to use standard terminology
   - Update validation messages

3. **Dashboard Components**
   - Update project manager displays in project cards
   - Modify role indicators to use consistent terms
   - Ensure tooltip consistency

### Terminology Mapping Strategy

#### Standard Terminology
```javascript
// BEFORE (Inconsistent)
'PRODUCT_MANAGER' -> 'Product Manager'
'PROJECT_MANAGER' -> 'Project Manager' 
'PM' -> 'PM'

// AFTER (Standardized)
'PROJECT_MANAGER' -> 'Project Manager'
'PM' -> 'PM' (short form only)
```

#### Role Type Standardization
```javascript
// Backend Role Types (Standardized)
const STANDARD_ROLE_TYPES = {
  PROJECT_MANAGER: 'PROJECT_MANAGER',
  FIELD_DIRECTOR: 'FIELD_DIRECTOR',
  OFFICE_STAFF: 'OFFICE_STAFF',
  ADMINISTRATION: 'ADMINISTRATION'
};

// Display Name Mapping
const ROLE_DISPLAY_NAMES = {
  PROJECT_MANAGER: 'Project Manager',
  FIELD_DIRECTOR: 'Field Director', 
  OFFICE_STAFF: 'Office Staff',
  ADMINISTRATION: 'Administration'
};
```

## Risk Assessment

### Technical Risks
- **Data Inconsistency**: Existing role assignments may use old terminology
- **API Breaking Changes**: Frontend/backend communication issues
- **User Confusion**: Temporary inconsistency during rollout

### Mitigation Strategies
- Implement gradual rollout with backward compatibility
- Maintain legacy term support during transition period
- Provide clear mapping between old and new terminology
- Test thoroughly before full deployment

## Success Criteria

### Consistency Success Metrics
- ✅ All UI components display "Project Manager" consistently
- ✅ All API responses use standardized role types
- ✅ Role assignment functionality works with new terminology
- ✅ Short form displays use "PM" consistently

### Functionality Success Metrics
- ✅ No breaking changes to existing role assignments
- ✅ Role-based permissions continue to work correctly
- ✅ Project manager assignment workflow functions properly
- ✅ Backward compatibility maintained for legacy data

### User Experience Success Metrics
- ✅ Clear, consistent role terminology throughout application
- ✅ No confusion about project manager vs product manager roles
- ✅ Professional appearance with standardized language
- ✅ Improved clarity in role assignment interfaces

## Implementation Timeline

### Week 1: Backend Standardization (4-5 hours)
- Days 1-2: Update role types and API responses
- Days 2-3: Implement backward compatibility
- Day 3: Test backend changes

### Week 2: Frontend Updates (3-4 hours)
- Days 1-2: Update component displays and forms
- Day 2: Modify role assignment interfaces
- Day 3: Test frontend changes

### Week 3: Integration and Polish (2-3 hours)
- Day 1: End-to-end testing
- Day 2: Fix any inconsistencies found
- Day 3: Final validation and documentation

**Total Estimated Effort**: 9-12 hours over 2-3 weeks

## Conclusion

This PRP provides a systematic approach to standardizing project manager terminology throughout the application. The phased approach ensures backward compatibility while delivering consistent user experience and eliminating terminology confusion.

**Key Benefits:**
- ✅ Consistent, professional terminology
- ✅ Reduced developer and user confusion
- ✅ Improved role clarity and assignment
- ✅ Better code maintainability
- ✅ Enhanced user experience

**Next Steps:**
1. Review and approve terminology standardization plan
2. Begin backend role type standardization
3. Update frontend components systematically
4. Conduct thorough testing and validation
5. Deploy changes with confidence

---
*Document Version*: 1.0  
*Created*: 2025-08-07  
*Status*: Ready for Implementation  
*Impact*: Low Risk, High Value Consistency Improvement