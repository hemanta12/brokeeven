import { Amount } from '../../components/Amount';
import type { Balance, Expense } from './types';

interface GroupSummaryProps {
  balances: Balance[];
  expenses: Expense[];
  personId: string;
  // Passed only when the viewer is not already on the Balances tab. When
  // absent the settle row is hidden — it points where you already are.
  onSettleUp?: () => void;
}

function sum(values: string[]): number {
  return values.reduce((total, value) => total + Number(value), 0);
}

const DOT_CAP = 5;

// Two coloured chips for the position you act on, the spend it sits against,
// and a jump to the Balances tab to clear it. The per-side totals (owed / owe)
// exist nowhere else: the Balances tab lists them per person but never sums
// either side.
export function GroupSummary({ balances, expenses, personId, onSettleUp }: GroupSummaryProps) {
  const total = sum(expenses.map((e) => e.amount));
  const share = sum(
    expenses.flatMap((e) => e.splits.filter((s) => s.personId === personId)).map((s) => s.amount),
  );
  const owed = sum(balances.filter((b) => b.toPersonId === personId).map((b) => b.amount));
  const owe = sum(balances.filter((b) => b.fromPersonId === personId).map((b) => b.amount));

  // Not in a single split, no open balance: none of this is theirs.
  if (share === 0 && owed === 0 && owe === 0) return null;

  // Only the balances the viewer is a party to. A debt between two other
  // people is the group's business, not a payment *they* have left to make.
  const pending = balances.filter(
    (b) => b.fromPersonId === personId || b.toPersonId === personId,
  ).length;

  return (
    /* Straddles the band's lower edge (sketch 013). */
    <section
      aria-label="Your position in this group"
      className="relative z-1 mx-4 -mt-16 flex flex-col gap-3 overflow-hidden rounded-card bg-surface p-4 shadow-sheet sm:mx-6"
    >
      <div className="grid grid-cols-2 gap-2.5">
        <Chip label="You’re owed" value={owed} variant="in" />
        <Chip label="You owe" value={owe} variant="out" />
      </div>

      <dl className="flex items-start justify-between gap-3 border-t border-line pt-3">
        <div className="min-w-0">
          <dt className="font-sans text-micro text-dim">Total group expense</dt>
          <dd>
            <Amount value={total} className="block truncate text-title font-semibold text-ink" />
          </dd>
        </div>
        <div className="min-w-0 text-right">
          <dt className="font-sans text-micro text-dim">Your share</dt>
          <dd>
            <Amount value={share} className="block truncate text-title font-semibold text-ink" />
          </dd>
        </div>
      </dl>

      {/* Always rendered so the card is the same height on every tab — only
          the "Settle up" jump drops away once you're already on Balances. */}
      <div className="flex min-h-6 items-center justify-between gap-3 border-t border-line pt-3">
        {pending > 0 ? (
          <span className="flex min-w-0 items-center gap-2 font-sans text-label text-dim">
            <span aria-hidden="true" className="flex shrink-0 items-center gap-1">
              {Array.from({ length: Math.min(pending, DOT_CAP) }).map((_, i) => (
                <span key={i} className="size-2 rounded-full border border-line-strong" />
              ))}
            </span>
            <span className="truncate">
              {pending} {pending === 1 ? 'payment' : 'payments'} left to settle
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-2 font-sans text-label font-medium text-ink">
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              aria-hidden="true"
              className="h-4 w-4 text-accent"
            >
              <path d="M4.5 10.5l3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            You’re all settled up
          </span>
        )}
        {onSettleUp && pending > 0 && (
          <button
            type="button"
            onClick={onSettleUp}
            className="focus-ring flex shrink-0 items-center gap-1 rounded font-sans text-label font-semibold text-accent"
          >
            Settle up
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              aria-hidden="true"
              className="h-3.5 w-3.5"
            >
              <path d="M4 10h11M11 5.5 15.5 10 11 14.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </section>
  );
}

// Deposit / withdraw over a small tray: "in" drops an arrow into the tray
// (money coming back to you), "out" lifts one out. The tray shape keeps it
// from reading as a rising / falling trend line. It sits on a plain sunken
// chip rather than a coloured fill — that fill was the loud part — but the
// icon and the figure still take the direction colour (accent / down).
function FlowArrow({ variant, className }: { variant: 'in' | 'out'; className: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 ${className}`}
    >
      <path
        d={variant === 'in' ? 'M8 2.5V9.5M5 6.5 8 9.5 11 6.5' : 'M8 9.5V2.5M5 5.5 8 2.5 11 5.5'}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3.5 10.5V13h9v-2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Chip({ label, value, variant }: { label: string; value: number; variant: 'in' | 'out' }) {
  // A zero side is not an "owed" / "owe" item — leave it uncoloured.
  const direction = value === 0 ? 'flat' : variant === 'in' ? 'up' : 'down';
  const iconColour = value === 0 ? 'text-dim' : variant === 'in' ? 'text-accent' : 'text-down';
  return (
    <div className="flex items-center gap-2.5 rounded-card bg-sunken px-3 py-2.5">
      <FlowArrow variant={variant} className={iconColour} />
      <span className="min-w-0">
        <span className="block truncate font-sans text-micro text-dim">{label}</span>
        <Amount
          value={value}
          direction={direction}
          className="block truncate text-row-amount font-semibold"
        />
      </span>
    </div>
  );
}
