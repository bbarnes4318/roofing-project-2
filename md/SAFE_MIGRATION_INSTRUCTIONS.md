# 🛡️ SAFE Database Migration Instructions

## ✅ What This Does

Adds these **NEW** fields to your `company_assets` table WITHOUT touching existing data:
- `folder_name` - Human-readable names for folders
- `is_public` - Public/private permissions
- `thumbnail_url` - Preview images
- `checksum` - File verification
- `metadata` - Extra info (icons, colors)
- `access_level` - Access control

Also creates a NEW table `company_asset_versions` for version history.

## 🚀 How to Run (3 Simple Steps)

1. **Navigate to server directory**
   ```bash
   cd server
   ```

2. **(Optional) Check your database first**
   ```bash
   npm run check:company-docs
   ```
   This will show you exactly what will happen before making any changes.

3. **Run the safe migration**
   ```bash
   npm run migrate:company-docs
   ```
   
   This will:
   - ✅ Check if migration already exists (won't duplicate)
   - ✅ Add new columns safely
   - ✅ Update folder names to be human-readable
   - ✅ Create sample folder structure
   - ✅ Verify everything worked

3. **That's it!** Your database is now enhanced.

## 🔍 What Gets Updated

**Before:**
```
📁 folder_5802615  (cryptic ID)
📁 folder_7354502  (cryptic ID)
```

**After:**
```
📁 Contracts & Agreements
📁 Warranties & Certifications
📁 Inspection Reports
📁 Permits & Compliance
📁 Safety Documentation
```

## ⚠️ Important Notes

- **Your existing data is 100% SAFE** - we only ADD columns, never remove
- The migration is **idempotent** - safe to run multiple times
- All existing documents remain untouched
- If folders already exist, they just get better names

## 🆘 If Something Goes Wrong

The migration script will tell you exactly what to do, but generally:

1. Make sure you're in the `/server` directory
2. Run `npm install` if you get module errors
3. Check `ENV_FILE_FIX_SUMMARY.md` if you get DATABASE_URL errors

## 🎯 Alternative: Manual Prisma Migration

If you prefer using Prisma's migration system:

```bash
# Generate migration files
npx prisma migrate dev --name enhance_company_documents

# Then seed the data
npm run seed:company-docs
```

---

**Remember: This migration ONLY ADDS new features. It never deletes or modifies your existing data!**
