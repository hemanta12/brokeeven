import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MONTHS = Number(process.argv[2] ?? 6);
const cutoff = new Date();
cutoff.setMonth(cutoff.getMonth() - MONTHS);

const inactiveUsers = await prisma.user.findMany({
  where: { lastSeenAt: { lt: cutoff } },
  select: { id: true, email: true, lastSeenAt: true },
});

const groups = await prisma.group.findMany({
  select: {
    id: true,
    name: true,
    createdAt: true,
    expenses: { select: { updatedAt: true }, orderBy: { updatedAt: 'desc' }, take: 1 },
    settlements: { select: { settledAt: true }, orderBy: { settledAt: 'desc' }, take: 1 },
    activityLogs: { select: { createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
  },
});

const inactiveGroups = groups
  .map((g) => {
    const lastActivity = [
      g.createdAt,
      g.expenses[0]?.updatedAt,
      g.settlements[0]?.settledAt,
      g.activityLogs[0]?.createdAt,
    ]
      .filter(Boolean)
      .sort((a, b) => b - a)[0];
    return { id: g.id, name: g.name, lastActivity };
  })
  .filter((g) => g.lastActivity < cutoff);

console.log(`--- users inactive since ${MONTHS}mo (${cutoff.toISOString().slice(0, 10)}) ---`);
for (const u of inactiveUsers) console.log(u.lastSeenAt.toISOString().slice(0, 10), u.id, u.email ?? '(guest)');

console.log(`\n--- groups inactive since ${MONTHS}mo ---`);
for (const g of inactiveGroups) console.log(g.lastActivity.toISOString().slice(0, 10), g.id, JSON.stringify(g.name));

console.log(`\n${inactiveUsers.length} users, ${inactiveGroups.length} groups. Report only — nothing deleted.`);
await prisma.$disconnect();
