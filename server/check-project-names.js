const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProjectNames() {
  try {
    console.log('📋 Checking project names that need updating...');
    
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        projectName: true,
        projectNumber: true,
        projectType: true,
        customer: {
          select: {
            primaryName: true,
            address: true
          }
        }
      },
      orderBy: { projectNumber: 'asc' }
    });
    
    console.log(`\nFound ${projects.length} total projects\n`);
    
    // Identify projects with names that don't match their type
    const projectsNeedingRename = [];
    
    projects.forEach(project => {
      const name = project.projectName.toLowerCase();
      const type = project.projectType;
      let needsUpdate = false;
      let suggestedName = '';
      
      // Check if name matches type
      if (type === 'ROOFING') {
        if (name.includes('plumbing') || name.includes('electrical') || name.includes('hvac') || 
            name.includes('siding') || name.includes('window') || name.includes('kitchen') ||
            name.includes('bathroom') || name.includes('flooring') || name.includes('painting')) {
          needsUpdate = true;
          suggestedName = `Roofing Services - ${project.customer.primaryName.split(' ').pop()}`;
        }
      } else if (type === 'GUTTERS') {
        if (!name.includes('gutter')) {
          needsUpdate = true;
          suggestedName = `Gutter Installation - ${project.customer.primaryName.split(' ').pop()}`;
        }
      } else if (type === 'INTERIOR_PAINT') {
        if (name.includes('plumbing') || name.includes('electrical') || name.includes('hvac') ||
            name.includes('kitchen') || name.includes('bathroom') || name.includes('flooring')) {
          needsUpdate = true;
          // Map specific old types to more relevant names
          if (name.includes('kitchen')) {
            suggestedName = `Kitchen Painting - ${project.customer.primaryName.split(' ').pop()}`;
          } else if (name.includes('bathroom')) {
            suggestedName = `Bathroom Painting - ${project.customer.primaryName.split(' ').pop()}`;
          } else if (name.includes('flooring')) {
            suggestedName = `Interior Paint & Touch-ups - ${project.customer.primaryName.split(' ').pop()}`;
          } else {
            suggestedName = `Interior Painting - ${project.customer.primaryName.split(' ').pop()}`;
          }
        }
      }
      
      if (needsUpdate) {
        projectsNeedingRename.push({
          ...project,
          suggestedName
        });
      }
    });
    
    console.log(`📝 ${projectsNeedingRename.length} projects need name updates:\n`);
    
    projectsNeedingRename.forEach(project => {
      console.log(`${project.projectNumber}: ${project.projectType}`);
      console.log(`   Current: "${project.projectName}"`);
      console.log(`   Suggested: "${project.suggestedName}"`);
      console.log(`   Customer: ${project.customer.primaryName}`);
      console.log('');
    });
    
    return projectsNeedingRename;
    
  } catch (error) {
    console.error('❌ Error checking project names:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkProjectNames();