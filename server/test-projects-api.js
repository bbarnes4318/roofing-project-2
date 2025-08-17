const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testProjectsApi() {
  console.log('Testing Projects API...\n');
  
  try {
    // 1. Simple query - just get basic project data
    console.log('1. Testing simple project query...');
    const simpleProjects = await prisma.project.findMany({
      take: 3,
      select: {
        id: true,
        projectNumber: true,
        projectName: true,
        status: true
      }
    });
    console.log('✅ Simple query successful:', simpleProjects);
    
    // 2. Query with customer
    console.log('\n2. Testing query with customer...');
    const projectsWithCustomer = await prisma.project.findMany({
      take: 1,
      include: {
        customer: {
          select: {
            id: true,
            primaryName: true
          }
        }
      }
    });
    console.log('✅ Query with customer successful:', projectsWithCustomer[0]?.customer?.primaryName);
    
    // 3. Query with workflow tracker (this might be the issue)
    console.log('\n3. Testing query with workflow tracker...');
    try {
      const projectsWithTracker = await prisma.project.findMany({
        take: 1,
        include: {
          workflowTracker: {
            include: {
              currentPhase: true,
              currentSection: true,
              currentLineItem: true
            }
          }
        }
      });
      console.log('✅ Query with workflow tracker successful');
      console.log('  Current phase:', projectsWithTracker[0]?.workflowTracker?.currentPhase?.phaseName);
    } catch (trackerError) {
      console.log('❌ Workflow tracker query failed:', trackerError.message);
    }
    
    // 4. Full query like the API endpoint
    console.log('\n4. Testing full API query...');
    try {
      const fullProjects = await prisma.project.findMany({
        take: 1,
        include: {
          customer: {
            select: {
              id: true,
              primaryName: true,
              primaryEmail: true,
              primaryPhone: true,
              secondaryName: true,
              secondaryEmail: true,
              secondaryPhone: true,
              address: true
            }
          },
          projectManager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              role: true
            }
          },
          teamMembers: {
            select: {
              id: true,
              role: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  role: true
                }
              }
            }
          },
          workflowTracker: {
            include: {
              currentPhase: {
                select: {
                  id: true,
                  phaseType: true,
                  phaseName: true
                }
              },
              currentSection: {
                select: {
                  id: true,
                  displayName: true,
                  phase: {
                    select: {
                      phaseType: true,
                      phaseName: true
                    }
                  }
                }
              },
              currentLineItem: {
                select: {
                  id: true,
                  itemName: true,
                  section: {
                    select: {
                      displayName: true,
                      phase: {
                        select: {
                          phaseType: true,
                          phaseName: true
                        }
                      }
                    }
                  }
                }
              },
              completedItems: {
                select: {
                  id: true,
                  lineItemId: true,
                  phaseId: true,
                  sectionId: true,
                  completedAt: true,
                  completedById: true
                }
              }
            }
          }
        }
      });
      console.log('✅ Full API query successful');
      console.log('  Project:', fullProjects[0]?.projectName);
      console.log('  Customer:', fullProjects[0]?.customer?.primaryName);
      console.log('  Tracker:', fullProjects[0]?.workflowTracker ? 'Present' : 'Missing');
    } catch (fullError) {
      console.log('❌ Full API query failed:', fullError.message);
      console.log('Error details:', fullError);
    }
    
  } catch (error) {
    console.error('❌ Main error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testProjectsApi();