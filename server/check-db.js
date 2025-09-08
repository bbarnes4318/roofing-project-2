require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function checkDatabase() {
  console.log('DATABASE_URL:', process.env.DATABASE_URL);
  
  const prisma = new PrismaClient();
  
  try {
    const projects = await prisma.project.findMany();
    console.log('Projects found:', projects.length);
    
    if (projects.length > 0) {
      console.log('First project:', projects[0].projectName || 'Unnamed');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
