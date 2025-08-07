/**
 * Script to compare both databases and determine which is the correct production database
 */

const { PrismaClient } = require('@prisma/client');

async function checkDatabase(name, databaseUrl) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Checking ${name}`);
  console.log(`URL: ${databaseUrl.substring(0, 80)}...`);
  console.log('='.repeat(60));
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });
  
  try {
    const stats = {
      users: await prisma.user.count(),
      projects: await prisma.project.count(),
      customers: await prisma.customer.count(),
      tasks: await prisma.task.count(),
      workflows: await prisma.projectWorkflow.count(),
      messages: await prisma.message.count(),
      documents: await prisma.document.count(),
      notifications: await prisma.notification.count(),
      roleAssignments: await prisma.roleAssignment.count()
    };
    
    console.log('\n📈 Database Statistics:');
    console.log(`  👥 Users: ${stats.users}`);
    console.log(`  📁 Projects: ${stats.projects}`);
    console.log(`  🏢 Customers: ${stats.customers}`);
    console.log(`  ✅ Tasks: ${stats.tasks}`);
    console.log(`  🔄 Workflows: ${stats.workflows}`);
    console.log(`  💬 Messages: ${stats.messages}`);
    console.log(`  📄 Documents: ${stats.documents}`);
    console.log(`  🔔 Notifications: ${stats.notifications}`);
    console.log(`  👤 Role Assignments: ${stats.roleAssignments}`);
    
    // Check for recent activity
    const recentProject = await prisma.project.findFirst({
      orderBy: { createdAt: 'desc' },
      select: {
        projectName: true,
        createdAt: true,
        projectNumber: true
      }
    });
    
    if (recentProject) {
      console.log(`\n📅 Most Recent Project:`);
      console.log(`  Name: ${recentProject.projectName}`);
      console.log(`  Number: ${recentProject.projectNumber}`);
      console.log(`  Created: ${recentProject.createdAt}`);
    }
    
    // Check for recent user activity
    const recentUser = await prisma.user.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: {
        firstName: true,
        lastName: true,
        updatedAt: true
      }
    });
    
    if (recentUser) {
      console.log(`\n👤 Most Recently Updated User:`);
      console.log(`  Name: ${recentUser.firstName} ${recentUser.lastName}`);
      console.log(`  Updated: ${recentUser.updatedAt}`);
    }
    
    // Score the database to determine if it's likely production
    let score = 0;
    let reasons = [];
    
    if (stats.projects > 5) {
      score += 3;
      reasons.push('Has multiple projects');
    }
    if (stats.customers > 5) {
      score += 3;
      reasons.push('Has multiple customers');
    }
    if (stats.workflows > 0) {
      score += 2;
      reasons.push('Has workflow data');
    }
    if (stats.messages > 0) {
      score += 1;
      reasons.push('Has messages');
    }
    if (stats.tasks > 0) {
      score += 1;
      reasons.push('Has tasks');
    }
    if (stats.users >= 10) {
      score += 2;
      reasons.push('Has sufficient users');
    }
    
    console.log(`\n🎯 Production Likelihood Score: ${score}/12`);
    if (reasons.length > 0) {
      console.log('  Reasons:');
      reasons.forEach(r => console.log(`    ✓ ${r}`));
    }
    
    return { name, stats, score };
    
  } catch (error) {
    console.error(`\n❌ Error checking database: ${error.message}`);
    return { name, error: error.message, score: -1 };
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log('🔍 Comparing Databases to Identify Correct Production Database');
  console.log('='.repeat(60));
  
  // Database URLs should be provided via environment variables
  const db1 = process.env.DATABASE_URL_1 || "postgresql://user:pass@host:port/db1";
  const db2 = process.env.DATABASE_URL_2 || "postgresql://user:pass@host:port/db2";
  
  const results = [];
  
  results.push(await checkDatabase('DATABASE 1 (Root .env - construction-do)', db1));
  results.push(await checkDatabase('DATABASE 2 (Server .env - kenstruction-claude)', db2));
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL ANALYSIS');
  console.log('='.repeat(60));
  
  const validResults = results.filter(r => r.score >= 0);
  if (validResults.length === 0) {
    console.log('❌ Could not connect to any database');
    return;
  }
  
  validResults.sort((a, b) => b.score - a.score);
  const recommended = validResults[0];
  
  console.log(`\n🏆 RECOMMENDED PRODUCTION DATABASE: ${recommended.name}`);
  console.log(`   Score: ${recommended.score}/12`);
  
  if (recommended.score < 5) {
    console.log('\n⚠️  WARNING: Neither database appears to have significant production data.');
    console.log('   You may need to restore from a backup or migrate data.');
  }
  
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('1. The database with the higher score likely contains your production data');
  console.log('2. Check the creation dates and recent activity to confirm');
  console.log('3. Update your .env files to use the correct DATABASE_URL');
  console.log('4. Consider backing up both databases before making changes');
  
  // Check current environment
  console.log('\n📍 CURRENT ENVIRONMENT CONFIGURATION:');
  console.log(`   Root .env uses: DATABASE 1 (construction-do)`);
  console.log(`   Server .env uses: DATABASE 2 (kenstruction-claude)`);
  console.log('\n   Production deployment likely uses the ROOT .env file');
}

main().catch(console.error);