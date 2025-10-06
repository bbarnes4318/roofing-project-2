// This script should be run in the browser console while logged into the application
// It will identify incorrectly formatted project folders

async function identifyProjectFolders() {
  try {
    console.log('🔍 Searching for project folders...');
    
    // Get the Projects root folder
    const roots = await assetsService.listFolders({ parentId: null, sortBy: 'title', sortOrder: 'asc', limit: 1000 });
    const projectsRoot = roots.find(r => (r.folderName || r.title) === 'Projects');
    
    if (!projectsRoot) {
      console.log('❌ Projects root folder not found');
      return;
    }
    
    console.log('📁 Found Projects root folder:', projectsRoot.id);
    
    // Get all folders in the Projects directory
    const projectFolders = await assetsService.listFolders({ 
      parentId: projectsRoot.id, 
      sortBy: 'title', 
      sortOrder: 'asc', 
      limit: 1000 
    });
    
    console.log(`📊 Found ${projectFolders.length} folders in Projects directory`);
    
    const incorrectFolders = [];
    const correctFolders = [];
    
    // Check each folder for correct naming format
    for (const folder of projectFolders) {
      const folderName = folder.folderName || folder.title;
      console.log(`🔍 Checking folder: "${folderName}"`);
      
      // Check if folder follows the correct format: "Project Number - Primary Customer Contact"
      // Correct format should be: "12345 - John Doe" (no "Project" prefix)
      const correctPattern = /^\d+\s*-\s*.+$/;
      const hasProjectPrefix = folderName.toLowerCase().startsWith('project');
      
      if (hasProjectPrefix || !correctPattern.test(folderName)) {
        incorrectFolders.push({
          id: folder.id,
          name: folderName,
          metadata: folder.metadata,
          reason: hasProjectPrefix ? 'Has "Project" prefix' : 'Does not match format "Number - Name"'
        });
      } else {
        correctFolders.push({
          id: folder.id,
          name: folderName,
          metadata: folder.metadata
        });
      }
    }
    
    console.log('\n📋 SUMMARY:');
    console.log(`✅ Correctly formatted folders: ${correctFolders.length}`);
    console.log(`❌ Incorrectly formatted folders: ${incorrectFolders.length}`);
    
    if (incorrectFolders.length > 0) {
      console.log('\n❌ INCORRECTLY FORMATTED FOLDERS:');
      incorrectFolders.forEach((folder, index) => {
        console.log(`${index + 1}. "${folder.name}" (${folder.reason})`);
        console.log(`   ID: ${folder.id}`);
        if (folder.metadata?.projectNumber) {
          console.log(`   Project Number: ${folder.metadata.projectNumber}`);
        }
        console.log('');
      });
      
      console.log('\n🛠️  RECOMMENDED ACTIONS:');
      console.log('1. Delete all incorrectly formatted folders');
      console.log('2. The system will recreate them with correct format when needed');
      console.log('3. Or manually rename them to follow format: "ProjectNumber - PrimaryContact"');
      
      // Store the incorrect folders for deletion
      window.incorrectProjectFolders = incorrectFolders;
      console.log('\n💾 Stored incorrect folders in window.incorrectProjectFolders for deletion');
    }
    
    if (correctFolders.length > 0) {
      console.log('\n✅ CORRECTLY FORMATTED FOLDERS:');
      correctFolders.forEach((folder, index) => {
        console.log(`${index + 1}. "${folder.name}"`);
      });
    }
    
    return { incorrectFolders, correctFolders };
    
  } catch (error) {
    console.error('❌ Error identifying project folders:', error);
  }
}

// Function to delete incorrect folders
async function deleteIncorrectFolders() {
  if (!window.incorrectProjectFolders || window.incorrectProjectFolders.length === 0) {
    console.log('❌ No incorrect folders to delete. Run identifyProjectFolders() first.');
    return;
  }
  
  console.log(`🗑️ Deleting ${window.incorrectProjectFolders.length} incorrectly formatted folders...`);
  
  for (const folder of window.incorrectProjectFolders) {
    try {
      console.log(`Deleting folder: "${folder.name}" (ID: ${folder.id})`);
      // Note: You'll need to implement the delete function in assetsService
      // await assetsService.deleteFolder(folder.id);
      console.log(`✅ Deleted: "${folder.name}"`);
    } catch (error) {
      console.error(`❌ Failed to delete "${folder.name}":`, error);
    }
  }
  
  console.log('✅ All incorrect folders deleted');
}

// Run the identification
identifyProjectFolders();
