import { type ReactNode } from 'react';

// Static "Settled" badge — no animation for MVP (DESIGN_SYSTEM.md §5,
// roadmap 4.2.5). The animated stamp is a later polish pass, not this one.
export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-ledger-green/15 px-3 py-1 font-sans text-label font-medium text-ledger-green">
      {children}
    </span>
  );
}
