import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";

import {
  ALL_TIME,
  compactMonthLabel,
  monthIndexOfDate,
  monthName,
  periodLabel,
  stepMonth,
  yearOf,
  type Period,
  type PeriodBounds,
} from "./expensePeriod";
import { CustomRangeSheet } from "./CustomRangeSheet";

interface ExpensePeriodControlProps {
  period: Period;
  thisMonth: number;
  bounds: PeriodBounds;
  // Selectable years, this year first.
  years: number[];
  // Every expense date, all time: the menu counts and the range dots read these.
  dates: string[];
  onChange: (period: Period) => void;
}

type MenuView = "main" | "year";

const ARROW_BUTTON =
  "focus-ring grid size-9 shrink-0 place-items-center rounded-full bg-ink/8 text-ink transition-colors duration-150 enabled:hover:bg-ink/12 enabled:active:bg-ink/16 disabled:cursor-not-allowed disabled:opacity-30";

function countLabel(count: number): string {
  return `${count} ${count === 1 ? "expense" : "expenses"}`;
}

// Sits under the ring. The dropdown (All time / This month / Year ›) is anchored
// to the pill; Year drills into a same-size panel; Custom range is the one modal.
export function ExpensePeriodControl({ period, thisMonth, bounds, years, dates, onChange }: ExpensePeriodControlProps) {
  const [menu, setMenu] = useState<MenuView | null>(null);
  const [rangeOpen, setRangeOpen] = useState(false);
  const pillRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const prev = stepMonth(period, -1, bounds);
  const next = stepMonth(period, 1, bounds);
  const isThisMonth = period.kind === "month" && period.index === thisMonth;

  function closeMenu() {
    setMenu(null);
    pillRef.current?.focus();
  }

  function choose(value: Period) {
    setMenu(null);
    onChange(value);
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      closeMenu();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>("button") ?? []);
    const at = items.indexOf(document.activeElement as HTMLElement);
    const delta = event.key === "ArrowDown" ? 1 : -1;
    items[(at + delta + items.length) % items.length]?.focus();
  }

  const active = period.kind !== "all";
  const isMonth = period.kind === "month";
  const yearCount = (year: number) => dates.filter((date) => yearOf(monthIndexOfDate(date)) === year).length;

  return (
    <div className="relative flex w-full flex-col items-center">
      <div className="flex w-full items-center justify-center">
        {period.kind === "month" && (
          <button
            type="button"
            aria-label="Previous month"
            disabled={!prev}
            onClick={() => prev && onChange(prev)}
            className={ARROW_BUTTON}
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>
        )}
        <button
          ref={pillRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={menu !== null}
          aria-label={isMonth ? periodLabel(period) : undefined}
          onClick={() => setMenu(menu ? null : "main")}
          className={`focus-ring inline-flex h-11 min-w-0 max-w-full items-center rounded-full font-sans ${
            isMonth ? "mx-0.5 gap-1.5 px-2.5" : "gap-2 pl-4 pr-3.5"
          } text-label font-semibold transition-colors duration-150 active:bg-accent-pressed active:text-white ${
            active
              ? "bg-accent text-white hover:bg-accent-hover"
              : "bg-selected text-accent hover:bg-accent/15"
          }`}
        >
          <CalendarDays aria-hidden="true" className="size-4 shrink-0" />
          <span className="truncate">
            {period.kind === "month" ? compactMonthLabel(period.index, thisMonth) : periodLabel(period)}
          </span>
          {!isMonth && <ChevronDown aria-hidden="true" className="size-4 shrink-0" />}
        </button>
        {period.kind === "month" && (
          <button
            type="button"
            aria-label="Next month"
            disabled={!next}
            onClick={() => next && onChange(next)}
            className={ARROW_BUTTON}
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>

      {menu && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={closeMenu}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div
            ref={menuRef}
            role="menu"
            aria-label="Expense period"
            onKeyDown={handleMenuKeyDown}
            className="menu-in absolute right-0 top-full z-20 mt-1.5 flex w-60 max-w-[calc(100vw-2rem)] flex-col gap-1 rounded-card border border-line bg-surface p-1.5 shadow-dialog"
          >
            {menu === "main" ? (
              <div key="main" className="menu-swap flex flex-col gap-1">
                <MenuItem
                  autoFocus
                  name="All time"
                  hint={countLabel(dates.length)}
                  checked={period.kind === "all"}
                  onClick={() => choose(ALL_TIME)}
                />
                <MenuItem
                  name="This month"
                  hint={monthName(thisMonth)}
                  checked={isThisMonth}
                  onClick={() => choose({ kind: "month", index: thisMonth })}
                />
                <div className="mx-1.5 h-px bg-line" />
                <MenuItem
                  name="Year"
                  hint={period.kind === "year" ? String(period.year) : ""}
                  checked={period.kind === "year"}
                  drill
                  onClick={() => setMenu("year")}
                />
                <MenuItem
                  name="Custom range"
                  hint={period.kind === "range" || (period.kind === "month" && !isThisMonth) ? periodLabel(period) : ""}
                  checked={period.kind === "range" || (period.kind === "month" && !isThisMonth)}
                  drill
                  onClick={() => {
                    setMenu(null);
                    setRangeOpen(true);
                  }}
                />
              </div>
            ) : (
              <div key="year" className="menu-swap flex flex-col gap-1">
                <button
                  type="button"
                  role="menuitem"
                  autoFocus
                  onClick={() => setMenu("main")}
                  className="focus-ring flex min-h-11.5 w-full items-center gap-2.5 rounded-inner px-3 text-left font-sans text-label font-semibold text-ink transition-colors duration-150 hover:bg-ink/6 active:bg-ink/10"
                >
                  <ChevronLeft aria-hidden="true" className="size-4 shrink-0 text-dim" />
                  Year
                </button>
                <div className="mx-1.5 h-px bg-line" />
                {years.map((year) => (
                  <MenuItem
                    key={year}
                    name={String(year)}
                    hint={countLabel(yearCount(year))}
                    checked={period.kind === "year" && period.year === year}
                    onClick={() => choose({ kind: "year", year })}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {rangeOpen && (
        <CustomRangeSheet
          period={period}
          thisMonth={thisMonth}
          bounds={bounds}
          expenseMonths={dates.map(monthIndexOfDate)}
          onApply={onChange}
          onClose={() => {
            setRangeOpen(false);
            pillRef.current?.focus();
          }}
        />
      )}
    </div>
  );
}

function MenuItem({
  name,
  hint,
  checked,
  drill = false,
  autoFocus = false,
  onClick,
}: {
  name: string;
  hint: string;
  checked: boolean;
  drill?: boolean;
  autoFocus?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role={drill ? "menuitem" : "menuitemradio"}
      aria-checked={drill ? undefined : checked}
      aria-haspopup={drill ? "true" : undefined}
      autoFocus={autoFocus}
      onClick={onClick}
      className={`focus-ring flex min-h-11.5 w-full items-center gap-2.5 rounded-inner px-3 text-left transition-colors duration-150 ${
        checked ? "bg-selected" : "hover:bg-ink/6 active:bg-ink/10"
      }`}
    >
      <Check aria-hidden="true" className={`size-4 shrink-0 text-accent ${checked ? "" : "invisible"}`} strokeWidth={2.25} />
      <span className="flex-1 whitespace-nowrap font-sans text-label font-semibold text-ink">{name}</span>
      {hint && <span className="font-sans text-micro text-dim">{hint}</span>}
      {drill && <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-dim" />}
    </button>
  );
}
