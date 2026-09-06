import { SignInButton } from './SignInButton';

// Bare check, no disc: a filled circle would read as a step number or a
// control. Title-only items, no description line under each -- that's what
// kept the pre-redesign Navbar checklist glanceable. A single flowing
// sentence (tried here first) reads as one paragraph to parse; three short
// fragments read as three facts to skim.
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

// A short headline carries the pitch, the button acts on it, and the reasons
// underneath are three independent fragments rather than one sentence
// strung together with "and" / "so that" -- each has to stand on its own at
// a glance. The third is the joke (a callback to the landing page's own
// "tired of paying to split a pizza" line): it names the actual annoyance --
// scrolling old group chats to find who paid -- without spending a whole
// clause on it. Reassurance that it's optional closes it out, deliberately
// the quietest line on the screen.
//
// The headline is the one deliberate pun (DESIGN_SYSTEM §1: "personality
// lives in a few deliberate details, not everywhere") -- it reuses the
// product's own name literally, the way the landing page's own copy already
// leans on "BrokeEven" naming the goal state, `$0.00`.
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
