const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function check5YearFields() {
  try {
    const templates = await prisma.documentTemplate.findMany({
      where: { 
        name: { contains: '5-Year' } 
      },
      include: { fields: true }
    });

    console.log('5-Year Warranty Templates:');
    templates.forEach(t => {
      console.log(`\nTemplate: ${t.name}`);
      console.log('Fields:');
      t.fields.forEach(f => {
        console.log(`  ${f.key} (${f.label}) - ${f.type}`);
      });
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check5YearFields();
