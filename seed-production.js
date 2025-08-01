const { PrismaClient } = require('@prisma/client');

// Use production DATABASE_URL - you'll need to set this
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL // Make sure this points to your Digital Ocean PostgreSQL
    }
  }
});

async function seedProduction() {
  try {
    console.log('🌱 Starting production database seed...');
    
    // Check if data already exists
    const userCount = await prisma.user.count();
    const projectCount = await prisma.project.count();
    
    console.log('Current data: Users:', userCount, 'Projects:', projectCount);
    
    if (userCount > 0 || projectCount > 0) {
      console.log('⚠️ Database already has data. Do you want to continue? (This will add more data)');
      // In production, we'll continue anyway
    }

    // Create users first
    const officeUser = await prisma.user.upsert({
      where: { email: 'office@company.com' },
      update: {},
      create: {
        firstName: 'Office',
        lastName: 'User',
        email: 'office@company.com',
        phone: '303-555-0100',
        role: 'ADMIN',
        password: '$2a$10$example.hashed.password.here' // This is a bcrypt hash of 'password123'
      }
    });

    const projectManager = await prisma.user.upsert({
      where: { email: 'pm@company.com' },
      update: {},
      create: {
        firstName: 'Mike',
        lastName: 'Johnson', 
        email: 'pm@company.com',
        phone: '303-555-0001',
        role: 'PROJECT_MANAGER',
        password: '$2a$10$example.hashed.password.here'
      }
    });

    console.log('✅ Created users');

    // Project data with specific phases
    const projectData = [
      // LEAD projects
      { name: 'John Smith', address: '1234 Oak St, Denver, CO 80202', targetPhase: 'LEAD' },
      { name: 'Jane Doe', address: '5678 Pine Ave, Boulder, CO 80301', targetPhase: 'LEAD' },
      
      // PROSPECT projects
      { name: 'Bob Johnson', address: '9012 Elm Dr, Aurora, CO 80012', targetPhase: 'PROSPECT' },
      { name: 'Mary Wilson', address: '3456 Maple Ln, Lakewood, CO 80226', targetPhase: 'PROSPECT' },
      { name: 'Tom Brown', address: '7890 Cedar Blvd, Westminster, CO 80031', targetPhase: 'PROSPECT' },
      
      // APPROVED projects
      { name: 'Sarah Taylor', address: '1357 Aspen Ct, Broomfield, CO 80020', targetPhase: 'APPROVED' },
      { name: 'David Anderson', address: '2468 Willow Dr, Commerce City, CO 80022', targetPhase: 'APPROVED' },
      { name: 'Amy Martinez', address: '9753 Poplar Ave, Englewood, CO 80110', targetPhase: 'APPROVED' },
      
      // EXECUTION projects  
      { name: 'Kevin Rodriguez', address: '4826 Walnut Blvd, Littleton, CO 80120', targetPhase: 'EXECUTION' },
      { name: 'Michelle Lewis', address: '3915 Chestnut Dr, Parker, CO 80134', targetPhase: 'EXECUTION' },
      { name: 'Jason Walker', address: '6248 Magnolia Way, Castle Rock, CO 80109', targetPhase: 'EXECUTION' },
      
      // COMPLETION projects
      { name: 'Stephanie Wright', address: '4583 Juniper Ln, Denver, CO 80220', targetPhase: 'COMPLETION' }
    ];

    console.log('🏗️ Creating projects and customers...');

    for (let i = 0; i < projectData.length; i++) {
      const data = projectData[i];
      const projectNumber = 20000 + i + 1;

      // Create customer
      const customer = await prisma.customer.create({
        data: {
          primaryName: data.name,
          primaryEmail: `${data.name.toLowerCase().replace(/\s+/g, '.')}@email.com`,
          primaryPhone: `303-555-${String(i + 1).padStart(4, '0')}`,
          address: data.address,
          primaryContact: 'PRIMARY'
        }
      });

      // Create project
      const project = await prisma.project.create({
        data: {
          projectNumber: projectNumber,
          projectName: data.address,
          projectType: 'ROOF_REPLACEMENT',
          status: 'IN_PROGRESS',
          priority: 'MEDIUM',
          description: `Roof replacement project for ${data.name}`,
          progress: Math.floor(Math.random() * 80) + 10, // Random progress 10-90%
          budget: 25000,
          estimatedCost: 25000,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          customerId: customer.id,
          projectManagerId: projectManager.id,
          pmPhone: projectManager.phone,
          pmEmail: projectManager.email
        }
      });

      // Create basic workflow
      await prisma.projectWorkflow.create({
        data: {
          projectId: project.id,
          currentPhase: data.targetPhase,
          currentSection: data.targetPhase === 'LEAD' ? 'Initial Contact' : 
                          data.targetPhase === 'PROSPECT' ? 'Assessment' :
                          data.targetPhase === 'APPROVED' ? 'Contract' :
                          data.targetPhase === 'EXECUTION' ? 'Installation' : 'Final Review',
          phaseProgress: Math.floor(Math.random() * 100),
          isCompleted: data.targetPhase === 'COMPLETION'
        }
      });

      console.log(`✅ Created project ${projectNumber} - ${data.name}`);
    }

    // Create some sample messages/activities
    const sampleMessages = [
      'Initial consultation completed',
      'Insurance claim submitted',
      'Materials ordered and scheduled for delivery',
      'Installation crew assigned to project',
      'Quality inspection passed',
      'Customer walkthrough scheduled'
    ];

    for (let i = 0; i < 6; i++) {
      const randomProject = await prisma.project.findFirst({
        skip: Math.floor(Math.random() * projectData.length)
      });

      if (randomProject) {
        await prisma.message.create({
          data: {
            content: sampleMessages[i],
            type: 'PROJECT',
            projectId: randomProject.id,
            senderId: officeUser.id,
            senderName: `${officeUser.firstName} ${officeUser.lastName}`,
            priority: 'MEDIUM'
          }
        });
      }
    }

    console.log('✅ Created sample messages');

    const finalCounts = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.customer.count(),
      prisma.projectWorkflow.count(),
      prisma.message.count()
    ]);

    console.log('🎉 Production seed completed!');
    console.log('Final counts:');
    console.log('- Users:', finalCounts[0]);
    console.log('- Projects:', finalCounts[1]); 
    console.log('- Customers:', finalCounts[2]);
    console.log('- Workflows:', finalCounts[3]);
    console.log('- Messages:', finalCounts[4]);

  } catch (error) {
    console.error('❌ Error seeding production database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedProduction();