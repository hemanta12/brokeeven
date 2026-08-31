import { distributeProportionally } from './splitMath.js';

export type RedistributeInput =
  | { method: 'equal'; remainingCount: number; totalCents: number }
  | { method: 'percent'; remainingPercents: number[]; totalCents: number }
  | { method: 'custom'; remainingAmountsCents: number[]; removedAmountCents: number };

export type RedistributeResult = { amountsCents: number[]; percents?: number[] };

// PRD §6.2: on member removal, the remaining ExpenseSplit rows for each of their
// expenses are recalculated per the original split method — equal divides by
// fewer people, percent renormalizes the remaining shares to 100%, custom
// redistributes the removed share proportionally to the existing amounts.
export function redistributeAmounts(input: RedistributeInput): RedistributeResult {
  if (input.method === 'equal') {
    const amountsCents = distributeProportionally(input.totalCents, new Array(input.remainingCount).fill(1));
    return { amountsCents };
  }

  if (input.method === 'percent') {
    // Renormalize by distributing 10000 basis points (100.00%) proportionally
    // to the old percents, reusing the same cent-rounding rule at 2-decimal precision.
    const basisPoints = distributeProportionally(10000, input.remainingPercents);
    const percents = basisPoints.map((bp) => bp / 100);
    const amountsCents = distributeProportionally(input.totalCents, percents);
    return { amountsCents, percents };
  }

  const additions = distributeProportionally(input.removedAmountCents, input.remainingAmountsCents);
  const amountsCents = input.remainingAmountsCents.map((amount, i) => amount + (additions[i] ?? 0));
  return { amountsCents };
}
