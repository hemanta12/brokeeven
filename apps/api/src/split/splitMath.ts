// Rounds each weighted share to the nearest cent, then walks entries in input
// order handing out any leftover pennies one at a time (TECH_STACK.md §3
// rounding rule) until the shares sum exactly to totalCents.
export function distributeProportionally(totalCents: number, weights: number[]): number[] {
  if (weights.length === 0) return [];

  const weightSum = weights.reduce((a, b) => a + b, 0);
  const rounded = weights.map((w) => Math.round(weightSum === 0 ? 0 : (totalCents * w) / weightSum));

  let leftover = totalCents - rounded.reduce((a, b) => a + b, 0);
  const step = leftover > 0 ? 1 : -1;
  for (let i = 0; leftover !== 0; i++, leftover -= step) {
    const idx = i % rounded.length;
    rounded[idx] = (rounded[idx] ?? 0) + step;
  }
  return rounded;
}
