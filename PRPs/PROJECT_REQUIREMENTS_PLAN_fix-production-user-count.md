# Project Requirements Plan: Fix Production User Count

## 1. FEATURE SPECIFICATION

**Feature Name**: Production User Count Data Integrity Fix
**Priority**: CRITICAL (P0)
**Type**: Data Integrity Bug / Production Issue
**Impact**: Business Critical - Trust & Data Accuracy

**Description**: Diagnose and resolve a critical data integrity issue where the production server displays only 2 users while the local development environment correctly shows 12+ users, indicating a fundamental disconnect between production and the actual database state.

## 2. PROBLEM STATEMENT

### Current Issue
The production environment is displaying drastically incorrect user count data:
- **Production**: Shows only 2 users
- **Local Development**: Shows 12+ users (correct)
- **Impact**: Complete loss of data integrity visibility in production
- **Trust**: Undermines user confidence in the system's accuracy

### Symptoms
- User count mismatch between environments
- Production appears to be using stale or seeded data
- Database queries returning limited results in production
- Potential data loss or inaccessibility

### Possible Root Causes
1. **Wrong Database Connection**: Production pointing to test/seed database
2. **Seeding on Deploy**: Production deployment running seed scripts
3. **Query Limitations**: Production-specific limits in API queries
4. **Caching Issues**: Stale cached data being served
5. **Environment Variable Misconfiguration**: Incorrect DATABASE_URL

## 3. SOLUTION REQUIREMENTS

### 3.1 Functional Requirements

**FR-1: Correct User Count Display**
- Production SHALL display the exact same user count as development
- User count MUST reflect actual database state
- All users in database MUST be accessible via API
- No artificial limits SHALL be applied to user queries

**FR-2: Data Integrity Verification**
- System SHALL verify database connection on startup
- API SHALL log database connection details (sanitized)
- User count SHALL be validated against database directly
- Monitoring SHALL alert on data discrepancies

**FR-3: Deployment Process Integrity**
- Deployment SHALL NOT run seed scripts in production
- Database migrations SHALL be separate from seeding
- Production database SHALL remain untouched by test data
- Deployment logs SHALL clearly show database operations

### 3.2 Technical Requirements

**TR-1: Environment Configuration**
- DATABASE_URL MUST point to production database
- NODE_ENV MUST be set to "production"
- All environment variables MUST be validated on startup
- Connection strings MUST be properly formatted

**TR-2: API Query Implementation**
- User queries MUST NOT have hardcoded limits
- Pagination SHALL be optional, not mandatory
- Query results MUST match database state
- No production-specific query restrictions

**TR-3: Deployment Pipeline**
- Seed commands MUST be removed from production scripts
- Database operations MUST be logged
- Deployment MUST verify database connectivity
- Rollback procedures MUST be documented

## 4. ACCEPTANCE CRITERIA

### Primary Success Criteria
- [ ] Production displays correct user count (12+)
- [ ] User count matches between all environments
- [ ] API returns all users without artificial limits
- [ ] No seed data in production database
- [ ] Environment variables correctly configured
- [ ] Deployment process does not alter production data

### Verification Steps
- [ ] Query database directly to confirm user count
- [ ] Compare API response with database state
- [ ] Verify environment variable configuration
- [ ] Review deployment logs for seed operations
- [ ] Test user listing functionality end-to-end

### Quality Gates
- [ ] Production user count === Database user count
- [ ] No "prisma db seed" in production logs
- [ ] DATABASE_URL points to correct production DB
- [ ] API returns complete user list

## 5. IMPLEMENTATION PLAN

### Phase 1: Environment Investigation (30 minutes)

1. **Check Environment Variables**
   ```bash
   # Check production environment configuration
   cat .env.production
   cat .env
   
   # Verify DATABASE_URL
   echo $DATABASE_URL
   
   # Check NODE_ENV
   echo $NODE_ENV
   ```

2. **Verify Database Connection**
   ```bash
   # Test database connection
   npx prisma db pull
   
   # Count users in database
   npx prisma studio
   # OR
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
   ```

3. **Digital Ocean App Platform Check**
   - Review environment variables in DO console
   - Check app settings for DATABASE_URL
   - Verify connection to correct database cluster

### Phase 2: Deployment Analysis (30 minutes)

1. **Review Deployment Scripts**
   ```javascript
   // Check package.json scripts
   {
     "scripts": {
       "build": "...",
       "start": "...",
       "postinstall": "...", // Look for seed commands here
       "deploy": "..."
     }
   }
   ```

2. **Check Dockerfile/Build Commands**
   ```dockerfile
   # Look for seed commands in Dockerfile
   RUN npm run seed  # This should NOT exist
   CMD ["npm", "start"]
   ```

3. **Vercel/Digital Ocean Configuration**
   ```yaml
   # Check deployment configuration
   build_command: npm run build
   run_command: npm start  # Should NOT include seed
   ```

### Phase 3: API Investigation (30 minutes)

1. **Check User API Endpoints**
   ```javascript
   // server/routes/users.js or similar
   router.get('/users', async (req, res) => {
     const users = await prisma.user.findMany({
       // Check for limits here
       take: process.env.NODE_ENV === 'production' ? 2 : undefined
     });
   });
   ```

2. **Review Role Assignment Endpoints**
   ```javascript
   // Check for production-specific filtering
   if (process.env.NODE_ENV === 'production') {
     users = users.slice(0, 2); // Bad pattern
   }
   ```

3. **Database Query Analysis**
   ```javascript
   // Look for hardcoded limits
   const DEFAULT_USER_LIMIT = 2; // Problematic
   const users = await getUsers({ limit: DEFAULT_USER_LIMIT });
   ```

### Phase 4: Fix Implementation (45 minutes)

1. **Fix Environment Variables**
   ```bash
   # .env.production
   DATABASE_URL=postgresql://user:pass@correct-production-db:5432/dbname
   NODE_ENV=production
   ```

2. **Remove Seed Commands from Production**
   ```json
   // package.json
   {
     "scripts": {
       "build": "next build",
       "start": "node server.js",
       // Remove: "postinstall": "prisma generate && prisma db seed"
       "postinstall": "prisma generate"
     }
   }
   ```

3. **Fix API Queries**
   ```javascript
   // Remove production limits
   router.get('/users', async (req, res) => {
     const users = await prisma.user.findMany({
       // Remove any production-specific limits
       orderBy: { createdAt: 'desc' }
     });
     res.json({ success: true, data: users });
   });
   ```

### Phase 5: Validation (15 minutes)

1. **Direct Database Verification**
   ```sql
   SELECT COUNT(*) FROM users;
   SELECT id, email, name FROM users ORDER BY created_at;
   ```

2. **API Testing**
   ```bash
   curl https://production-domain.com/api/users | jq '.data | length'
   ```

3. **UI Verification**
   - Navigate to user management page
   - Verify all users are displayed
   - Check dropdown lists show all users

## 6. TECHNICAL SPECIFICATIONS

### Environment Variable Structure
```bash
# Production (.env.production)
DATABASE_URL=postgresql://user:password@db-cluster.ondigitalocean.com:25060/defaultdb?sslmode=require
NODE_ENV=production
JWT_SECRET=production-secret-key

# Development (.env.development)
DATABASE_URL=postgresql://user:password@localhost:5432/devdb
NODE_ENV=development
```

### Correct Deployment Pipeline
```yaml
# Digital Ocean App Spec
name: roofing-app
services:
  - name: web
    environment_slug: node-js
    build_command: npm ci && npm run build && npx prisma generate
    run_command: npm start
    envs:
      - key: DATABASE_URL
        scope: RUN_AND_BUILD_TIME
        value: ${db.DATABASE_URL}
      - key: NODE_ENV
        scope: RUN_AND_BUILD_TIME
        value: production
```

### Database Seed Prevention
```javascript
// prisma/seed.js
if (process.env.NODE_ENV === 'production') {
  console.error('⚠️ Seed script blocked in production!');
  process.exit(1);
}

// Seeding logic only for development
```

### API Query Patterns
```javascript
// CORRECT: No artificial limits
const getUsers = async () => {
  return await prisma.user.findMany({
    include: {
      role: true,
      projects: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
};

// INCORRECT: Production limits
const getUsers = async () => {
  const limit = process.env.NODE_ENV === 'production' ? 2 : 100;
  return await prisma.user.findMany({ take: limit });
};
```

## 7. TESTING STRATEGY

### Pre-Deployment Testing
1. **Environment Variable Validation**
   - Verify DATABASE_URL format
   - Test connection string locally
   - Confirm SSL settings if required

2. **Seed Script Testing**
   - Run build command locally
   - Verify seed is skipped in production mode
   - Check for seed artifacts

### Post-Deployment Testing
1. **Data Verification**
   ```bash
   # Direct database query
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
   
   # API endpoint test
   curl -H "Authorization: Bearer $TOKEN" \
        https://production.com/api/users \
        | jq '.data | length'
   ```

2. **UI Verification**
   - Login to production
   - Navigate to user management
   - Count displayed users
   - Verify dropdown populations

3. **Monitoring Setup**
   ```javascript
   // Add monitoring for user count
   setInterval(async () => {
     const userCount = await prisma.user.count();
     console.log(`User count check: ${userCount}`);
     if (userCount < 10) {
       console.error('⚠️ Low user count detected!');
       // Send alert
     }
   }, 3600000); // Check hourly
   ```

## 8. RISK ASSESSMENT

### High Risk
- **Data Loss**: Wrong database could mean real data inaccessible
- **Security**: Test database in production exposes vulnerabilities
- **Compliance**: Data integrity issues may violate regulations

### Medium Risk
- **Performance**: Full user list queries without pagination
- **Deployment**: Changes to deployment pipeline
- **Rollback**: Need clear rollback procedure

### Low Risk
- **Caching**: Temporary stale data after fix
- **UI**: Minor display adjustments needed

### Mitigation Strategies
1. **Backup** production database before changes
2. **Test** connection strings before deployment
3. **Monitor** user count after deployment
4. **Document** all environment changes
5. **Prepare** rollback scripts

## 9. SUCCESS METRICS

### Immediate (Within 1 Hour)
- ✅ Correct user count displayed (12+)
- ✅ All users accessible via API
- ✅ No seed operations in production logs
- ✅ DATABASE_URL correctly configured

### Short-term (Within 24 Hours)
- ✅ No user count discrepancies reported
- ✅ Monitoring alerts configured
- ✅ Documentation updated
- ✅ Team notified of resolution

### Long-term (Within 1 Week)
- ✅ No regression to incorrect count
- ✅ Deployment pipeline hardened
- ✅ Automated tests for user count
- ✅ Regular data integrity checks

## 10. ROLLBACK PLAN

If the fix causes issues:

1. **Immediate Rollback**
   ```bash
   # Revert environment variables
   git revert HEAD
   git push origin master
   
   # Restore previous DATABASE_URL if changed
   ```

2. **Database Recovery**
   ```sql
   -- If data was modified
   ROLLBACK;
   -- Restore from backup if needed
   ```

3. **Communication**
   - Notify team immediately
   - Document issue encountered
   - Schedule emergency fix meeting

## 11. ROOT CAUSE PREVENTION

### Process Improvements
1. **Environment Validation**
   - Add startup checks for environment
   - Log sanitized connection details
   - Validate expected data presence

2. **Deployment Hardening**
   ```javascript
   // server.js - Add startup validation
   async function validateEnvironment() {
     const userCount = await prisma.user.count();
     if (userCount < 10) {
       console.error('⚠️ Warning: Low user count detected');
     }
     console.log(`✅ Environment validated: ${userCount} users`);
   }
   ```

3. **Monitoring Implementation**
   - Set up alerts for user count drops
   - Monitor database connections
   - Track deployment operations

4. **Documentation**
   - Document all environment variables
   - Create deployment runbook
   - Maintain troubleshooting guide

## 12. DELIVERABLES

### Code Changes
- Fixed environment configuration
- Removed seed commands from production
- Corrected API query limits
- Added validation checks

### Configuration Updates
- Updated .env.production file
- Modified deployment scripts
- Corrected Digital Ocean settings
- Fixed build commands

### Documentation
- Environment variable guide
- Deployment process documentation
- Troubleshooting runbook
- Post-mortem report

### Monitoring
- User count alerts
- Database connection monitoring
- Deployment operation logging
- Data integrity checks

---

**Document Version**: 1.0  
**Created**: 2025-08-07  
**Status**: Ready for Execution  
**Severity**: CRITICAL - Data Integrity  
**Estimated Time**: 2 hours  
**Affected Systems**: Production database, API, User management