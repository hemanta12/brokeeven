import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from './Button';
import { Overlay } from '../shared/Overlay';
import { SignInPrompt } from '../features/auth/SignInPrompt';
import { useSession, useSignOut } from '../features/auth/api';

function PersonGlyph({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.2-3.6 4.2-5.5 7.5-5.5s6.3 1.9 7.5 5.5" strokeLinecap="round" />
    </svg>
  );
}

// Generic glyph on an ink disc, not a Google photo.
function AccountDisc({ sizeClass, glyphClass }: { sizeClass: string; glyphClass: string }) {
  return (
    <span className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-ink text-surface`}>
      <PersonGlyph className={glyphClass} />
    </span>
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
  const navigate = useNavigate();

  // "/" renders the right thing for either auth state, so one target covers both flows.
  function closeAndGoHome() {
    setIsProfileOpen(false);
    navigate('/');
  }

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-line bg-surface">
        {/* px-4 on mobile matches the page card's own edge inset; on desktop
            the card gains a visible fill and its edge sits at the column
            boundary, so the wordmark and profile drop to px-0 to line up with
            it. */}
        <div className="mx-auto flex max-w-[32.5rem] items-center justify-between px-4 py-2 sm:px-0">
          <Link
            to="/"
            aria-label="Home"
            className="focus-ring flex h-11 items-center rounded-md px-1.5 transition-transform duration-100 hover:bg-ink/10 active:scale-95"
          >
            <span className="heading text-title leading-none">BrokeEven</span>
          </Link>
          {isSignedIn && user ? (
            <button
              type="button"
              aria-label="Profile"
              onClick={() => setIsProfileOpen(true)}
              className="focus-ring flex h-11 w-11 items-center justify-center rounded-full text-ink transition-transform duration-100 hover:bg-ink/10 active:scale-90"
            >
              <AccountDisc sizeClass="h-8 w-8" glyphClass="size-4.5" />
            </button>
          ) : isSessionPending ? (
            // Neutral placeholder while /auth/me is in flight.
            <span className="flex h-11 w-11 items-center justify-center text-dim">
              <PersonGlyph className="h-6 w-6" />
            </span>
          ) : (
            // Signed out: explicit "Sign in", not a profile glyph.
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="focus-ring flex h-11 items-center rounded-full border border-line-strong px-4 font-sans text-label font-medium text-ink transition-transform duration-100 hover:bg-sunken active:scale-95"
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
          // Signed-out content is centered; match the title to it.
          centerTitle={!isSignedIn}
        >
          <div className="flex flex-col gap-6">
            {isSessionPending ? (
              // Don't mount the sign-in branch while /auth/me is in flight: loading the
              // Google script for an already-signed-in user makes GSI log an origin error.
              <p className="font-sans text-label text-dim">Loading…</p>
            ) : isSignedIn && user ? (
              <>
                <div className="flex items-center gap-3">
                  <AccountDisc sizeClass="h-12 w-12" glyphClass="h-6 w-6" />
                  <div className="min-w-0">
                    <p className="truncate font-sans text-body font-semibold text-ink">
                      {user.name ?? 'Signed in'}
                    </p>
                    {user.email && (
                      <p className="truncate font-sans text-label text-dim">{user.email}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 border-t border-line pt-4">
                  <Button
                    variant="secondary"
                    danger
                    onClick={() => signOut.mutate(undefined, { onSuccess: closeAndGoHome })}
                    disabled={signOut.isPending}
                  >
                    <SignOutGlyph />
                    {signOut.isPending ? 'Signing out…' : 'Sign out'}
                  </Button>
                </div>
              </>
            ) : (
              <SignInPrompt onSignedIn={closeAndGoHome} />
            )}
          </div>
        </Overlay>
      )}
    </>
  );
}
