// Layout-matched loading placeholder for GroupPage (UIUX_rules.md Core §1 —
// "layout-matched skeleton screens instead of centered loading spinners").
// Mirrors GroupPage's actual structure so there's no layout shift when the
// real content arrives; decorative, so screen readers get a plain status
// announcement instead of reading through empty blocks.
function Block({ className }: { className: string }) {
  return <div className={`rounded-md bg-ink-forest/10 ${className}`} />;
}

export function GroupPageSkeleton() {
  return (
    <main className="bottom-bar-clearance flex flex-col pt-8 animate-pulse">
      <span role="status" className="sr-only">
        Loading group…
      </span>

      <div aria-hidden="true" className="flex flex-1 flex-col">
        <div className="group-surface flex-1 rounded-[14px] bg-paper-white pb-6">
        <div className="px-4 pt-4 sm:px-6">
          <div className="relative flex flex-col items-center gap-2 rounded-[12px] border border-ledger-green/20 bg-ledger-paper px-4 pb-4 pt-10">
            <div className="absolute inset-x-3 top-2 flex items-center justify-between gap-3">
              <Block className="h-4 w-24" />
              <Block className="h-8 w-24 rounded-full" />
            </div>
            <Block className="h-8 w-40" />
            <Block className="h-5 w-20 rounded-full" />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-6">
          <Block className="h-4 w-24" />
          <Block className="h-9 w-32" />
        </div>

        <div className="mx-4 mt-5 rounded-[12px] border border-ledger-green/10 bg-ledger-paper/40 px-3 py-3 sm:mx-6 sm:px-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <Block className="h-4 w-12" />
            <Block className="h-11 w-11 rounded-full" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Block className="h-11 w-24 rounded-full" />
            <Block className="h-11 w-28 rounded-full" />
            <Block className="h-11 w-20 rounded-full" />
          </div>
        </div>

        <div className="mt-6 px-4 sm:px-6">
          <Block className="h-11 w-full rounded-[10px]" />
        </div>

        <div className="mt-3 overflow-hidden rounded-[10px] bg-paper-white">
          <ul>
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="flex min-h-11 items-center justify-between gap-4 px-2 py-3">
                <Block className="h-4 w-2/3" />
                <Block className="h-4 w-12" />
              </li>
            ))}
          </ul>
        </div>
        <div className="bottom-bar">
          <Block className="h-11 w-full rounded-lg" />
        </div>
        </div>
      </div>
    </main>
  );
}
