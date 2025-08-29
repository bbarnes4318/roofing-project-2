const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Choose a real-looking name to replace the seed display name
const NEW_FIRST = 'Logan';
const NEW_LAST = 'Price';

async function main() {
  try {
    // Try to find the user explicitly named like a seed variant
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { AND: [{ firstName: 'Seed' }, { lastName: 'User 10' }] },
          { AND: [{ firstName: 'Seed User' }, { lastName: '10' }] },
          { AND: [{ firstName: 'Seed' }, { lastName: 'User10' }] },
          { email: { contains: 'seed', mode: 'insensitive' } },
        ]
      },
      select: { id: true, firstName: true, lastName: true, email: true }
    });

    if (!user) {
      console.log('No matching seed user found. Nothing to change.');
      return;
    }

    console.log(`Found user: ${user.firstName} ${user.lastName} (${user.email}) -> renaming to ${NEW_FIRST} ${NEW_LAST}`);

    // Update the user's name only (keep id/email/roles intact)
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { firstName: NEW_FIRST, lastName: NEW_LAST }
    });

    // Also update historical message authorName text for cleanliness
    const fullName = `${NEW_FIRST} ${NEW_LAST}`;
    const pmRes = await prisma.projectMessage.updateMany({
      where: { authorId: user.id },
      data: { authorName: fullName }
    });

    console.log(`✅ Renamed user ${user.id} to ${fullName}. Updated ${pmRes.count} project messages authorName.`);
  } catch (e) {
    console.error('❌ Rename error:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('✅ Done');
  }
}

main();


