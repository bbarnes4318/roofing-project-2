const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRolesAPI() {
  try {
    console.log('=== TESTING ROLES API ENDPOINTS ===\n');
    
    // Test 1: Get all users (what the frontend calls)
    console.log('1. Testing GET /api/roles/users');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true
      },
      where: {
        isActive: true
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });

    const roleDisplayNames = {
      'ADMIN': 'Administrator',
      'MANAGER': 'Manager', 
      'PROJECT_MANAGER': 'Project Manager',
      'FOREMAN': 'Field Supervisor',
      'WORKER': 'Office Staff',
      'CLIENT': 'Client'
    };
    
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      role: roleDisplayNames[user.role] || user.role || 'User'
    }));

    console.log(`Found ${formattedUsers.length} formatted users:`);
    formattedUsers.forEach((u, i) => console.log(`  ${i+1}. ${u.name} (${u.email}) - ${u.role}`));

    // Test 2: Get current role assignments (what the frontend loads)
    console.log('\n2. Testing GET /api/roles');
    const roleAssignments = await prisma.roleAssignment.findMany({
      include: {
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
    });

    const formattedRoles = {
      productManager: null,
      fieldDirector: null,
      officeStaff: null,
      administration: null
    };

    roleAssignments.forEach(assignment => {
      let roleKey;
      switch (assignment.roleType) {
        case 'PRODUCT_MANAGER':
          roleKey = 'productManager';
          break;
        case 'FIELD_DIRECTOR':
          roleKey = 'fieldDirector';
          break;
        case 'OFFICE_STAFF':
          roleKey = 'officeStaff';
          break;
        case 'ADMINISTRATION':
          roleKey = 'administration';
          break;
        default:
          roleKey = assignment.roleType.toLowerCase().replace('_', '');
      }
      
      if (formattedRoles.hasOwnProperty(roleKey)) {
        formattedRoles[roleKey] = {
          userId: assignment.userId,
          user: assignment.user
        };
      }
    });

    console.log('Current role assignments:');
    Object.entries(formattedRoles).forEach(([key, value]) => {
      if (value) {
        console.log(`  ${key}: ${value.user.firstName} ${value.user.lastName} (${value.userId})`);
      } else {
        console.log(`  ${key}: null`);
      }
    });

    // Test 3: Simulate a role assignment
    console.log('\n3. Testing role assignment simulation');
    const testUserId = users.find(u => u.firstName === 'David')?.id;
    console.log(`Attempting to assign David Chen (${testUserId}) to productManager role`);
    
    if (testUserId) {
      // This is what happens when user selects from dropdown
      console.log('Frontend would set state optimistically:');
      console.log(`  roleAssignments.productManager = "${testUserId}"`);
    }

  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testRolesAPI();