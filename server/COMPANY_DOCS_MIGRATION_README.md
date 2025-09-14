# Company Documents Enhancement - Database Migration Guide

## 🎯 Overview

This migration enhances the Company Documents section with:
- **Human-readable folder names** (no more cryptic IDs!)
- **Rich metadata** including icons, colors, and custom fields
- **Version history tracking** for all documents
- **Public/private access controls**
- **Enhanced search capabilities**

## 🛡️ Safety First

This migration has been designed to be **SAFE** and **NON-DESTRUCTIVE**:
- ✅ Adds new columns without removing existing ones
- ✅ Updates existing data with sensible defaults
- ✅ Creates indexes for better performance
- ✅ Includes rollback instructions if needed

## 📋 Pre-Migration Checklist

1. **Backup your database** (always a good practice!)
   ```bash
   pg_dump $DATABASE_URL > backup_before_company_docs_migration.sql
   ```

2. **Ensure you're in the server directory**
   ```bash
   cd server
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

## 🚀 Running the Migration

### Option 1: Automated Migration Script (Recommended)

Run the all-in-one migration script:

```bash
node scripts/run-company-docs-migration.js
```

This script will:
1. Check current database state
2. Apply SQL migration if needed
3. Regenerate Prisma client
4. Seed folder structure with proper names
5. Verify everything worked correctly

### Option 2: Manual Steps

If you prefer to run each step manually:

1. **Apply the SQL migration**
   ```bash
   npx prisma db execute --file prisma/migrations/20250114_enhance_company_assets.sql
   ```

2. **Regenerate Prisma client**
   ```bash
   npx prisma generate
   ```

3. **Seed the folder structure**
   ```bash
   node scripts/seed-company-documents.js
   ```

## 📊 What Gets Added

### New Database Columns

| Column | Type | Purpose |
|--------|------|---------|
| `folder_name` | VARCHAR(255) | Human-readable folder names |
| `is_public` | BOOLEAN | Public/private access control |
| `thumbnail_url` | VARCHAR(2000) | Preview image URLs |
| `checksum` | VARCHAR(255) | File integrity verification |
| `metadata` | JSONB | Flexible metadata (icons, colors, etc) |
| `access_level` | VARCHAR(50) | Granular access control |

### New Table

- `company_asset_versions` - Tracks version history for all documents

### Default Folder Structure

```
📁 Contracts & Agreements
  ├── 📁 Customer Contracts
  ├── 📁 Vendor Agreements
  └── 📁 Subcontractor Terms
  
📁 Warranties & Certifications
  ├── 📁 5-Year Warranties
  ├── 📁 2-Year Warranties
  └── 📁 Material Certifications
  
📁 Inspection Reports
  ├── 📁 Pre-Work Inspections
  ├── 📁 Progress Reports
  └── 📁 Final Inspections
  
📁 Permits & Compliance
  ├── 📁 Building Permits
  ├── 📁 State Regulations
  └── 📁 Colorado Specific
  
📁 Safety Documentation
  ├── 📁 Safety Protocols
  ├── 📁 Training Materials
  └── 📁 Incident Reports
```

## 🔍 Verification

After migration, verify success:

```sql
-- Check new columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'company_assets' 
AND column_name IN ('folder_name', 'is_public', 'metadata');

-- Check folder structure
SELECT title, folder_name, type, path 
FROM company_assets 
WHERE type = 'FOLDER' 
ORDER BY sort_order;
```

## ⚠️ Rollback (If Needed)

If you need to rollback:

```sql
-- Remove new columns (data will be lost)
ALTER TABLE company_assets 
DROP COLUMN IF EXISTS folder_name,
DROP COLUMN IF EXISTS is_public,
DROP COLUMN IF EXISTS thumbnail_url,
DROP COLUMN IF EXISTS checksum,
DROP COLUMN IF EXISTS metadata,
DROP COLUMN IF EXISTS access_level;

-- Drop version history table
DROP TABLE IF EXISTS company_asset_versions;

-- Remove indexes
DROP INDEX IF EXISTS idx_company_assets_folder_name;
DROP INDEX IF EXISTS idx_company_assets_is_public;
DROP INDEX IF EXISTS idx_company_assets_parent_type;
```

## 🐛 Troubleshooting

### "Column already exists" error
- The migration has already been applied. This is safe to ignore.

### "Permission denied" error
- Ensure your database user has ALTER TABLE permissions

### "Cannot find module" error
- Run `npm install` in the server directory

### Migration succeeded but no folders appear
- Run the seeding script again: `node scripts/seed-company-documents.js`

## 📝 Post-Migration Notes

1. The migration preserves all existing data
2. Existing folders get meaningful names based on their titles
3. Documents automatically get tagged based on their content
4. The `path` field is populated for easier breadcrumb navigation

## 🆘 Need Help?

If you encounter any issues:
1. Check the error logs
2. Verify your DATABASE_URL is correct
3. Ensure you have proper database permissions
4. The migration is idempotent - safe to run multiple times

---

Remember: **Your existing data is safe!** This migration only adds new functionality without removing anything.
