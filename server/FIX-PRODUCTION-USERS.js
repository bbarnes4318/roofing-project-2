#!/usr/bin/env node
/**
 * EMERGENCY FIX SCRIPT FOR PRODUCTION DATABASE
 * Run this on your Digital Ocean server to fix the users issue
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixProductionUsers() {
  console.log('🚨 EMERGENCY FIX: Fixing production users database');
  console.log('========================================');
  
  try {
    // Step 1: Check current users
    const currentUsers = await prisma.user.findMany();
    console.log(`\n📊 Current users in database: ${currentUsers.length}`);
    
    if (currentUsers.length === 0) {
      console.log('❌ No users found! Creating essential users...');
      
      // Create the 12 essential users
      const usersToCreate = [
        { firstName: 'Sarah', lastName: 'Owner', email: 'sarah.owner@kenstruction.com', role: 'ADMIN' },
        { firstName: 'Mike', lastName: 'Rodriguez', email: 'mike.rodriguez@kenstruction.com', role: 'PROJECT_MANAGER' },
        { firstName: 'Jennifer', lastName: 'Williams', email: 'jennifer.williams@kenstruction.com', role: 'FOREMAN' },
        { firstName: 'David', lastName: 'Chen', email: 'david.chen@kenstruction.com', role: 'MANAGER' },
        { firstName: 'Lisa', lastName: 'Johnson', email: 'lisa.johnson@kenstruction.com', role: 'ADMIN' },
        { firstName: 'Tom', lastName: 'Anderson', email: 'tom.anderson@kenstruction.com', role: 'FOREMAN' },
        { firstName: 'Maria', lastName: 'Garcia', email: 'maria.garcia@kenstruction.com', role: 'WORKER' },
        { firstName: 'Robert', lastName: 'Smith', email: 'robert.smith@kenstruction.com', role: 'PROJECT_MANAGER' },
        { firstName: 'Emily', lastName: 'Davis', email: 'emily.davis@kenstruction.com', role: 'MANAGER' },
        { firstName: 'James', lastName: 'Wilson', email: 'james.wilson@kenstruction.com', role: 'FOREMAN' },
        { firstName: 'Patricia', lastName: 'Brown', email: 'patricia.brown@kenstruction.com', role: 'WORKER' },
        { firstName: 'Charles', lastName: 'Jones', email: 'charles.jones@kenstruction.com', role: 'PROJECT_MANAGER' }
      ];
      
      for (const userData of usersToCreate) {
        try {
          const user = await prisma.user.create({
            data: {
              ...userData,
              password: '$2a$10$defaultHashedPassword', // You should use a real hashed password
              isActive: true,
              isVerified: true
            }
          });
          console.log(`✅ Created user: ${user.firstName} ${user.lastName}`);
        } catch (error) {
          if (error.code === 'P2002') {
            console.log(`⚠️ User ${userData.email} already exists, skipping...`);
          } else {
            console.error(`❌ Error creating user ${userData.email}:`, error.message);
          }
        }
      }
    }
    
    // Step 2: Activate ALL users
    console.log('\n🔄 Activating all users...');
    const updateResult = await prisma.user.updateMany({
      where: {
        OR: [
          { isActive: false },
          { isActive: null }
        ]
      },
      data: {
        isActive: true
      }
    });
    
    console.log(`✅ Activated ${updateResult.count} users`);
    
    // Step 3: Verify all users are active
    const activeUsers = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true
      }
    });
    
    console.log(`\n✅ Total active users now: ${activeUsers.length}`);
    console.log('\n=== ALL ACTIVE USERS ===');
    activeUsers.forEach((u, i) => {
      console.log(`${i+1}. ${u.firstName} ${u.lastName} (${u.email}) - ${u.role}`);
    });
    
    // Step 4: Check role assignments
    console.log('\n🔍 Checking role assignments...');
    const roleAssignments = await prisma.roleAssignment.findMany({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });
    
    if (roleAssignments.length === 0) {
      console.log('⚠️ No role assignments found. Creating defaults...');
      
      // Create default role assignments
      const defaultAssignments = [
        { roleType: 'PRODUCT_MANAGER', firstName: 'Mike' },
        { roleType: 'FIELD_DIRECTOR', firstName: 'Tom' },
        { roleType: 'OFFICE_STAFF', firstName: 'Maria' },
        { roleType: 'ADMINISTRATION', firstName: 'Lisa' }
      ];
      
      for (const assignment of defaultAssignments) {
        const user = activeUsers.find(u => u.firstName === assignment.firstName);
        if (user) {
          await prisma.roleAssignment.create({
            data: {
              roleType: assignment.roleType,
              userId: user.id,
              assignedAt: new Date(),
              assignedById: activeUsers[0].id // Use first user as assigner
            }
          });
          console.log(`✅ Assigned ${user.firstName} ${user.lastName} to ${assignment.roleType}`);
        }
      }
    } else {
      console.log('✅ Role assignments exist:');
      roleAssignments.forEach(ra => {
        console.log(`   - ${ra.roleType}: ${ra.user.firstName} ${ra.user.lastName}`);
      });
    }
    
    console.log('\n🎉 SUCCESS! Database fixed!');
    console.log('========================================');
    console.log('NEXT STEPS:');
    console.log('1. Restart your backend server');
    console.log('2. Clear browser cache (Ctrl+F5)');
    console.log('3. Test the role assignment dropdown');
    
  } catch (error) {
    console.error('❌ CRITICAL ERROR:', error);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixProductionUsers();