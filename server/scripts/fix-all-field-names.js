const fs = require('fs');
const path = require('path');

// List of all files that need field name fixes
const filesToFix = [
  'server/routes/auth.js',
  'server/routes/alerts.js', 
  'server/routes/activities.js',
  'server/routes/ai.js',
  'server/routes/bubbles.js',
  'server/routes/calendar.js',
  'server/routes/completeExcelDataManager.js',
  'server/routes/debug.js',
  'server/routes/documents.js',
  'server/routes/excelDataManager.js',
  'server/routes/messages.js',
  'server/routes/notifications.js',
  'server/routes/onboarding.js',
  'server/routes/phaseOverride.js',
  'server/routes/projectImport.js',
  'server/routes/projectMessages.js',
  'server/routes/roles.js',
  'server/routes/search.js',
  'server/routes/tasks.js',
  'server/routes/transcripts.js',
  'server/routes/voiceTranscripts.js',
  'server/routes/workflow.js',
  'server/routes/workflow-data.js',
  'server/routes/workflowImport.js',
  'server/services/AlertCacheService.js',
  'server/services/AlertGenerationService.js',
  'server/services/BiometricAuthService.js',
  'server/services/BubblesInsightsService.js',
  'server/services/DeviceAuthService.js',
  'server/services/DevUserStore.js',
  'server/services/ProjectInitializationService.js',
  'server/services/ProjectMessageService.js',
  'server/services/OptimizedWorkflowService.js',
  'server/services/ProjectStatusService.js',
  'server/services/WorkflowActionService.js',
  'server/services/WorkflowAlertService.js',
  'server/services/WorkflowCompletionHandler.js',
  'server/services/WorkflowCompletionService.js',
  'server/services/WorkflowProgressionService.js',
  'server/services/customerService.js',
  'server/services/projectService.js',
  'server/services/workflowUpdateService.js'
];

// Field mappings
const fieldMappings = {
  'accessLevel': 'access_level',
  'createdAt': 'created_at',
  'downloadCount': 'download_count',
  'fileSize': 'file_size',
  'fileUrl': 'file_url',
  'folderName': 'folder_name',
  'isActive': 'is_active',
  'isFavorite': 'is_favorite',
  'isPublic': 'is_public',
  'lastDownloadedAt': 'last_downloaded_at',
  'lastAccessedAt': 'last_accessed_at',
  'lastLogin': 'last_login',
  'mimeType': 'mime_type',
  'parentId': 'parent_id',
  'sortOrder': 'sort_order',
  'updatedAt': 'updated_at',
  'uploadedById': 'uploaded_by_id',
  'viewCount': 'view_count'
};

console.log('🔧 Fixing field names in all files...');

let totalFilesFixed = 0;
let totalReplacements = 0;

filesToFix.forEach(filePath => {
  try {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      let fileReplacements = 0;
      
      // Apply all field mappings
      Object.entries(fieldMappings).forEach(([oldField, newField]) => {
        const regex = new RegExp(`\\b${oldField}\\b`, 'g');
        const matches = content.match(regex);
        if (matches) {
          content = content.replace(regex, newField);
          fileReplacements += matches.length;
        }
      });
      
      if (fileReplacements > 0) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Fixed ${fileReplacements} fields in ${filePath}`);
        totalFilesFixed++;
        totalReplacements += fileReplacements;
      }
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
});

console.log(`🎉 Fixed ${totalReplacements} field names across ${totalFilesFixed} files!`);
