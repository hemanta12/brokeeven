import { LogOut, User } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from './Button';
import { Overlay } from '../shared/Overlay';
import { DeleteAccountPanel } from '../features/auth/DeleteAccountPanel';
import { SignInPrompt } from '../features/auth/SignInPrompt';
import { useSession, useSignOut } from '../features/auth/api';
import { GroupActivityBell } from '../features/group/GroupActivityBell';

// Generic glyph on an ink disc, not a Google photo.
function AccountDisc({ sizeClass, glyphClass }: { sizeClass: string; glyphClass: string }) {
  return (
    <span className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-ink text-surface`}>
      <User className={glyphClass} strokeWidth={1.75} />
    </span>
  );
}

export function Navbar() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const { user, isSignedIn, isPending: isSessionPending } = useSession();
  const signOut = useSignOut();
  const navigate = useNavigate();

  // "/" renders the right thing for either auth state, so one target covers both flows.
  function closeAndGoHome() {
    setIsDeleteOpen(false);
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
            className="focus-ring flex h-11 items-center gap-2 rounded-md px-1.5 transition-transform duration-100 hover:bg-ink/10 active:scale-95"
          >
            <img src="/icons/icon-192.png" alt="" className="h-7 w-7 rounded-md" />
            {/* accent, not mint: mint is only 1.77:1 on this white bar. */}
            <span className="heading text-title font-extrabold leading-none tracking-tight">
              broke<span className="text-accent">even</span>
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <GroupActivityBell />
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
                <User className="h-6 w-6" strokeWidth={1.75} />
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
                  {/* Neutral: signing out loses nothing, so red stays reserved for delete. */}
                  <Button
                    variant="secondary"
                    onClick={() => signOut.mutate(undefined, { onSuccess: closeAndGoHome })}
                    disabled={signOut.isPending}
                  >
                    <LogOut className="size-4" />
                    {signOut.isPending ? 'Signing out…' : 'Sign out'}
                  </Button>
                </div>

                <div className="mt-6 flex flex-col gap-2 rounded-card border border-down/30 bg-down/5 px-4 py-3.5">
                  <p className="font-sans text-label font-medium text-ink">Caution</p>
                  <Button variant="primary" danger onClick={() => setIsDeleteOpen(true)} className="w-full">
                    Delete account
                  </Button>
                </div>
              </>
            ) : (
              <SignInPrompt onSignedIn={closeAndGoHome} />
            )}
          </div>
        </Overlay>
      )}

      {isDeleteOpen && (
        <Overlay title="Delete account" isDirty={false} compact onClose={() => setIsDeleteOpen(false)}>
          <DeleteAccountPanel onCancel={() => setIsDeleteOpen(false)} onDeleted={closeAndGoHome} />
        </Overlay>
      )}
    </>
  );
}
