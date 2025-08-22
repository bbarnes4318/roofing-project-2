/*
 * Cleanup script to remove fake customers and their projects
 * Deletes customers with names like 'Seed Customer', business names, etc.
 */

const { prisma } = require('../config/prisma');

async function cleanupFakeData() {
  console.log('🔍 Finding customers with fake names...');
  
  // Find customers with fake names
  const fakeCustomers = await prisma.customer.findMany({
    where: {
      OR: [
        { primaryName: { contains: 'Seed Customer' } },
        { primaryName: { contains: 'Mountain View Roofing' } },
        { primaryName: { contains: 'Denver Home Solutions' } },
        { primaryName: { contains: 'Colorado Peak Construction' } },
        { primaryName: { contains: 'Rocky Mountain Renovations' } },
        { primaryName: { contains: 'Summit Valley Builders' } },
        { primaryName: { contains: 'Alpine Home Services' } },
        { primaryName: { contains: 'Centennial Contractors' } },
        { primaryName: { contains: 'Front Range Development' } },
        { primaryName: { contains: 'High Country Homes' } },
        { primaryName: { contains: 'Mile High Construction' } },
        { primaryName: { contains: 'Pikes Peak Builders' } },
        { primaryName: { contains: 'Boulder Valley Contractors' } },
        { primaryName: { contains: 'Fort Collins Home Pros' } },
        { primaryName: { contains: 'Aurora Construction Co' } },
        { primaryName: { contains: 'Lakewood Builders Inc' } },
        { primaryName: { contains: 'Westminster Home Solutions' } },
        { primaryName: { contains: 'Arvada Construction' } },
        { primaryName: { contains: 'Thornton Builders' } },
        { primaryName: { contains: 'Pueblo Home Services' } },
        { primaryName: { contains: 'Greeley Construction Co' } },
        { primaryName: { contains: 'Longmont Builders' } },
        { primaryName: { contains: 'Loveland Home Pros' } },
        { primaryName: { contains: 'Grand Junction Contractors' } },
        { primaryName: { contains: 'Durango Construction' } },
        { primaryName: { contains: 'Steamboat Builders' } },
        { primaryName: { contains: 'Aspen Home Services' } },
        { primaryName: { contains: 'Vail Construction Co' } },
        { primaryName: { contains: 'Breckenridge Builders' } },
        { primaryName: { contains: 'Telluride Home Pros' } },
        { primaryName: { contains: 'Estes Park Contractors' } }
      ]
    },
    include: {
      projects: true
    }
  });

  console.log(`Found ${fakeCustomers.length} customers with fake names`);

  if (fakeCustomers.length === 0) {
    console.log('✅ No fake customers found to clean up');
    return;
  }

  // Show what we found
  fakeCustomers.forEach(customer => {
    console.log(`- ${customer.primaryName} (${customer.projects.length} projects)`);
  });

  // Delete projects first (due to foreign key constraints)
  let deletedProjects = 0;
  for (const customer of fakeCustomers) {
    for (const project of customer.projects) {
      console.log(`Deleting project: ${project.projectName}`);
      
      // Delete related data first
      await prisma.projectWorkflowTracker.deleteMany({
        where: { projectId: project.id }
      });
      
      await prisma.workflowAlert.deleteMany({
        where: { projectId: project.id }
      });
      
      await prisma.projectMessage.deleteMany({
        where: { projectId: project.id }
      });
      
      // Delete the project
      await prisma.project.delete({
        where: { id: project.id }
      });
      
      deletedProjects++;
    }
  }

  // Delete the customers
  let deletedCustomers = 0;
  for (const customer of fakeCustomers) {
    console.log(`Deleting customer: ${customer.primaryName}`);
    await prisma.customer.delete({
      where: { id: customer.id }
    });
    deletedCustomers++;
  }

  console.log(`\n✅ Cleanup complete:`);
  console.log(`- Deleted ${deletedCustomers} fake customers`);
  console.log(`- Deleted ${deletedProjects} associated projects`);
}

cleanupFakeData()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('Error during cleanup:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
