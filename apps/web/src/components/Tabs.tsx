import { type CSSProperties, type KeyboardEvent } from 'react';

export interface TabItem {
  id: string;
  label: string;
  // A count pill after the label; hidden at 0. `label` is its accessible name.
  badge?: { count: number; label: string };
}

interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  label: string;
}

// Semantic tablist: arrow-key navigation, roving tabindex, aria-selected
// (DESIGN_SYSTEM.md §7, §10).
export function Tabs({ items, activeId, onChange, label }: TabsProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const currentIndex = items.findIndex((item) => item.id === activeId);
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    onChange(items[(currentIndex + delta + items.length) % items.length]!.id);
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className="segmented segmented-sliding"
      style={{ '--n': items.length, '--i': Math.max(0, items.findIndex((item) => item.id === activeId)) } as CSSProperties}
    >
      <span aria-hidden="true" className="segment-thumb" />
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={isActive}
            aria-controls={`panel-${item.id}`}
            tabIndex={isActive ? 0 : -1}
            data-active={isActive}
            onClick={() => onChange(item.id)}
            onKeyDown={handleKeyDown}
            className="segment focus-ring min-h-11 px-4 py-2 font-sans text-label font-semibold"
          >
            <span className="inline-flex items-center gap-1.5">
              {item.label}
              {item.badge && item.badge.count > 0 && (
                <span
                  aria-label={item.badge.label}
                  className="inline-grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1.5 font-mono text-[11px] font-bold text-surface"
                >
                  {item.badge.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
