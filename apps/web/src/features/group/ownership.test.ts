import { describe, expect, it } from 'vitest';

import { canEdit, resolveIdentityPersonId } from './ownership';

describe('canEdit', () => {
  it('leaves rows with no recorded creator open to everyone', () => {
    expect(canEdit(null, null)).toBe(true);
    expect(canEdit(null, 'u1')).toBe(true);
  });

  it('lets the creator edit their own row', () => {
    expect(canEdit('u1', 'u1')).toBe(true);
  });

  it("hides the affordance on someone else's row", () => {
    expect(canEdit('u1', 'u2')).toBe(false);
  });

  it('hides it from a viewer the server could not identify', () => {
    expect(canEdit('u1', null)).toBe(false);
  });
});

describe('resolveIdentityPersonId', () => {
  const people = [
    { id: 'p1', userId: null },
    { id: 'p2', userId: 'u1' }
  ];

  it("prefers the account's claim over this browser's hint", () => {
    // The claim followed the viewer here from another device; the local hint
    // is whatever this browser happened to remember.
    expect(resolveIdentityPersonId(people, 'u1', 'p1')).toBe('p2');
  });

  it('falls back to the local hint when the viewer has claimed nobody', () => {
    expect(resolveIdentityPersonId(people, 'u9', 'p1')).toBe('p1');
  });

  it('uses the local hint for an unidentified viewer', () => {
    expect(resolveIdentityPersonId(people, null, 'p1')).toBe('p1');
  });

  it('returns null when neither source knows', () => {
    expect(resolveIdentityPersonId(people, null, null)).toBeNull();
  });
});
