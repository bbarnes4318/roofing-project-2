const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function addActivities() {
  try {
    console.log('📊 Adding activities to production database...');
    
    const officeUser = await prisma.user.findFirst({
      where: { email: 'office@company.com' }
    });
    
    const projects = await prisma.project.findMany({
      take: 15 // Get first 15 projects
    });

    const sampleActivities = [
      { title: 'Initial consultation completed', description: 'Met with customer to discuss project requirements and timeline', type: 'MEETING' },
      { title: 'Insurance claim submitted', description: 'Submitted comprehensive claim documentation to insurance provider', type: 'INSURANCE' },
      { title: 'Materials ordered', description: 'All required roofing materials ordered and delivery scheduled', type: 'MATERIAL' },
      { title: 'Crew assigned', description: 'Installation crew assigned and start date confirmed', type: 'SCHEDULING' },
      { title: 'Quality inspection passed', description: 'Pre-installation inspection completed successfully', type: 'INSPECTION' },
      { title: 'Customer walkthrough', description: 'Conducted detailed walkthrough with customer', type: 'COMMUNICATION' },
      { title: 'Timeline updated', description: 'Project timeline adjusted based on weather forecast', type: 'UPDATE' },
      { title: 'Permit approved', description: 'Building permit approved by city office', type: 'PERMIT' },
      { title: 'Site preparation complete', description: 'Site prepared and ready for installation', type: 'PREPARATION' },
      { title: 'Installation started', description: 'Roofing installation commenced on schedule', type: 'INSTALLATION' },
      { title: 'Progress update', description: '50% of installation completed, on track for timeline', type: 'UPDATE' },
      { title: 'Weather delay', description: 'Installation paused due to weather conditions', type: 'DELAY' },
      { title: 'Inspection scheduled', description: 'Final inspection scheduled with city inspector', type: 'INSPECTION' },
      { title: 'Customer approval', description: 'Customer approved completed work quality', type: 'APPROVAL' },
      { title: 'Project completed', description: 'All work completed and site cleaned up', type: 'COMPLETION' }
    ];

    let activityCount = 0;
    
    for (let i = 0; i < projects.length && i < sampleActivities.length; i++) {
      const project = projects[i];
      const activityData = sampleActivities[i];
      
      await prisma.activity.create({
        data: {
          title: activityData.title,
          description: activityData.description,
          type: activityData.type,
          status: 'COMPLETED',
          priority: 'MEDIUM',
          projectId: project.id,
          assignedToId: officeUser.id,
          createdByUserId: officeUser.id,
          dueDate: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000) // Random date within next week
        }
      });
      
      activityCount++;
      console.log(`✅ Added activity for project #${project.projectNumber}: ${activityData.title}`);
    }

    console.log(`🎉 Successfully added ${activityCount} activities to production database!`);
    
    // Final count
    const totalActivities = await prisma.activity.count();
    console.log(`📊 Total activities in database: ${totalActivities}`);
    
  } catch (error) {
    console.error('❌ Error adding activities:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addActivities();