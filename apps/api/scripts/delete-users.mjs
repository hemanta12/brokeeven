import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Usage:
//   node scripts/delete-users.mjs empty-guests [staleDays]   dry-run report
//   node scripts/delete-users.mjs empty-guests [staleDays] --apply   actually delete
//   node scripts/delete-users.mjs --ids=<id1>,<id2> --apply   delete specific accounts (e.g. user-requested deletion)

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const idsArg = args.find((a) => a.startsWith('--ids='));

let where;
if (idsArg) {
  where = { id: { in: idsArg.slice('--ids='.length).split(',') } };
} else {
  const staleDays = Number(args[1] ?? 30);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - staleDays);
  // createdByUserId has no FK, so a deleted owner would dangle and lock edit/delete gates.
  const owned = (rows) => rows.map((r) => r.createdByUserId).filter(Boolean);
  const ownerIds = [
    ...owned(await prisma.group.findMany({ select: { createdByUserId: true } })),
    ...owned(await prisma.expense.findMany({ select: { createdByUserId: true } })),
    ...owned(await prisma.settlement.findMany({ select: { createdByUserId: true } })),
  ];
  where = { googleSub: null, lastSeenAt: { lt: cutoff }, people: { none: {} }, id: { notIn: ownerIds } };
}

const candidates = await prisma.user.findMany({ where, select: { id: true, createdAt: true, lastSeenAt: true } });
console.log(`${candidates.length} user(s) match:`);
for (const u of candidates) console.log(u.id, 'lastSeen:', u.lastSeenAt.toISOString().slice(0, 10));

if (apply) {
  const ids = candidates.map((u) => u.id);
  const own = { where: { createdByUserId: { in: ids } }, data: { createdByUserId: null } };
  const [, , , { count }] = await prisma.$transaction([
    prisma.group.updateMany(own),
    prisma.expense.updateMany(own),
    prisma.settlement.updateMany(own),
    prisma.user.deleteMany({ where: { id: { in: ids } } }),
  ]);
  console.log(`deleted ${count}`);
} else {
  console.log('dry run only — rerun with --apply to delete');
}

await prisma.$disconnect();
