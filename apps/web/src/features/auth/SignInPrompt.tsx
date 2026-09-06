import { SignInButton } from './SignInButton';

function Tick() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      aria-hidden="true"
      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent"
    >
      <path d="M4.5 10.5l3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const REASONS = ['Every group, one place', 'Every balance, one glance', 'Zero group-chat archaeology'];

export function SignInPrompt({ onSignedIn }: { onSignedIn?: () => void } = {}) {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <h3 className="heading max-w-[22ch] text-section">Break even, wherever you are.</h3>
      <SignInButton onSuccess={onSignedIn} />
      <ul className="flex flex-col gap-2 self-stretch">
        {REASONS.map((reason) => (
          <li key={reason} className="flex items-center justify-center gap-2">
            <Tick />
            <span className="font-sans text-label text-ink">{reason}</span>
          </li>
        ))}
      </ul>
      <p className="font-sans text-micro text-dim">Optional. BrokeEven works exactly the same without it.</p>
    </div>
  );
}
