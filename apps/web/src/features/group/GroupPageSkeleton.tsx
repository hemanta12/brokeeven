// Layout-matched loading placeholder for GroupPage (UIUX_rules.md Core §1:
// "layout-matched skeleton screens instead of centered loading spinners").
// Mirrors GroupPage's actual structure so there's no layout shift when the
// real content arrives; decorative, so screen readers get a plain status
// announcement instead of reading through empty blocks.
function Block({ className }: { className: string }) {
  return <div className={`rounded-md bg-ink/10 ${className}`} />;
}

// On the band, a placeholder has to be a light scrim rather than an ink tint,
// or it disappears into the dark surface it sits on.
function BandBlock({ className }: { className: string }) {
  return <div className={`rounded-md bg-white/12 ${className}`} />;
}

export function GroupPageSkeleton() {
  return (
    <main className="flex flex-col pt-2 animate-pulse">
      <span role="status" className="sr-only">
        Loading group…
      </span>

      <div aria-hidden="true" className="flex flex-1 flex-col">
        <div className="-mx-4 -mt-2 bg-band px-4 pb-11 pt-3.5 sm:rounded-t-card sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <BandBlock className="h-5 w-20 rounded-full" />
            <div className="flex shrink-0 gap-2">
              <BandBlock className="h-11 w-16 rounded-full" />
              <BandBlock className="h-11 w-11 rounded-full" />
            </div>
          </div>
          <BandBlock className="mt-3 h-7 w-48" />
        </div>

        {/* The straddling summary card, same offset as GroupSummary's. */}
        <div className="mx-4 -mt-8 h-[5.5rem] rounded-card bg-surface shadow-sheet sm:mx-6" />

        <div className="mt-4 px-4 sm:px-6">
          <Block className="h-11 w-full rounded-full" />
        </div>

        <ul className="mt-3 flex flex-col gap-2 px-4 sm:px-6">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="flex min-h-13 items-center gap-3 rounded-inner border border-line bg-surface px-3 py-2">
              <Block className="size-8.5 shrink-0 rounded-full" />
              <Block className="h-4 w-2/3" />
              <Block className="ml-auto h-4 w-12" />
            </li>
          ))}
        </ul>

        <div className="bottom-bar mt-auto">
          <Block className="h-13 w-44 rounded-full" />
        </div>
      </div>
    </main>
  );
}
