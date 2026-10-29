import { useEffect, useRef, useState } from 'react';

interface TweenOptions {
  // Start here on mount instead of at `target`; omitted = no animation until the target changes.
  from?: number;
  duration?: number;
  delay?: number;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Eases a displayed number toward `target` (ease-out cubic). Re-targets from
// wherever it currently is, so a second update mid-flight doesn't jump.
export function useTweenedNumber(target: number, { from, duration = 600, delay = 0 }: TweenOptions = {}): number {
  const [value, setValue] = useState(from ?? target);
  const current = useRef(value);

  useEffect(() => {
    if (prefersReducedMotion()) {
      current.current = target;
      setValue(target);
      return;
    }
    if (current.current === target) return;
    const start = current.current;
    const begin = performance.now() + delay;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, Math.max(0, (now - begin) / duration));
      const next = start + (target - start) * (1 - Math.pow(1 - progress, 3));
      current.current = next;
      setValue(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // delay/duration are fixed per call site; only a new target re-runs this.
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  return value;
}
