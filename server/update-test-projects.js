const { prisma } = require('./config/prisma');

async function updateTestProjects() {
  try {
    console.log('🔧 Updating test projects 99001, 99002, 99003 with realistic data...\n');
    
    // First, find or create a project manager
    let projectManager = await prisma.user.findFirst({
      where: {
        role: 'PROJECT_MANAGER'
      }
    });
    
    if (!projectManager) {
      console.log('Creating project manager user...');
      projectManager = await prisma.user.create({
        data: {
          firstName: 'Mike',
          lastName: 'Rodriguez',
          email: 'mike.rodriguez@coloradoroofing.com',
          password: 'temppassword123',
          role: 'PROJECT_MANAGER',
          isActive: true,
          phone: '(720) 555-0123',
          position: 'Senior Project Manager'
        }
      });
      console.log(`✅ Created project manager: ${projectManager.firstName} ${projectManager.lastName} (${projectManager.email})`);
    } else {
      console.log(`✅ Found existing project manager: ${projectManager.firstName} ${projectManager.lastName} (${projectManager.email})`);
    }
    
    // Define realistic test project data
    const testProjectsData = [
      {
        projectNumber: 99001,
        projectName: 'Residential Roofing Replacement',
        customer: {
          primaryName: 'Jennifer & Mark Thompson',
          primaryEmail: 'jthompson.denver@gmail.com',
          primaryPhone: '(303) 555-7892',
          address: '2847 S Josephine St, Denver, CO 80210'
        }
      },
      {
        projectNumber: 99002,
        projectName: 'Gutter Installation & Repair',
        customer: {
          primaryName: 'Sarah & David Chen',
          primaryEmail: 'sarahchen.co@outlook.com',
          primaryPhone: '(720) 555-4567',
          address: '1523 Pearl St, Boulder, CO 80302'
        }
      },
      {
        projectNumber: 99003,
        projectName: 'Interior Paint & Touch-ups',
        customer: {
          primaryName: 'Robert & Lisa Johnson',
          primaryEmail: 'rjohnson.springs@yahoo.com',
          primaryPhone: '(719) 555-3891',
          address: '945 Manitou Ave, Colorado Springs, CO 80829'
        }
      }
    ];
    
    // Update each test project
    for (const testData of testProjectsData) {
      console.log(`\n🔄 Updating project ${testData.projectNumber}...`);
      
      // Find the project
      const project = await prisma.project.findFirst({
        where: { projectNumber: testData.projectNumber },
        include: { customer: true }
      });
      
      if (!project) {
        console.log(`❌ Project ${testData.projectNumber} not found`);
        continue;
      }
      
      // Update customer data
      await prisma.customer.update({
        where: { id: project.customerId },
        data: {
          primaryName: testData.customer.primaryName,
          primaryEmail: testData.customer.primaryEmail,
          primaryPhone: testData.customer.primaryPhone,
          address: testData.customer.address
        }
      });
      
      // Update project with realistic name and project manager
      await prisma.project.update({
        where: { id: project.id },
        data: {
          projectName: testData.projectName,
          projectManagerId: projectManager.id
        }
      });
      
      console.log(`✅ Updated project ${testData.projectNumber}:`);
      console.log(`   Name: ${testData.projectName}`);
      console.log(`   Customer: ${testData.customer.primaryName}`);
      console.log(`   Email: ${testData.customer.primaryEmail}`);
      console.log(`   Phone: ${testData.customer.primaryPhone}`);
      console.log(`   Address: ${testData.customer.address}`);
      console.log(`   Project Manager: ${projectManager.firstName} ${projectManager.lastName}`);
    }
    
    console.log('\n✅ Successfully updated all test projects with realistic data!');
    
  } catch (error) {
    console.error('❌ Error updating test projects:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTestProjects();