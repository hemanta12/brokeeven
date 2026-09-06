// Who may edit an expense or settlement. A null owner means the row predates
// ownership, or was created by a browser whose session cookie never stuck --
// either way nobody can prove it is theirs, so it stays open rather than
// stranded. Mirrors canMutate() in apps/api/src/auth/ownership.ts; the server
// is the enforcer, this only decides whether to render the affordance.
export function canEdit(createdByUserId: string | null, viewerUserId: string | null): boolean {
  return createdByUserId === null || (viewerUserId !== null && createdByUserId === viewerUserId);
}

// Which person the viewer is in this group. Two sources can disagree: the
// browser's local hint, and the account's claim recorded on the server. When
// the viewer is identified, the server's claim wins -- it is the one that
// followed them here from another device.
export function resolveIdentityPersonId(
  people: { id: string; userId: string | null }[],
  viewerUserId: string | null,
  localPersonId: string | null
): string | null {
  const claimed = viewerUserId ? people.find((person) => person.userId === viewerUserId) : undefined;
  return claimed?.id ?? localPersonId;
}

// What one expense did to a viewer's balance: what they put in on it minus
// what they owe on it. Null when nobody has said which person they are, since
// none of these figures are "yours" until then. Positive means they are owed
// for it, negative means they owe on it, zero means the expense is not theirs
// either way (someone else paid and they are not in the split).
//
// Deliberately derived per expense rather than read off `balances`: a balance
// is netted across every expense AND every settlement between a pair, so it
// cannot answer "what did this one row do to me".
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
