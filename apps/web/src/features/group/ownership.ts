// Who may edit an expense or settlement. A null owner (predates ownership, or a
// cookie that never stuck) stays editable by anyone. Mirrors canMutate() in
// apps/api/src/auth/ownership.ts — the server enforces; this only gates the affordance.
export function canEdit(createdByUserId: string | null, viewerUserId: string | null): boolean {
  return createdByUserId === null || (viewerUserId !== null && createdByUserId === viewerUserId);
}

// Which person the viewer is in this group. The server's claim wins over the
// browser's local hint — it followed the account from another device.
export function resolveIdentityPersonId(
  people: { id: string; userId: string | null }[],
  viewerUserId: string | null,
  localPersonId: string | null
): string | null {
  const claimed = viewerUserId ? people.find((person) => person.userId === viewerUserId) : undefined;
  return claimed?.id ?? localPersonId;
}

// What one expense did to the viewer's balance (paid minus their share): null
// until a person is claimed, positive = owed, negative = owe. Derived per
// expense, not from `balances`, which nets across every expense and settlement
// for a pair.
export function viewerNetOnExpense(
  expense: { payerId: string; amount: string; splits: { personId: string; amount: string }[] },
  viewerPersonId: string | null
): number | null {
  if (!viewerPersonId) return null;
  const paid = expense.payerId === viewerPersonId ? Number(expense.amount) : 0;
  const share = expense.splits
    .filter((split) => split.personId === viewerPersonId)
    .reduce((total, split) => total + Number(split.amount), 0);
  return paid - share;
}
