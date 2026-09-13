import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// "Users" = signed-in accounts + guests who joined a group; bare guest rows are session noise.
const [signedIn, activeGuests, groups] = await Promise.all([
  prisma.user.count({ where: { googleSub: { not: null } } }),
  prisma.user.count({ where: { googleSub: null, people: { some: {} } } }),
  prisma.group.count(),
]);

console.log('users:', signedIn + activeGuests, `(${signedIn} signed in, ${activeGuests} guests in a group)`);
console.log('groups:', groups);
await prisma.$disconnect();
