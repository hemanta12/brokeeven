import type { MouseEvent } from 'react';

interface MemberChipProps {
  name: string;
  isYou?: boolean;
  onEdit?: () => void;
  onRemove?: () => void;
}

function stop(handler: () => void) {
  return (event: MouseEvent) => {
    event.stopPropagation();
    handler();
  };
}

export function MemberChip({ name, isYou = false, onEdit, onRemove }: MemberChipProps) {
  const hasActions = Boolean(onEdit || onRemove);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-ink-forest py-1 font-sans text-label font-medium text-ink-forest ${
        hasActions ? 'pl-3 pr-1' : 'px-3'
      } ${isYou ? 'border-b-2 border-b-brass' : ''}`}
    >
      {name}
      {onEdit && (
        <button
          type="button"
          onClick={stop(onEdit)}
          aria-label={`Edit ${name}`}
          className="member-chip-action focus-ring flex h-6 w-6 items-center justify-center rounded-full text-ink-forest/50"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5">
            <path
              d="M13.3 3.7a1.6 1.6 0 0 1 2.3 2.3L6.4 15.2l-3 .9.9-3 9-9.4Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={stop(onRemove)}
          aria-label={`Remove ${name}`}
          className="member-chip-action focus-ring flex h-6 w-6 items-center justify-center rounded-full text-ink-forest/50"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5">
            <path
              d="M4.5 6h11M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6M6 6l.6 8.6A1.5 1.5 0 0 0 8.1 16h3.8a1.5 1.5 0 0 0 1.5-1.4L14 6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </span>
  );
}
