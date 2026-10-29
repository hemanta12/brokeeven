import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

// Back control for indexed pages (create, join, quick, group); modals use their
// own close button. Two tones: `light` (bordered pill on plain ground), `band`
// (bare chevron link on the group page's dark header).
const BASE =
  'focus-ring inline-flex items-center font-sans font-medium pressable';

const TONE = {
  light:
    'h-9 gap-1 rounded-full border border-line-strong bg-surface pl-2 pr-3.5 text-label text-ink shadow-card hover:bg-sunken active:scale-95',
  band:
    'min-h-11 -ml-1 gap-1 text-body text-white/85 hover:text-white hover:underline underline-offset-4 active:opacity-70',
} as const;

// On the band all three header controls are borderless icon buttons; the title
// is the only strong element there.
const ICON_TONE = {
  light:
    'h-9 w-9 justify-center rounded-full border border-line-strong bg-surface text-ink shadow-card hover:bg-sunken active:scale-95',
  band:
    'size-11 justify-center rounded-full text-white hover:bg-white/10 active:scale-95 active:bg-white/15',
} as const;

// `to` renders an anchor; `onClick` renders a button (in-page step-back). `label`
// names the destination.
export function BackButton({
  to,
  onClick,
  label = 'Back',
  tone = 'light',
  iconOnly = false,
}: {
  to?: string;
  onClick?: () => void;
  label?: string;
  tone?: keyof typeof TONE;
  iconOnly?: boolean;
}) {
  const className = `${BASE} ${iconOnly ? ICON_TONE[tone] : TONE[tone]}`;
  const content = (
    <>
      <ChevronLeft className="size-4 shrink-0" strokeWidth={2} />
      <span className={iconOnly ? 'sr-only' : undefined}>{label}</span>
    </>
  );
  if (to) {
    return (
      <Link to={to} state={{ direction: 'back' }} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
