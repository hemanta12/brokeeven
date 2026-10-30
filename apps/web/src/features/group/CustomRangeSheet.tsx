import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { Button } from "../../components/Button";
import { Overlay } from "../../shared/Overlay";
import {
  draftFromPeriod,
  monthIndex,
  monthLabel,
  pickRangeMonth,
  rangeLabel,
  rangeToPeriod,
  yearOf,
  type Period,
  type PeriodBounds,
} from "./expensePeriod";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface CustomRangeSheetProps {
  period: Period;
  thisMonth: number;
  bounds: PeriodBounds;
  // One month index per expense, for the dots and the count.
  expenseMonths: number[];
  onApply: (period: Period) => void;
  onClose: () => void;
}

// The only modal in the filter (the rest is a dropdown): two month tiles to say
// which end is being set, and a grid to set it.
export function CustomRangeSheet({ period, thisMonth, bounds, expenseMonths, onApply, onClose }: CustomRangeSheetProps) {
  const [draft, setDraft] = useState(() => draftFromPeriod(period, thisMonth));
  const [year, setYear] = useState(() => yearOf(draft.to));
  const withExpenses = new Set(expenseMonths);
  const count = expenseCount(expenseMonths, draft.from, draft.to);

  return (
    <Overlay title="Custom range" isDirty={false} compact onClose={onClose}>
      <div className="flex flex-col">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {(["from", "to"] as const).map((end) => (
            <Tile
              key={end}
              caption={end === "from" ? "From" : "To"}
              value={monthLabel(draft[end])}
              active={draft.picking === end}
              onClick={() => setDraft({ ...draft, picking: end })}
              arrow={end === "from"}
            />
          ))}
        </div>

        <div className="mb-1.5 mt-3.5 flex items-center justify-between">
          <button
            type="button"
            aria-label="Previous year"
            disabled={year <= yearOf(bounds.min)}
            onClick={() => setYear(year - 1)}
            className="focus-ring grid h-10 w-11 place-items-center rounded-inner transition-colors duration-150 enabled:hover:bg-ink/6 enabled:active:bg-ink/10 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>
          <b className="font-mono text-body font-semibold">{year}</b>
          <button
            type="button"
            aria-label="Next year"
            disabled={year >= yearOf(bounds.max)}
            onClick={() => setYear(year + 1)}
            className="focus-ring grid h-10 w-11 place-items-center rounded-inner transition-colors duration-150 enabled:hover:bg-ink/6 enabled:active:bg-ink/10 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="range-grid">
          {MONTHS.map((name, month0) => {
            const index = monthIndex(year, month0);
            const edge =
              draft.from === draft.to && index === draft.from
                ? "both"
                : index === draft.from
                  ? "start"
                  : index === draft.to
                    ? "end"
                    : undefined;
            const caption = edge === "start" ? "From" : edge === "end" ? "To" : null;
            return (
              <button
                key={index}
                type="button"
                className="range-month focus-ring"
                data-in={index >= draft.from && index <= draft.to}
                data-edge={edge}
                disabled={index > bounds.max}
                aria-label={`${monthLabel(index)}${caption ? `, ${caption}` : ""}${withExpenses.has(index) ? ", has expenses" : ""}`}
                onClick={() => setDraft(pickRangeMonth(draft, index))}
              >
                <span>
                  {name}
                  {caption && <em>{caption}</em>}
                </span>
                {withExpenses.has(index) && <i />}
              </button>
            );
          })}
        </div>
        <p className="mt-2.5 flex items-center gap-1.5 font-sans text-micro text-dim">
          <i className="size-1 rounded-full bg-line-strong" aria-hidden="true" />
          Has expenses
        </p>

        <Button size="lg" className="mt-4 w-full" onClick={() => onApply(rangeToPeriod(draft.from, draft.to))}>
          Show {rangeLabel(draft.from, draft.to)} · {count} {count === 1 ? "expense" : "expenses"}
        </Button>
      </div>
    </Overlay>
  );
}

function expenseCount(expenseMonths: number[], from: number, to: number): number {
  return expenseMonths.filter((index) => index >= from && index <= to).length;
}

function Tile({
  caption,
  value,
  active,
  onClick,
  arrow,
}: {
  caption: string;
  value: string;
  active: boolean;
  onClick: () => void;
  arrow: boolean;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={`focus-ring min-h-14.5 rounded-inner border px-3 py-2 text-left transition-colors duration-150 ${
          active ? "border-accent bg-selected ring-1 ring-accent" : "border-line bg-surface hover:bg-ink/6 active:bg-ink/10"
        }`}
      >
        <small className={`block font-sans text-micro ${active ? "font-semibold text-accent" : "text-dim"}`}>{caption}</small>
        <b className="mt-px block font-mono text-body font-semibold">{value}</b>
      </button>
      {arrow && (
        <ArrowRight aria-hidden="true" className="size-3.5 text-dim" />
      )}
    </>
  );
}
