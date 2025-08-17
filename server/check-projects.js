const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProjects() {
  try {
    // Count projects
    const projectCount = await prisma.project.count();
    console.log(`\n📊 Total projects in database: ${projectCount}`);
    
    // Get first 5 projects
    const projects = await prisma.project.findMany({
      take: 5,
      include: {
        customer: true,
        workflowTracker: true
      }
    });
    
    console.log('\n📋 Sample projects:');
    projects.forEach(p => {
      console.log(`  - ${p.projectNumber}: ${p.projectName} (Status: ${p.status})`);
      console.log(`    Customer: ${p.customer?.primaryName || 'No customer'}`);
      console.log(`    Has Workflow Tracker: ${p.workflowTracker ? 'Yes' : 'No'}`);
    });
    
    // Check for common issues
    const projectsWithoutCustomer = await prisma.project.count({
      where: { customerId: null }
    });
    
    const projectsWithoutTracker = await prisma.project.count({
      where: { workflowTrackerId: null }
    });
    
    console.log('\n⚠️ Potential issues:');
    console.log(`  - Projects without customer: ${projectsWithoutCustomer}`);
    console.log(`  - Projects without workflow tracker: ${projectsWithoutTracker}`);
    
  } catch (error) {
    console.error('❌ Error checking projects:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProjects();