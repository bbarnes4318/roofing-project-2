const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Project name updates mapping
const PROJECT_NAME_UPDATES = {
  20001: "Roofing Services - Williams",
  20002: "Roofing Services - Anderson", 
  20003: "Kitchen Painting - Martinez",
  20004: "Bathroom Painting - Thompson",
  20005: "Interior Paint & Touch-ups - Davis",
  20007: "Interior Painting - Wilson",
  20008: "Interior Painting - Garcia",
  20009: "Roofing Services - Rodriguez",
  20011: "Roofing Services - Taylor",
  20012: "Roofing Services - Martinez",
  20013: "Kitchen Painting - Clark",
  20014: "Bathroom Painting - White", 
  20015: "Interior Paint & Touch-ups - Harris",
  20017: "Interior Painting - Jackson",
  20018: "Interior Painting - Lewis",
  20019: "Roofing Services - Walker",
  20021: "Roofing Services - Young",
  20022: "Roofing Services - King",
  20023: "Kitchen Painting - Scott",
  20024: "Bathroom Painting - Adams"
};

async function updateProjectNames() {
  console.log('🚀 Starting project name updates...');
  
  try {
    let updateCount = 0;
    
    for (const [projectNumber, newName] of Object.entries(PROJECT_NAME_UPDATES)) {
      const numProjectNumber = parseInt(projectNumber);
      
      // Find the project
      const project = await prisma.project.findFirst({
        where: { projectNumber: numProjectNumber },
        select: { id: true, projectName: true, projectType: true }
      });
      
      if (!project) {
        console.log(`⚠️  Project ${projectNumber} not found`);
        continue;
      }
      
      console.log(`📝 Updating Project ${projectNumber}:`);
      console.log(`   From: "${project.projectName}"`);
      console.log(`   To:   "${newName}"`);
      console.log(`   Type: ${project.projectType}`);
      
      // Update the project name
      await prisma.project.update({
        where: { id: project.id },
        data: { projectName: newName }
      });
      
      updateCount++;
      console.log(`   ✅ Updated successfully\n`);
    }
    
    console.log(`🎉 Successfully updated ${updateCount} project names!`);
    
    // Verify the updates
    console.log('\n📊 Verification - Updated project names:');
    const updatedProjects = await prisma.project.findMany({
      where: {
        projectNumber: {
          in: Object.keys(PROJECT_NAME_UPDATES).map(num => parseInt(num))
        }
      },
      select: {
        projectNumber: true,
        projectName: true,
        projectType: true
      },
      orderBy: { projectNumber: 'asc' }
    });
    
    updatedProjects.forEach(project => {
      console.log(`   ${project.projectNumber}: "${project.projectName}" (${project.projectType})`);
    });
    
  } catch (error) {
    console.error('❌ Error updating project names:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateProjectNames()
  .catch((error) => {
    console.error('Update failed:', error);
    process.exit(1);
  });