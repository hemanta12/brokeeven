import { Link } from 'react-router-dom';

// One back control for every indexed page (create, join, quick, group). Modals
// keep their own close button and never use this. Two tones:
//  - `light`: a bordered pill for the plain page ground (create/join/quick),
//    where nothing else competes and it just needs to be visible.
//  - `band`: a plain chevron + label link for the group page's dark header.
//    Deliberately NOT a filled pill there: the band already has filled round
//    controls (people, info), and a matching pill made the back control read
//    as just another one of them. A bare link reads as navigation.
const BASE =
  'focus-ring inline-flex items-center font-sans font-medium transition-transform duration-100';

const TONE = {
  light:
    'h-9 gap-1 rounded-full border border-line-strong bg-surface pl-2 pr-3.5 text-label text-ink shadow-card hover:bg-sunken active:scale-95',
  band:
    'min-h-11 -ml-1 gap-1 text-body text-white/85 hover:text-white hover:underline underline-offset-4 active:opacity-70',
} as const;

function Chevron() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="h-4 w-4 shrink-0">
      <path d="M12 4.5 6.5 10l5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// `to` renders a real anchor; `onClick` a button (for in-page step-back, e.g.
// CreateGroupPage's people step). `label` names the destination so the control
// doubles as a "you are here" cue.
export function BackButton({
  to,
  onClick,
  label = 'Back',
  tone = 'light',
}: {
  to?: string;
  onClick?: () => void;
  label?: string;
  tone?: keyof typeof TONE;
}) {
  const className = `${BASE} ${TONE[tone]}`;
  if (to) {
    return (
      <Link to={to} className={className}>
        <Chevron />
        {label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      <Chevron />
      {label}
    </button>
  );
}
