import { ArrowRight, Check } from 'lucide-react';
import type { ReactNode } from 'react';

import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { formatCurrency, splitCurrencyFraction } from '../../shared/format';
import { useTweenedNumber } from '../../shared/useTweenedNumber';
import { claimIdentity } from './claimIdentity';
import {
  fitFontSize,
  periodTotals,
  shareFraction,
  viewerNetCents,
  viewerOpenPayments,
} from './summaryMath';
import type { Balance, Expense, Person, SettleMode } from './types';

interface GroupSummaryProps {
  code: string;
  people: Person[];
  // Null until the viewer has picked who they are.
  personId: string | null;
  balances: Balance[];
  // The period the ring covers; the net amount ignores it.
  expenses: Expense[];
  currency: string;
  settleMode: SettleMode;
  // Under the ring: the expense period control.
  periodControl?: ReactNode;
  onSettleUp: () => void;
  onClaimed: () => void;
}

const CARD =
  'relative z-1 -mt-16 rounded-card bg-surface p-4 shadow-sheet sm:mx-2';

export function GroupSummary({
  code,
  people,
  personId,
  balances,
  expenses,
  currency,
  settleMode,
  periodControl,
  onSettleUp,
  onClaimed,
}: GroupSummaryProps) {
  if (!personId) {
    return (
      <section aria-label="Which one is you?" className={CARD}>
        <p className="font-sans text-body text-ink">Which one is you?</p>
        <p className="mb-2.5 mt-0.5 font-sans text-label text-dim">
          Pick your name to see what you pay or get back.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {people.map((person) => (
            <Button
              key={person.id}
              variant="secondary"
              onClick={() => {
                claimIdentity(code, person.id);
                onClaimed();
              }}
            >
              <Avatar name={person.name} />
              {person.name}
            </Button>
          ))}
        </div>
      </section>
    );
  }

  const netCents = viewerNetCents(balances, personId);
  const openPayments = viewerOpenPayments(balances, personId, settleMode);
  const { totalCents, shareCents } = periodTotals(expenses, personId);

  return (
    <section aria-label="Your position in this group" className={CARD}>
      {/* The left column spans both rows: the heading sits at the top beside the ring,
          the figure right under it, and the settle link drops to the period control's row. */}
      <div className="grid grid-cols-[1fr_min(46%,10.25rem)] gap-x-4 gap-y-2">
        <div className="row-span-2 flex min-w-0 flex-col justify-between gap-2 py-2">
          {/* Label and figure stay together at the top; only the settle link drops. */}
          <div className="flex flex-col gap-1.5">
            <Cue>Net position</Cue>
            <NetFigure netCents={netCents} currency={currency} />
          </div>
          {openPayments > 0 && (
            <button
              type="button"
              onClick={onSettleUp}
              className="focus-ring -mb-2 -ml-2 -mt-1 flex min-h-11 flex-col items-start justify-center gap-0.5 self-start rounded-inner px-2 py-1 text-left font-sans text-micro text-dim transition-colors duration-150 hover:bg-ink/6 active:bg-ink/10"
            >
              <span>
                {openPayments} {openPayments === 1 ? "payment" : "payments"} to sort out
              </span>
              <span className="flex items-center gap-1 text-label font-semibold text-accent">
                Settle in Balances
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </span>
            </button>
          )}
        </div>
        <ShareRing shareCents={shareCents} totalCents={totalCents} currency={currency} />
        {periodControl && <div className="col-start-2">{periodControl}</div>}
      </div>
    </section>
  );
}

function NetFigure({ netCents, currency }: { netCents: number; currency: string }) {
  // The figure rolls to a new total when a payment lands; it does not count up on first paint.
  const shownCents = Math.round(useTweenedNumber(Math.abs(netCents)));
  if (netCents === 0) {
    return (
      <p className="flex items-center gap-1.5 font-sans text-title font-semibold text-accent">
        <Check aria-hidden="true" className="size-5.5 shrink-0" strokeWidth={2.25} />
        You’re even
      </p>
    );
  }

  const owes = netCents < 0;
  const { whole: finalWhole, fraction: finalFraction } = splitCurrencyFraction(Math.abs(netCents) / 100, currency);
  const { whole, fraction } = splitCurrencyFraction(shownCents / 100, currency);
  return (
    <div>
      {/* The direction label belongs to the figure, so it sits directly on it. */}
      <p className="font-sans text-label text-dim">{owes ? "You need to pay" : "Coming back to you"}</p>
      {/* Cents set smaller so the dollars carry the figure; the fit counts them at 0.6 width. */}
      <p
        className={`mt-0.5 font-mono font-semibold leading-none tracking-[-0.03em] ${owes ? "text-down" : "text-accent"}`}
        style={{ fontSize: `${fitFontSize('0'.repeat(Math.ceil(finalWhole.length + finalFraction.length * 0.6)), 3.25, 9.75, 1.25)}rem` }}
      >
        {whole}
        {fraction && <span className="text-[0.6em] tracking-normal">{fraction}</span>}
      </p>
    </div>
  );
}

// The card's heading for the left side, like the home screen's: it is the sum of
// everything the viewer owes and is owed.
function Cue({ children }: { children: ReactNode }) {
  return (
    <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-dim">{children}</p>
  );
}

const RING_C = 2 * Math.PI * 44;

function ShareRing({ shareCents, totalCents, currency }: { shareCents: number; totalCents: number; currency: string }) {
  const share = formatCurrency(shareCents / 100, currency);
  const total = formatCurrency(totalCents / 100, currency);
  const arc = RING_C * shareFraction(shareCents, totalCents);
  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={`Your share ${share} of the group total ${total}`}
      className="aspect-square w-full"
    >
      <circle cx="50" cy="50" r="44" fill="none" strokeWidth="8" className="stroke-sunken" />
      {arc > 0 && (
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${arc} ${RING_C}`}
          transform="rotate(-90 50 50)"
          className="stroke-accent transition-[stroke-dasharray] duration-200 ease-out"
        />
      )}
      <text x="50" y="35" textAnchor="middle" fontSize="8.5" className="fill-dim font-sans">
        Your share
      </text>
      <text
        x="50"
        y="49"
        textAnchor="middle"
        fontSize={fitFontSize(share, 13, 56, 8)}
        fontWeight="600"
        className={`font-mono ${shareCents > 0 ? "fill-accent" : "fill-dim"}`}
      >
        {share}
      </text>
      <line x1="30" y1="56" x2="70" y2="56" strokeWidth="1" className="stroke-line" />
      <text x="50" y="67" textAnchor="middle" fontSize="8.5" className="fill-dim font-sans">
        Group total
      </text>
      <text
        x="50"
        y="78"
        textAnchor="middle"
        fontSize={fitFontSize(total, 10, 56, 7)}
        fontWeight="600"
        className="fill-ink font-mono"
      >
        {total}
      </text>
    </svg>
  );
}
