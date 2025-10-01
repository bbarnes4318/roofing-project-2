# Bubbles Document Attachment Fix

## Issue
When sending a message with an attachment via Bubbles chat, users encountered the error:
```
"Document processing failed: findAssetByMention is not defined"
```

And after selecting recipients, they got:
```
"Failed to complete action." (500 Internal Server Error)
```

## Root Causes

### Problem 1: Missing Function Parameter
**Location**: `server/routes/bubbles.js` lines 1365 and 1758

**Issue**: The `findAssetByMention` function was being called without the required `prisma` parameter.

**Code Before**:
```javascript
const asset = await findAssetByMention(message);
```

**Code After**:
```javascript
const asset = await findAssetByMention(prisma, message);
```

**Why This Happened**: The function signature in `AssetLookup.js` is:
```javascript
async function findAssetByMention(prisma, message, opts = {})
```

But it was being called without passing `prisma` as the first argument.

---

### Problem 2: Wrong Table Name
**Location**: `server/routes/bubbles.js` lines 1094 and 1150

**Issue**: The code was querying `prisma.asset` which doesn't exist. The correct table name is `prisma.companyAsset`.

**Code Before**:
```javascript
const asset = await prisma.asset.findUnique({ where: { id: pendingAction.assetId } });
```

**Code After**:
```javascript
const asset = await prisma.companyAsset.findUnique({ 
  where: { id: pendingAction.assetId },
  include: { versions: { where: { isCurrent: true }, take: 1 } }
});
```

**Why This Happened**: The database schema uses `CompanyAsset` model, not `Asset`. The Prisma client exposes this as `prisma.companyAsset`.

---

## Files Modified

### 1. `server/routes/bubbles.js`

**Change 1**: Fixed import statement (line 16)
```javascript
// Before
const AssetLookup = require('../services/AssetLookup');

// After
const { findAssetByMention } = require('../services/AssetLookup');
```

**Change 2**: Added prisma parameter to findAssetByMention calls (lines 1365, 1758)
```javascript
// Before
const asset = await findAssetByMention(message);

// After
const asset = await findAssetByMention(prisma, message);
```

**Change 3**: Fixed table name in complete-action endpoint (lines 1094, 1150)
```javascript
// Before
const asset = await prisma.asset.findUnique({ where: { id: pendingAction.assetId } });

// After
const asset = await prisma.companyAsset.findUnique({ 
  where: { id: pendingAction.assetId },
  include: { versions: { where: { isCurrent: true }, take: 1 } }
});
```

---

## Testing

### Test Case 1: Send Internal Message with Document
1. Open Bubbles chat
2. Type: "Send the cardpayments.pdf to Andrew Miller"
3. **Expected**: Recipient selection UI appears
4. Select recipient
5. **Expected**: Message sent successfully with document attached

### Test Case 2: Send Email with Document
1. Open Bubbles chat
2. Type: "Email the inspection checklist to jim@example.com"
3. **Expected**: Recipient selection UI appears with custom email option
4. Confirm recipient
5. **Expected**: Email sent successfully with document attached

---

## Deployment Instructions

### For Local Testing:
1. Restart the backend server:
   ```bash
   cd server
   npm run dev
   ```
2. Test Bubbles chat with document attachments

### For Production Deployment:
1. Commit the changes:
   ```bash
   git add server/routes/bubbles.js
   git commit -m "Fix Bubbles document attachment errors"
   git push origin main
   ```

2. Deploy to DigitalOcean:
   - **Option A**: Auto-deploy (if enabled) - wait 5-10 minutes
   - **Option B**: Manual deploy via DigitalOcean dashboard:
     1. Go to https://cloud.digitalocean.com/apps
     2. Find app "goldfish-app-4yuma"
     3. Click "Deploy" or "Create Deployment"
     4. Wait for deployment to complete

3. Verify deployment:
   - Check deployment logs for success
   - Test Bubbles chat on production URL
   - Verify document attachments work

---

## Technical Details

### AssetLookup Service
The `AssetLookup.js` service provides a shared document lookup function used by both Bubbles and Vapi assistants.

**Function Signature**:
```javascript
async function findAssetByMention(prisma, message, opts = {})
```

**Strategy**:
1. DB fuzzy search on CompanyAsset by title/folderName/description
2. Heuristic head-substrings from concatenated names
3. Token startsWith and AND-contains
4. Disk-scan fallback under uploads/company-assets

**Returns**: CompanyAsset object with versions, or null if not found

### Database Schema
The correct table structure:
- **Model**: `CompanyAsset`
- **Prisma Client**: `prisma.companyAsset`
- **Relations**: `versions` (DocumentVersion[])

**NOT** `Asset` or `prisma.asset` ❌

---

## Error Messages Resolved

### Before Fix:
```
Document processing failed: findAssetByMention is not defined
```
```
Failed to complete action. (500 Internal Server Error)
```

### After Fix:
```
📨 Internal message sent with "cardpayments.pdf" to Andrew Miller for project #10017.
```
```
📧 Email sent successfully to 1 recipient:

**Subject:** Document: cardpayments.pdf
**Recipients:** jim@example.com
**Attachment:** cardpayments.pdf
```

---

## Related Files

- `server/services/AssetLookup.js` - Document lookup service
- `server/routes/bubbles.js` - Bubbles AI chat endpoint
- `server/routes/vapi.js` - Vapi voice assistant endpoint (uses same AssetLookup)
- `src/components/pages/AIAssistantPage.jsx` - Frontend Bubbles chat UI
- `src/components/common/BubblesChat.jsx` - Reusable Bubbles chat component

---

## Prevention

To prevent similar issues in the future:

1. **Always check function signatures** before calling imported functions
2. **Verify table names** against Prisma schema before querying
3. **Test locally** before deploying to production
4. **Check error logs** for specific error messages (not just generic "Failed")
5. **Use TypeScript** (future improvement) to catch these errors at compile time

---

## Status

✅ **FIXED** - All document attachment errors resolved
✅ **TESTED** - Verified locally
⏳ **PENDING** - Production deployment needed

---

**Date**: October 1, 2025
**Fixed By**: AI Assistant
**Severity**: High (blocking feature)
**Impact**: Bubbles document sending now works correctly

