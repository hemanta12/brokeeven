import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from './Button';
import { Overlay } from '../shared/Overlay';
import { SignInButton } from '../features/auth/SignInButton';
import { useSession, useSignOut } from '../features/auth/api';

function PersonGlyph({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.2-3.6 4.2-5.5 7.5-5.5s6.3 1.9 7.5 5.5" strokeLinecap="round" />
    </svg>
  );
}

// Generic, not a real photo: a signed-in viewer gets the same person glyph on
// a filled ink disc so the corner reads as "your account" without pulling
// anything from Google.
function AccountDisc({ sizeClass, glyphClass }: { sizeClass: string; glyphClass: string }) {
  return (
    <span className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-ink-forest text-paper-white`}>
      <PersonGlyph className={glyphClass} />
    </span>
  );
}

// Bare check, no disc: a filled circle reads as a step number or a control.
// Brass is the app's accent — it isn't a button colour anywhere.
function CheckMark() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      aria-hidden="true"
      className="mt-1 h-3.5 w-3.5 shrink-0 text-brass-ui"
    >
      <path d="M4.5 10.5l3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SignOutGlyph() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className="h-4 w-4">
      <path
        d="M8 5.5V4a1.5 1.5 0 0 0-1.5-1.5h-3A1.5 1.5 0 0 0 2 4v12a1.5 1.5 0 0 0 1.5 1.5h3A1.5 1.5 0 0 0 8 16v-1.5"
        strokeLinecap="round"
      />
      <path d="M11 10h7M15.5 6.5 18.5 10l-3 3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Navbar() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { user, isSignedIn, isPending: isSessionPending } = useSession();
  const signOut = useSignOut();

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-ink-forest/10 bg-paper-white">
        {/* px-4 on mobile matches the page card's own edge inset; on desktop
            the card gains a visible fill and its edge sits at the column
            boundary, so the wordmark and profile drop to px-0 to line up with
            it. */}
        <div className="mx-auto flex max-w-[32.5rem] items-center justify-between px-4 py-2 sm:px-0">
          <Link
            to="/"
            aria-label="Home"
            className="focus-ring flex h-11 items-center rounded-md px-1.5 transition-transform duration-100 hover:bg-ink-forest/10 active:scale-95"
          >
            <span className="heading text-[1.25rem] leading-none">BrokeEven</span>
          </Link>
          {isSignedIn && user ? (
            <button
              type="button"
              aria-label="Profile"
              onClick={() => setIsProfileOpen(true)}
              className="focus-ring flex h-11 w-11 items-center justify-center rounded-full text-ink-forest transition-transform duration-100 hover:bg-ink-forest/10 active:scale-90"
            >
              <AccountDisc sizeClass="h-8 w-8" glyphClass="h-[18px] w-[18px]" />
            </button>
          ) : isSessionPending ? (
            // Neutral placeholder for the ~1 request /auth/me takes — no label
            // either way until we know which one is true.
            <span className="flex h-11 w-11 items-center justify-center text-ink-forest/40">
              <PersonGlyph className="h-6 w-6" />
            </span>
          ) : (
            // Signed out: a "profile" glyph would name something that doesn't
            // exist yet. An explicit affordance is clearer and it opens the
            // same panel.
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="focus-ring flex h-11 items-center rounded-full border border-ink-forest/25 px-4 font-sans text-label font-medium text-ink-forest transition-transform duration-100 hover:bg-ledger-paper active:scale-95"
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      {isProfileOpen && (
        <Overlay
          title={isSignedIn ? 'Profile' : 'Sign in'}
          isDirty={false}
          onClose={() => setIsProfileOpen(false)}
        >
          <div className="flex flex-col gap-6">
            {isSessionPending ? (
              // Don't fall through to the sign-in branch while /auth/me is in
              // flight: mounting the Google button for someone who turns out to
              // be signed in loads a third-party script for nothing and makes
              // GSI log an origin error against a page that never needed it.
              <p className="font-sans text-label text-ink-forest/70">Loading…</p>
            ) : isSignedIn && user ? (
              <>
                <div className="flex items-center gap-3">
                  <AccountDisc sizeClass="h-12 w-12" glyphClass="h-6 w-6" />
                  <div className="min-w-0">
                    <p className="truncate font-sans text-body font-semibold text-ink-forest">
                      {user.name ?? 'Signed in'}
                    </p>
                    {user.email && (
                      <p className="truncate font-sans text-label text-ink-forest/70">{user.email}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 border-t border-ink-forest/10 pt-4">
                  <Button
                    variant="secondary"
                    onClick={() => signOut.mutate()}
                    disabled={signOut.isPending}
                    className="border-debt-red/40! text-debt-red! hover:bg-debt-red/10!"
                  >
                    <SignOutGlyph />
                    {signOut.isPending ? 'Signing out…' : 'Sign out'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-[12px] bg-ledger-paper px-4 py-4">
                  <p className="font-sans text-body text-ink-forest/85">
                    Right now your groups live only in this browser. Sign in to:
                  </p>
                  <ul className="mt-3 flex flex-col gap-2.5">
                    <li className="flex items-start gap-2.5">
                      <CheckMark />
                      <span className="font-sans text-body text-ink-forest">
                        See all your groups in one place
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckMark />
                      <span className="font-sans text-body text-ink-forest">Reach them from any device</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckMark />
                      <span className="font-sans text-body text-ink-forest">
                        Keep them if this browser clears its data
                      </span>
                    </li>
                  </ul>
                </div>
                <SignInButton />
                <p className="rounded-[12px] bg-brass/10 px-4 py-3 font-sans text-label text-ink-forest/75">
                  No account needed — every feature works as-is. Signing in only guards against losing a group
                  this browser alone remembers.
                </p>
              </>
            )}
          </div>
        </Overlay>
      )}
    </>
  );
}
