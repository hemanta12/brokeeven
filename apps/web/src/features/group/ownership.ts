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
