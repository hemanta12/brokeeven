import { beforeEach, describe, expect, it } from 'vitest';

import { isInviteSaved, markInviteSaved } from './inviteSaved';

describe('inviteSaved', () => {
  beforeEach(() => localStorage.clear());

  it('is false until marked, per code', () => {
    expect(isInviteSaved('AAA')).toBe(false);
    markInviteSaved('AAA');
    expect(isInviteSaved('AAA')).toBe(true);
    expect(isInviteSaved('BBB')).toBe(false);
  });
});
