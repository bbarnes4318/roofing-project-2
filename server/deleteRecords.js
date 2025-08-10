require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteRecords() {
  try {
    console.log('Starting deletion process...\n');

    // Delete Users by email
    const userEmails = [
      'maria.garcia@kenstruction.com',
      'robert.smith@kenstruction.com',
      'emily.davis@kenstruction.com',
      'james.wilson@kenstruction.com',
      'mike.rodriguez@kenstruction.com',
      'patricia.brown@kenstruction.com',
      'lisa.johnson@kenstruction.com',
      'jennifer.williams@kenstruction.com',
      'charles.jones@kenstruction.com'
    ];

    const deletedUsers = await prisma.user.deleteMany({
      where: {
        email: {
          in: userEmails
        }
      }
    });
    console.log(`Deleted ${deletedUsers.count} users`);

    // Delete Projects by ID
    const projectIds = [
      'cme1imthh0002umt03zk98eh7',
      'cme1injl70004umt0x19eota6',
      'cme1zf55x0003umecgyn0xd5o',
      'cme203m6d0003umbo5ybhkdjw',
      'cme20bl4b0003um70ouajhq6s',
      'cme2267ib0003umjom6h1beh5',
      'cme2hm8h40002umykfa9817qs',
      'cme2jhbvf0003a90da4ap1t43'
    ];

    const deletedProjects = await prisma.project.deleteMany({
      where: {
        id: {
          in: projectIds
        }
      }
    });
    console.log(`Deleted ${deletedProjects.count} projects`);

    // Delete Customers by ID
    const customerIds = [
      'cme1im8sf0000umt0e1825rk3',
      'cme1zf4v70001umecoj38f6pp',
      'cme203lvu0001umbo10h7f40n',
      'cme20bktp0001um70ljqsd4gx',
      'cme22677c0001umjom5tsl66u',
      'cme2hem9r0000um8wst9mkfwr',
      'cme2hf5rd0000umco499xq501',
      'cme2hjk8s0000umds5u9pbnd3',
      'cme2hk8on0001umdssvmvhiuz',
      'cme2hkx1t0000umoortqa1nb6',
      'cme2hlyl70000umykmxq0icdy',
      'cme2jhbrk0000a90douou5avd'
    ];

    const deletedCustomers = await prisma.customer.deleteMany({
      where: {
        id: {
          in: customerIds
        }
      }
    });
    console.log(`Deleted ${deletedCustomers.count} customers`);

    console.log('\nDeletion process completed successfully!');
    
  } catch (error) {
    console.error('Error deleting records:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the deletion
deleteRecords();