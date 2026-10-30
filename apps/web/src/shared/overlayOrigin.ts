// Remembers where the last tap landed so an overlay can come out of its trigger
// and go back into it. Read at click time: the trigger may unmount (a menu item,
// a button inside another sheet) before the overlay mounts.
const FRESH_MS = 2000;

let last: { rect: DOMRect; at: number } | null = null;

if (typeof document !== 'undefined') {
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target instanceof Element ? event.target.closest('button, a, [role="button"], [role="menuitem"]') : null;
      const rect = target?.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) return;
      last = { rect, at: Date.now() };
    },
    true
  );
}

export interface Origin {
  // Which half of the screen the trigger sits in.
  from: 'top' | 'bottom';
  // Where an anchored panel hangs from: just under the trigger, right edges aligned.
  anchorTop: number;
  anchorRight: number;
}

// No recent tap (deep link, auto-opened prompt): treat it as coming from below,
// and hang an anchored panel under the navbar's right end.
export function readOrigin(): Origin {
  if (typeof window === 'undefined' || !last || Date.now() - last.at > FRESH_MS) {
    return { from: 'bottom', anchorTop: 56, anchorRight: 16 };
  }
  const { rect } = last;
  return {
    from: rect.top + rect.height / 2 < window.innerHeight / 2 ? 'top' : 'bottom',
    anchorTop: rect.bottom,
    anchorRight: Math.max(0, window.innerWidth - rect.right)
  };
}

export function originStyle(origin: Origin): Record<string, string> {
  return {
    // Cards and prompts shift a short, straight vertical step toward the side
    // the trigger is on.
    '--shift': origin.from === 'top' ? '-16px' : '16px',
    '--anchor-top': `${Math.round(origin.anchorTop)}px`,
    '--anchor-right': `${Math.round(origin.anchorRight)}px`
  };
}
