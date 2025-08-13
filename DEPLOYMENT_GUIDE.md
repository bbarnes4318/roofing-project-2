# Database Optimization Deployment Guide

**Date:** August 12, 2025  
**Version:** 1.0  
**Database:** PostgreSQL with Prisma ORM  

## Overview

This guide provides step-by-step instructions for deploying the comprehensive database optimization updates to your roofing project management application. The optimization includes workflow consolidation, data type standardization, constraint implementation, and performance enhancements.

## ⚠️ Pre-Deployment Checklist

- [ ] **Database Backup**: Create full database backup
- [ ] **Environment Verification**: Confirm target environment details
- [ ] **Dependency Check**: Ensure all dependencies are installed
- [ ] **Permission Verification**: Confirm database permissions
- [ ] **Rollback Plan**: Prepare rollback procedures
- [ ] **Maintenance Window**: Schedule appropriate downtime
- [ ] **Team Notification**: Alert all stakeholders

## 📋 Prerequisites

### System Requirements
- PostgreSQL 12+ 
- Node.js 18+
- Prisma CLI 5.0+
- Minimum 4GB RAM for migration process
- 10GB free disk space for temporary operations

### Access Requirements
- Database superuser privileges (for constraint creation)
- Application deployment permissions
- SSH access to production servers

## 🚀 Deployment Steps

### Step 1: Environment Preparation

```bash
# 1. Backup current database
pg_dump -h localhost -U postgres -d roofing_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Verify backup integrity
pg_restore --list backup_*.sql | head -20

# 3. Create deployment log directory
mkdir -p deployment_logs
```

### Step 2: Pre-Migration Validation

```bash
# 1. Run pre-migration checks
node server/scripts/pre-migration-check.js

# 2. Verify data integrity
node server/scripts/verify-data-integrity.js

# 3. Check current schema version
npx prisma db execute --schema=server/prisma/schema.prisma --stdin < server/scripts/check-schema-version.sql
```

### Step 3: Execute Migrations (Zero-Downtime Strategy)

#### Phase A: Structure Updates (Low Impact)
```bash
# 1. Apply workflow consolidation migration
psql -d roofing_db -f server/prisma/migrations/20250812_workflow_consolidation/migration.sql

# 2. Apply phase tracking standardization
psql -d roofing_db -f server/prisma/migrations/20250812_phase_tracking_standardization/migration.sql

# 3. Verify phase A completion
node server/scripts/verify-phase-a.js
```

#### Phase B: Data Type Standardization (Medium Impact)
```bash
# 1. Apply data type updates
psql -d roofing_db -f server/prisma/migrations/20250812_data_type_standardization/migration.sql

# 2. Verify data type migration
node server/scripts/verify-data-types.js

# 3. Update application configuration
cp server/prisma/schema_optimized.prisma server/prisma/schema.prisma
```

#### Phase C: Constraints and Performance (High Impact)
```bash
# ⚠️ This phase requires brief application downtime
# 1. Stop application services
systemctl stop roofing-app

# 2. Apply constraints
psql -d roofing_db -f server/prisma/migrations/20250812_constraints_and_validations/migration.sql

# 3. Apply performance optimizations
psql -d roofing_db -f server/prisma/migrations/20250812_performance_optimization/migration.sql

# 4. Generate new Prisma client
cd server && npx prisma generate

# 5. Restart application with new code
systemctl start roofing-app
```

### Step 4: Post-Migration Validation

```bash
# 1. Run comprehensive test suite
cd server && npm test -- tests/workflow-optimization.test.js

# 2. Verify all constraints are active
node server/scripts/verify-constraints.js

# 3. Check materialized views
node server/scripts/verify-materialized-views.js

# 4. Performance benchmark
node server/scripts/performance-benchmark.js
```

### Step 5: Application Updates

```bash
# 1. Deploy updated service files
cp server/services/OptimizedWorkflowService.js server/services/WorkflowService.js

# 2. Update API endpoints to use optimized service
node server/scripts/update-api-endpoints.js

# 3. Restart application services
systemctl restart roofing-app
systemctl restart roofing-worker
```

## 🔧 Rollback Procedures

### Quick Rollback (Structure Only)
```bash
# 1. Stop application
systemctl stop roofing-app

# 2. Restore from backup
psql -d roofing_db_rollback < backup_YYYYMMDD_HHMMSS.sql

# 3. Switch database connection
# Update DATABASE_URL in .env to point to rollback database

# 4. Restart with previous code version
git checkout previous-release
systemctl start roofing-app
```

### Full Rollback (Complete Restore)
```bash
# 1. Create current state backup (for analysis)
pg_dump -h localhost -U postgres -d roofing_db > failed_migration_$(date +%Y%m%d_%H%M%S).sql

# 2. Drop current database
dropdb roofing_db

# 3. Restore from pre-migration backup
createdb roofing_db
psql -d roofing_db < backup_YYYYMMDD_HHMMSS.sql

# 4. Revert application code
git checkout previous-release
cd server && npm install
npx prisma generate

# 5. Restart services
systemctl restart roofing-app
```

## 📊 Monitoring and Validation

### Performance Monitoring
```bash
# 1. Monitor query performance
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;

# 2. Check index usage
SELECT * FROM index_usage_stats 
WHERE usage_level = 'UNUSED';

# 3. Monitor table sizes
SELECT * FROM table_size_stats 
ORDER BY total_bytes DESC;
```

### Health Checks
```bash
# 1. Verify workflow functionality
curl -X GET http://localhost:5000/api/workflow/status/PROJECT_ID

# 2. Check constraint violations
SELECT * FROM constraint_violations WHERE resolved = false;

# 3. Monitor materialized view freshness
SELECT view_name, last_refresh 
FROM materialized_view_status;
```

### Alert Configuration
```bash
# 1. Set up performance alerts
# CPU usage > 80% for 5 minutes
# Memory usage > 90% for 2 minutes
# Query time > 1000ms for any query

# 2. Set up constraint violation alerts
# Any new constraint violations
# Failed workflow progressions

# 3. Set up business logic alerts
# Workflow step completion failures
# Phase advancement errors
```

## 🧪 Testing Procedures

### Automated Testing
```bash
# 1. Run full test suite
npm test

# 2. Run performance benchmarks
npm run test:performance

# 3. Run integration tests
npm run test:integration

# 4. Run load tests
npm run test:load
```

### Manual Testing Checklist
- [ ] Create new project with workflow
- [ ] Complete workflow steps and verify progression
- [ ] Test phase advancement
- [ ] Verify alert generation
- [ ] Test search functionality
- [ ] Check dashboard performance
- [ ] Validate constraint enforcement
- [ ] Test state machine transitions

## 🔍 Troubleshooting

### Common Issues

#### Migration Timeout
```bash
# Increase statement timeout
SET statement_timeout = '30min';

# Run migrations in smaller batches
\i migration_part_1.sql
\i migration_part_2.sql
```

#### Constraint Violations During Migration
```bash
# Check which records violate constraints
SELECT * FROM users WHERE NOT is_valid_email(email);

# Fix data before applying constraints
UPDATE users SET email = 'fixed@example.com' 
WHERE NOT is_valid_email(email);
```

#### Performance Degradation
```bash
# Refresh materialized views
SELECT refresh_all_materialized_views();

# Update table statistics
ANALYZE;

# Check for missing indexes
SELECT * FROM pg_stat_user_tables 
WHERE seq_scan > 100000;
```

#### Application Connection Issues
```bash
# Verify connection pooling
SELECT state, count(*) 
FROM pg_stat_activity 
GROUP BY state;

# Check for lock contention
SELECT blocked_locks.pid AS blocked_pid,
       blocked_activity.usename AS blocked_user,
       blocking_locks.pid AS blocking_pid,
       blocking_activity.usename AS blocking_user
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity 
  ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
  ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.relation = blocked_locks.relation
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity 
  ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

## 📈 Success Metrics

### Performance Improvements
- [ ] Query response times improved by 30%+
- [ ] Dashboard load time < 2 seconds
- [ ] Workflow operations < 500ms
- [ ] Search results < 200ms

### Reliability Improvements
- [ ] Zero constraint violations
- [ ] 100% workflow progression success rate
- [ ] No data consistency issues
- [ ] All business rules enforced

### Maintainability Improvements
- [ ] Single source of truth for phase tracking
- [ ] Consolidated workflow system
- [ ] Comprehensive audit trail
- [ ] Automated monitoring alerts

## 📞 Support Contacts

**Database Team:** db-team@company.com  
**DevOps Team:** devops@company.com  
**Emergency Hotline:** +1-XXX-XXX-XXXX  

## 📚 Additional Resources

- [PostgreSQL Performance Tuning Guide](https://postgresql.org/docs/current/performance-tips.html)
- [Prisma Migration Guide](https://prisma.io/docs/concepts/components/prisma-migrate)
- [Project Workflow Documentation](./docs/workflow-system.md)
- [API Documentation](./docs/api-reference.md)

---

**⚠️ Important Notes:**
- Always test in staging environment first
- Have rollback plan ready before starting
- Monitor system closely during and after deployment
- Document any deviations from this guide
- Keep team informed of progress and any issues