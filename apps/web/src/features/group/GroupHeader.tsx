import { Lock, Settings, Users } from "lucide-react";
import type { ReactNode } from "react";

import { BackButton } from "../../components/BackButton";
import { CornerDecor } from "../../components/CornerDecor";
import { capitalizeFirst, formatDate } from "../../shared/format";

interface GroupHeaderProps {
  name: string;
  label: string | null;
  peopleCount: number;
  closedAt: string | null;
  // Signed out there is no My Groups to go back to; the navbar wordmark is the way out.
  showBack: boolean;
  // Room for the summary card that straddles the band's bottom edge.
  roomForSummary: boolean;
  onOpenPeople: () => void;
  onOpenSettings: () => void;
  children?: ReactNode;
}

const ICON_BUTTON =
  "focus-ring flex size-11 shrink-0 items-center justify-center rounded-full text-white transition-[background-color,transform] duration-150 hover:bg-white/10 active:scale-95 active:bg-white/15";

export function GroupHeader({
  name,
  label,
  peopleCount,
  closedAt,
  showBack,
  roomForSummary,
  onOpenPeople,
  onOpenSettings,
  children,
}: GroupHeaderProps) {
  const closed = Boolean(closedAt);
  const shownLabel = label && label !== "Individual" ? capitalizeFirst(label) : null;

  return (
    // No closed banner here: it'd push the header down and break the straddling summary card.
    <header
      className={`relative -mx-4 -mt-2 overflow-hidden px-4 pt-3 text-white sm:rounded-t-card sm:px-6 ${
        closed ? "bg-band-closed" : "bg-band"
      } ${roomForSummary ? "pb-20" : "pb-11"}`}
    >
      <CornerDecor />
      <div className="relative flex items-center gap-2">
        {showBack && (
          <div className="-ml-2.5">
            <BackButton to="/groups" label="Back to My groups" tone="band" iconOnly />
          </div>
        )}
        <div className={`min-w-0 flex-1 ${showBack ? "" : "py-1"}`}>
          <h1 className="heading text-hero-balance text-white">{name}</h1>
          {shownLabel && (
            <p className="mt-0.5 truncate font-sans text-micro uppercase tracking-wide text-band-dim">{shownLabel}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onOpenPeople}
            aria-haspopup="dialog"
            aria-label={`People (${peopleCount})`}
            className="focus-ring flex h-11 min-h-11 items-center gap-1.5 rounded-full border border-band-dim bg-white/8 px-3 font-sans text-label font-medium text-white transition-transform duration-100 hover:bg-white/15 active:scale-95"
          >
            <Users aria-hidden="true" className="size-4" strokeWidth={1.5} />
            {peopleCount}
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            aria-haspopup="dialog"
            aria-label="Group settings"
            className={`${ICON_BUTTON} -mr-2.5`}
          >
            <Settings aria-hidden="true" className="size-5" strokeWidth={1.75} />
          </button>
        </div>
      </div>
      {children}
      {closed && (
        <div className="relative mt-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-band-dim px-2.5 py-1 font-sans text-micro font-bold uppercase tracking-[0.08em] text-band-closed">
            <Lock aria-hidden="true" className="size-3" />
            Closed
          </span>
        </div>
      )}
      {closed && (
        <p className="relative mt-1.5 font-sans text-label text-band-dim">
          Closed {formatDate(closedAt as string)}. Nothing can be added or changed.
        </p>
      )}
    </header>
  );
}
