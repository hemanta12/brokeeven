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
    <main className="flex flex-col pt-2 animate-pulse">
      <span role="status" className="sr-only">
        Loading group…
      </span>

      <div aria-hidden="true" className="flex flex-1 flex-col">
        <div className="group-surface flex flex-1 flex-col rounded-[14px] bg-paper-white">
        <div className="px-4 pt-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <Block className="h-5 w-20 rounded-full" />
            <div className="flex shrink-0 gap-2">
              <Block className="h-11 w-16 rounded-full" />
              <Block className="h-11 w-11 rounded-full" />
            </div>
          </div>
          <Block className="mt-2 h-8 w-48" />
        </div>

        <div className="mx-4 mt-4 h-[3.75rem] rounded-[12px] bg-ink-forest/10 sm:mx-6" />

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
        <div className="bottom-bar mt-auto">
          <Block className="h-11 w-44 rounded-full" />
        </div>
        </div>
      </div>
    </main>
  );
}
