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
    <main className="animate-pulse pb-28">
      <span role="status" className="sr-only">
        Loading group…
      </span>

      <div aria-hidden="true">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Block className="h-8 w-40" />
            <Block className="h-5 w-20 rounded-full" />
          </div>
          <Block className="h-9 w-32" />
        </div>

        <Block className="mt-3 h-4 w-24" />

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Block className="h-11 w-24 rounded-full" />
          <Block className="h-11 w-28 rounded-full" />
          <Block className="h-11 w-20 rounded-full" />
        </div>

        <Block className="mt-6 h-11 w-full rounded-[10px]" />

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
      </div>
    </main>
  );
}
