# Digital Ocean Spaces Migration - Critical Fix

## 🚨 CRITICAL ISSUE IDENTIFIED

Your application is currently storing uploaded files on the **ephemeral local filesystem** in Digital Ocean App Platform. This means:

- ❌ **All uploaded files are lost on every deployment**
- ❌ **Files disappear when containers restart**
- ❌ **No file persistence across application instances**

## Current State Analysis

### ✅ What's Working (Spaces-based)
- `server/routes/uploads.js` - Uses Digital Ocean Spaces correctly
- `server/routes/files.js` - Retrieves from Spaces correctly
- `server/config/spaces.js` - Spaces configuration exists

### ❌ What's Broken (Local filesystem)
- `server/routes/companyDocuments.js` - Stores to local `/uploads/company-assets/`
- `server/routes/companyDocumentsEnhanced.js` - Stores to local `/uploads/company-assets/`
- `server/routes/documents.js` - Stores to local `/uploads/documents/`
- `server/routes/documents-enhanced.js` - Stores to local `/uploads/documents/`

## Required Environment Variables

Add these to your Digital Ocean App Platform:

```bash
# Digital Ocean Spaces Configuration
DO_SPACES_NAME=your-bucket-name
DO_SPACES_KEY=your-spaces-access-key
DO_SPACES_SECRET=your-spaces-secret-key
DO_SPACES_REGION=nyc3  # or your region (nyc3, sfo3, sgp1, etc.)
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com  # or your region endpoint

# Optional: CDN endpoint if you have one configured
DO_SPACES_CDN_ENDPOINT=https://your-cdn-endpoint.com
```

## Solution Overview

We need to:

1. **Migrate all upload routes** to use Digital Ocean Spaces instead of local filesystem
2. **Update file URL format** in database to use `spaces://` prefix
3. **Update download routes** to stream from Spaces
4. **Migrate existing files** from local to Spaces (if any exist)
5. **Remove local filesystem dependencies**

## Implementation Plan

### Phase 1: Update Company Documents Routes
- Modify `server/routes/companyDocuments.js` to upload to Spaces
- Update download endpoint to stream from Spaces
- Change `fileUrl` format from `/uploads/...` to `spaces://...`

### Phase 2: Update Regular Documents Routes
- Modify `server/routes/documents.js` to upload to Spaces
- Update download endpoint to stream from Spaces
- Change `fileUrl` format from `/uploads/...` to `spaces://...`

### Phase 3: Update Enhanced Routes
- Modify `server/routes/companyDocumentsEnhanced.js`
- Modify `server/routes/documents-enhanced.js`

### Phase 4: Data Migration
- Create migration script to move existing files from local to Spaces
- Update database records to use new `spaces://` URLs

### Phase 5: Cleanup
- Remove local filesystem upload code
- Remove static file serving middleware (no longer needed)
- Update documentation

## File URL Format

### Old Format (Ephemeral - DO NOT USE)
```javascript
fileUrl: "/uploads/company-assets/filename.pdf"
```

### New Format (Persistent - USE THIS)
```javascript
fileUrl: "spaces://company-assets/filename.pdf"
// or
fileUrl: "spaces://files/general/1234567890_filename.pdf"
```

## How Files Are Accessed

### Upload Flow
```
Client → Express Server → Digital Ocean Spaces
                ↓
         Database (stores spaces:// URL)
```

### Download Flow
```
Client → Express Server → Digital Ocean Spaces → Stream to Client
              ↓
       Check database for spaces:// URL
```

## Benefits of Spaces Migration

1. ✅ **Persistent Storage** - Files survive deployments and restarts
2. ✅ **Scalability** - No disk space limits on containers
3. ✅ **CDN Integration** - Can add CDN for faster global access
4. ✅ **Backup & Versioning** - Spaces supports versioning and backups
5. ✅ **Cost Effective** - Pay only for storage used
6. ✅ **Multi-Instance** - Works with multiple app instances

## Migration Steps

### Step 1: Verify Spaces Configuration

```bash
# Check if environment variables are set
echo $DO_SPACES_NAME
echo $DO_SPACES_KEY
echo $DO_SPACES_SECRET
echo $DO_SPACES_REGION
```

### Step 2: Test Spaces Connection

Create a test endpoint to verify Spaces is working:

```javascript
// Add to server.js for testing
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
      message: 'Spaces connection successful',
      bucket: process.env.DO_SPACES_NAME,
      region: process.env.DO_SPACES_REGION,
      filesFound: response.Contents?.length || 0,
      files: response.Contents?.map(f => f.Key) || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Spaces connection failed',
      error: error.message
    });
  }
});
```

### Step 3: Apply Code Changes

I'll provide updated versions of all affected files that use Spaces instead of local filesystem.

### Step 4: Migrate Existing Files (if any)

Run a migration script to move any existing local files to Spaces:

```javascript
// migration-script.js
const { PrismaClient } = require('@prisma/client');
const { getS3 } = require('./config/spaces');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const s3 = getS3();

async function migrateFiles() {
  // Find all documents with local file URLs
  const documents = await prisma.document.findMany({
    where: {
      fileUrl: {
        startsWith: '/uploads/'
      }
    }
  });
  
  console.log(`Found ${documents.length} documents to migrate`);
  
  for (const doc of documents) {
    try {
      const localPath = path.join(__dirname, doc.fileUrl);
      
      if (!fs.existsSync(localPath)) {
        console.log(`⚠️ File not found: ${localPath}`);
        continue;
      }
      
      const fileBuffer = fs.readFileSync(localPath);
      const key = doc.fileUrl.replace('/uploads/', '');
      
      // Upload to Spaces
      await s3.send(new PutObjectCommand({
        Bucket: process.env.DO_SPACES_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: doc.mimeType || 'application/octet-stream',
        ACL: 'private'
      }));
      
      // Update database
      await prisma.document.update({
        where: { id: doc.id },
        data: { fileUrl: `spaces://${key}` }
      });
      
      console.log(`✅ Migrated: ${doc.fileName}`);
    } catch (error) {
      console.error(`❌ Failed to migrate ${doc.fileName}:`, error.message);
    }
  }
  
  // Repeat for CompanyAsset
  const assets = await prisma.companyAsset.findMany({
    where: {
      fileUrl: {
        startsWith: '/uploads/'
      }
    }
  });
  
  console.log(`Found ${assets.length} company assets to migrate`);
  
  for (const asset of assets) {
    try {
      const localPath = path.join(__dirname, asset.fileUrl);
      
      if (!fs.existsSync(localPath)) {
        console.log(`⚠️ File not found: ${localPath}`);
        continue;
      }
      
      const fileBuffer = fs.readFileSync(localPath);
      const key = asset.fileUrl.replace('/uploads/', '');
      
      await s3.send(new PutObjectCommand({
        Bucket: process.env.DO_SPACES_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: asset.mimeType || 'application/octet-stream',
        ACL: 'private'
      }));
      
      await prisma.companyAsset.update({
        where: { id: asset.id },
        data: { fileUrl: `spaces://${key}` }
      });
      
      console.log(`✅ Migrated: ${asset.title}`);
    } catch (error) {
      console.error(`❌ Failed to migrate ${asset.title}:`, error.message);
    }
  }
  
  console.log('Migration complete!');
}

migrateFiles()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### Step 5: Update Frontend (if needed)

The frontend should already be using the API endpoints, so no changes should be needed. However, verify that file downloads go through the API and not direct URLs.

## Testing Checklist

After migration:

- [ ] Upload a new company document - verify it goes to Spaces
- [ ] Download the document - verify it streams from Spaces
- [ ] Upload a new project document - verify it goes to Spaces
- [ ] Download the project document - verify it streams from Spaces
- [ ] Redeploy the application - verify files still exist
- [ ] Check Spaces bucket - verify files are there
- [ ] Check database - verify fileUrl uses `spaces://` format
- [ ] Test with multiple file types (PDF, images, documents)
- [ ] Test file deletion - verify it removes from Spaces

## Rollback Plan

If issues occur:

1. Keep the old code in a separate branch
2. Database changes are additive (just changing fileUrl format)
3. Can revert to old code and re-upload files if needed
4. Spaces files remain even if you rollback code

## Cost Considerations

Digital Ocean Spaces pricing (as of 2024):
- **Storage**: $5/month for 250 GB
- **Bandwidth**: $0.01/GB after first 1 TB
- **Requests**: Included

For a typical roofing project app with documents:
- Estimated cost: $5-15/month
- Much cheaper than losing all files on every deployment!

## Next Steps

1. Review the updated code files I'll provide
2. Add Spaces environment variables to Digital Ocean App Platform
3. Test Spaces connection with the test endpoint
4. Deploy the updated code
5. Run the migration script (if you have existing files)
6. Test thoroughly
7. Remove old local filesystem code

## Important Notes

- **DO NOT** remove the static file serving middleware until migration is complete
- **DO NOT** delete local files until you've verified they're in Spaces
- **DO** test in a staging environment first if possible
- **DO** backup your database before running migration
- **DO** verify Spaces credentials are correct before deploying

