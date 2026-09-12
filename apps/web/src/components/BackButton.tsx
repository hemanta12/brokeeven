import { Link } from 'react-router-dom';

// Back control for indexed pages (create, join, quick, group); modals use their
// own close button. Two tones: `light` (bordered pill on plain ground), `band`
// (bare chevron link on the group page's dark header).
const BASE =
  'focus-ring inline-flex items-center font-sans font-medium transition-transform duration-100';

const TONE = {
  light:
    'h-9 gap-1 rounded-full border border-line-strong bg-surface pl-2 pr-3.5 text-label text-ink shadow-card hover:bg-sunken active:scale-95',
  band:
    'min-h-11 -ml-1 gap-1 text-body text-white/85 hover:text-white hover:underline underline-offset-4 active:opacity-70',
} as const;

// `band`'s squared corner is deliberate: its siblings there are circular icon
// buttons, so back-navigation never reads as one of the action buttons.
const ICON_TONE = {
  light:
    'h-9 w-9 justify-center rounded-full border border-line-strong bg-surface text-ink shadow-card hover:bg-sunken active:scale-95',
  band:
    'h-11 w-11 justify-center rounded-xl border border-band-dim bg-white/8 text-white/85 hover:bg-white/15 hover:text-white active:scale-95',
} as const;

function Chevron() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="h-4 w-4 shrink-0">
      <path d="M12 4.5 6.5 10l5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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
      <Chevron />
      <span className={iconOnly ? 'sr-only' : undefined}>{label}</span>
    </>
  );
  if (to) {
    return (
      <Link to={to} className={className}>
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
