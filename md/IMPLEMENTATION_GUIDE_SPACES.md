# Implementation Guide: Migrate to Digital Ocean Spaces

## 🎯 Goal
Migrate all file uploads from ephemeral local filesystem to persistent Digital Ocean Spaces storage.

## ⚠️ Critical Understanding

**Digital Ocean App Platform uses ephemeral containers:**
- Files stored locally are **LOST on every deployment**
- Files are **LOST when containers restart**
- Files are **NOT shared** between multiple instances

**Digital Ocean Spaces provides:**
- ✅ Persistent storage that survives deployments
- ✅ Scalable storage (no container disk limits)
- ✅ CDN integration for faster access
- ✅ Backup and versioning capabilities
- ✅ Works with multiple app instances

## 📋 Prerequisites

### 1. Create Digital Ocean Spaces Bucket

1. Log into Digital Ocean
2. Go to **Spaces** in the left menu
3. Click **Create a Space**
4. Choose:
   - **Region**: Select closest to your users (e.g., NYC3, SFO3)
   - **Name**: e.g., `roofing-app-files`
   - **File Listing**: Keep **Restricted** (private)
   - **CDN**: Optional (can add later for better performance)
5. Click **Create a Space**

### 2. Generate Spaces Access Keys

1. In Digital Ocean, go to **API** → **Spaces Keys**
2. Click **Generate New Key**
3. Name it: `roofing-app-production`
4. **Save the Key and Secret** - you won't see the secret again!

### 3. Add Environment Variables to App Platform

1. Go to your App in Digital Ocean App Platform
2. Click **Settings** → **App-Level Environment Variables**
3. Add these variables:

```
DO_SPACES_NAME=roofing-app-files
DO_SPACES_KEY=your-spaces-access-key
DO_SPACES_SECRET=your-spaces-secret-key
DO_SPACES_REGION=nyc3
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
```

Replace:
- `roofing-app-files` with your actual bucket name
- `your-spaces-access-key` with your Spaces key
- `your-spaces-secret-key` with your Spaces secret
- `nyc3` with your chosen region
- The endpoint URL with your region's endpoint

4. Click **Save**

## 🔧 Implementation Steps

### Step 1: Test Spaces Connection

Add this test endpoint to `server/server.js` (temporarily):

```javascript
// Add after other routes, before error handlers
app.get('/api/test-spaces', async (req, res) => {
  try {
    const { getS3 } = require('./config/spaces');
    const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
    
    const s3 = getS3();
    const command = new ListObjectsV2Command({
      Bucket: process.env.DO_SPACES_NAME,
      MaxKeys: 5
    });
    
    const response = await s3.send(command);
    
    res.json({
      success: true,
      message: 'Spaces connection successful! ✅',
      config: {
        bucket: process.env.DO_SPACES_NAME,
        region: process.env.DO_SPACES_REGION,
        endpoint: process.env.DO_SPACES_ENDPOINT
      },
      filesFound: response.Contents?.length || 0,
      sampleFiles: response.Contents?.slice(0, 5).map(f => f.Key) || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Spaces connection failed ❌',
      error: error.message,
      config: {
        bucket: process.env.DO_SPACES_NAME,
        region: process.env.DO_SPACES_REGION,
        hasKey: !!process.env.DO_SPACES_KEY,
        hasSecret: !!process.env.DO_SPACES_SECRET
      }
    });
  }
});
```

Deploy and test: `https://your-app.ondigitalocean.app/api/test-spaces`

Expected response:
```json
{
  "success": true,
  "message": "Spaces connection successful! ✅",
  "config": {
    "bucket": "roofing-app-files",
    "region": "nyc3",
    "endpoint": "https://nyc3.digitaloceanspaces.com"
  },
  "filesFound": 0,
  "sampleFiles": []
}
```

### Step 2: Replace Company Documents Route

**Backup the old file:**
```bash
cp server/routes/companyDocuments.js server/routes/companyDocuments.OLD.js
```

**Replace with Spaces version:**
```bash
cp server/routes/companyDocuments-SPACES.js server/routes/companyDocuments.js
```

### Step 3: Replace Regular Documents Route

Create `server/routes/documents-SPACES.js` (similar to companyDocuments-SPACES.js) and replace:

```bash
cp server/routes/documents.js server/routes/documents.OLD.js
cp server/routes/documents-SPACES.js server/routes/documents.js
```

### Step 4: Update Enhanced Routes (if used)

If you're using the enhanced routes, update them similarly:

```bash
cp server/routes/companyDocumentsEnhanced.js server/routes/companyDocumentsEnhanced.OLD.js
cp server/routes/documents-enhanced.js server/routes/documents-enhanced.OLD.js
```

Then modify them to use Spaces (follow the same pattern as companyDocuments-SPACES.js).

### Step 5: Deploy Updated Code

```bash
git add .
git commit -m "Migrate file uploads to Digital Ocean Spaces"
git push origin main
```

Digital Ocean App Platform will automatically deploy.

### Step 6: Migrate Existing Files (if any)

**⚠️ Only run this if you have existing files in the database that need to be migrated.**

1. **Check if you have files to migrate:**
   ```sql
   -- Connect to your database and run:
   SELECT COUNT(*) FROM "Document" WHERE "fileUrl" LIKE '/uploads/%';
   SELECT COUNT(*) FROM "CompanyAsset" WHERE "fileUrl" LIKE '/uploads/%';
   ```

2. **If you have files to migrate, run the migration script locally:**
   ```bash
   cd server
   node scripts/migrate-to-spaces.js
   ```

3. **Review the output:**
   ```
   📊 MIGRATION SUMMARY
   ============================================================
   
   Documents:
     Total:    10
     Success:  10 ✅
     Skipped:  0 ⏭️
     Failed:   0 ❌
   
   Company Assets:
     Total:    5
     Success:  5 ✅
     Skipped:  0 ⏭️
     Failed:   0 ❌
   ```

4. **Verify files in Spaces:**
   - Go to your Spaces bucket in Digital Ocean
   - Check that files are there
   - Check file sizes match

### Step 7: Test Everything

1. **Upload a new company document:**
   - Go to Company Documents page
   - Upload a PDF
   - Verify it appears in the list
   - Click download - verify it downloads correctly

2. **Upload a new project document:**
   - Go to a project
   - Upload a document
   - Verify it appears
   - Download it

3. **Check the database:**
   ```sql
   SELECT "fileUrl" FROM "Document" ORDER BY "createdAt" DESC LIMIT 5;
   SELECT "fileUrl" FROM "CompanyAsset" ORDER BY "createdAt" DESC LIMIT 5;
   ```
   
   Should see URLs like: `spaces://company-assets/filename.pdf`

4. **Redeploy the app:**
   - Make a small change and redeploy
   - Verify files still exist and can be downloaded
   - This confirms persistence!

### Step 8: Remove Static File Serving (Optional)

Once everything is working, you can remove the static file serving middleware from `server/server.js`:

```javascript
// REMOVE OR COMMENT OUT these lines:
// app.use('/uploads', express.static(uploadsPath, { ... }));
```

This is optional - it won't hurt to leave it, but it's no longer needed.

### Step 9: Clean Up Local Files (Optional)

After verifying everything works:

```bash
# Backup first!
tar -czf uploads-backup.tar.gz server/uploads/

# Then remove (optional)
rm -rf server/uploads/company-assets/*
rm -rf server/uploads/documents/*
```

## 🧪 Testing Checklist

- [ ] Spaces connection test endpoint returns success
- [ ] Can upload new company document
- [ ] Can download company document
- [ ] Can delete company document
- [ ] Can upload new project document
- [ ] Can download project document
- [ ] Can delete project document
- [ ] Database shows `spaces://` URLs for new uploads
- [ ] Files persist after redeployment
- [ ] Files work with multiple file types (PDF, images, etc.)
- [ ] File sizes are correct
- [ ] MIME types are correct
- [ ] No CORS errors in browser console

## 🔄 Rollback Plan

If something goes wrong:

1. **Restore old route files:**
   ```bash
   cp server/routes/companyDocuments.OLD.js server/routes/companyDocuments.js
   cp server/routes/documents.OLD.js server/routes/documents.js
   git commit -m "Rollback to local filesystem"
   git push
   ```

2. **Files in Spaces remain** - you can re-migrate later

3. **Database changes are minimal** - just the `fileUrl` format

## 💰 Cost Estimate

Digital Ocean Spaces pricing:
- **$5/month** for 250 GB storage
- **$0.01/GB** for bandwidth after first 1 TB
- **Requests included**

For typical roofing app:
- ~100 documents @ 2MB each = 200 MB
- ~50 images @ 5MB each = 250 MB
- **Total: ~500 MB = $5/month**

Much cheaper than losing all files on every deployment!

## 🎯 Success Criteria

You'll know it's working when:

1. ✅ New uploads go to Spaces (check Spaces bucket)
2. ✅ Database shows `spaces://` URLs
3. ✅ Files can be downloaded
4. ✅ Files persist after redeployment
5. ✅ No 404 errors
6. ✅ No CORS errors

## 📞 Support

If you encounter issues:

1. Check the test endpoint: `/api/test-spaces`
2. Verify environment variables are set
3. Check Spaces bucket permissions
4. Review server logs in Digital Ocean
5. Check browser console for errors

## 🎉 Next Steps

After successful migration:

1. **Set up CDN** (optional) for faster global access
2. **Enable versioning** in Spaces for file history
3. **Set up backups** for Spaces bucket
4. **Monitor storage usage** in Digital Ocean dashboard
5. **Document the new process** for your team

