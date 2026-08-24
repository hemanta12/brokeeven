import { distributeProportionally } from './splitMath.js';

export type SplitInput =
  | { method: 'equal'; personIds: string[] }
  | { method: 'percent'; shares: { personId: string; percent: number }[] }
  | { method: 'custom'; shares: { personId: string; amount: number }[] };

export type ResolvedSplit = { personId: string; amountCents: number; percentAtEntry: number | null };

function hasDuplicates(ids: string[]): boolean {
  return new Set(ids).size !== ids.length;
}

// Always resolves to dollar (cent) amounts that sum exactly to amountCents,
// per TECH_STACK.md §3's rounding rule and server-side split-sum validation.
export function resolveSplits(amountCents: number, input: SplitInput): ResolvedSplit[] | { error: string } {
  if (input.method === 'equal') {
    if (input.personIds.length === 0) return { error: 'At least one participant is required' };
    if (hasDuplicates(input.personIds)) return { error: 'Duplicate participant in split' };

    const cents = distributeProportionally(amountCents, input.personIds.map(() => 1));
    return input.personIds.map((personId, i) => ({ personId, amountCents: cents[i] ?? 0, percentAtEntry: null }));
  }

  if (input.method === 'percent') {
    if (input.shares.length === 0) return { error: 'At least one participant is required' };
    if (hasDuplicates(input.shares.map((s) => s.personId))) return { error: 'Duplicate participant in split' };
    if (input.shares.some((s) => !(s.percent > 0))) return { error: 'Percent must be greater than 0' };

    const percentSum = input.shares.reduce((sum, s) => sum + s.percent, 0);
    if (Math.abs(percentSum - 100) > 0.01) return { error: 'Percentages must sum to 100' };

    const cents = distributeProportionally(amountCents, input.shares.map((s) => s.percent));
    return input.shares.map((s, i) => ({ personId: s.personId, amountCents: cents[i] ?? 0, percentAtEntry: s.percent }));
  }

  if (input.shares.length === 0) return { error: 'At least one participant is required' };
  if (hasDuplicates(input.shares.map((s) => s.personId))) return { error: 'Duplicate participant in split' };
  if (input.shares.some((s) => !(s.amount > 0))) return { error: 'Amount must be greater than 0' };

  const resolved = input.shares.map((s) => ({
    personId: s.personId,
    amountCents: Math.round(s.amount * 100),
    percentAtEntry: null
  }));
  const sum = resolved.reduce((total, s) => total + s.amountCents, 0);
  if (sum !== amountCents) {
    return { error: `Custom amounts must sum to ${(amountCents / 100).toFixed(2)}` };
  }
  return resolved;
}
