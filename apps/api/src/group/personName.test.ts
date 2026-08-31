import { describe, expect, it } from 'vitest';

import { normalizePersonName } from './personName.js';

describe('normalizePersonName', () => {
  it('capitalizes the first letter', () => {
    expect(normalizePersonName('alice')).toBe('Alice');
  });

  it('trims surrounding whitespace before capitalizing', () => {
    expect(normalizePersonName('  bob ')).toBe('Bob');
  });

  it('leaves the rest of the name untouched', () => {
    expect(normalizePersonName('de Souza')).toBe('De Souza');
    expect(normalizePersonName('McKay')).toBe('McKay');
  });

  it('is a no-op on an already-capitalized name', () => {
    expect(normalizePersonName('Alice')).toBe('Alice');
  });
});
