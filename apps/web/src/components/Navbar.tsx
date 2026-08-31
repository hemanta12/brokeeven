import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Overlay } from '../shared/Overlay';
import { SignInButton } from '../features/auth/SignInButton';
import { useSession, useSignOut } from '../features/auth/api';

export function Navbar() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { user, isSignedIn, isPending: isSessionPending } = useSession();
  const signOut = useSignOut();

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-ink-forest/10 bg-paper-white">
        <div className="mx-auto flex max-w-[32.5rem] items-center justify-between px-4 py-2">
          <Link
            to="/"
            aria-label="Home"
            className="focus-ring flex h-11 w-11 items-center justify-center rounded-md transition-transform duration-100 hover:bg-ink-forest/10 active:scale-90"
          >
            <img src="/icons/icon-192.png" alt="" className="h-8 w-8 rounded-[6px]" />
          </Link>
          <button
            type="button"
            aria-label="Profile"
            onClick={() => setIsProfileOpen(true)}
            className="focus-ring flex h-11 w-11 items-center justify-center rounded-full text-ink-forest transition-transform duration-100 hover:bg-ink-forest/10 active:scale-90"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="12" cy="8" r="3.5" />
              <path d="M4.5 20c1.2-3.6 4.2-5.5 7.5-5.5s6.3 1.9 7.5 5.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      {isProfileOpen && (
        <Overlay title="Profile" isDirty={false} onClose={() => setIsProfileOpen(false)}>
          {isSessionPending ? (
            // Don't fall through to the sign-in branch while /auth/me is in
            // flight: mounting the Google button for someone who turns out to
            // be signed in loads a third-party script for nothing and makes
            // GSI log an origin error against a page that never needed it.
            <p className="font-sans text-body text-ink-forest/60">Loading…</p>
          ) : isSignedIn && user ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-[10px] bg-ledger-paper px-4 py-3">
                <p className="font-sans text-body font-medium text-ink-forest">{user.name ?? 'Signed in'}</p>
                {user.email && <p className="mt-0.5 font-sans text-label text-ink-forest/60">{user.email}</p>}
              </div>
              <Link
                to="/groups"
                onClick={() => setIsProfileOpen(false)}
                className="focus-ring flex min-h-11 items-center rounded-[10px] px-4 font-sans text-body text-ink-forest underline"
              >
                My groups
              </Link>
              <button
                type="button"
                onClick={() => signOut.mutate()}
                disabled={signOut.isPending}
                className="focus-ring flex min-h-11 items-center rounded-[10px] px-4 text-left font-sans text-body text-ink-forest underline"
              >
                {signOut.isPending ? 'Signing out…' : 'Sign out'}
              </button>
              <p className="px-4 font-sans text-label text-ink-forest/60">
                Signing out leaves your entries with your account. Sign back in to edit them.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="font-sans text-body text-ink-forest/80">
                Sign in to keep your groups on every device, and to keep your entries editable if this browser
                forgets you. Everything works without it.
              </p>
              <SignInButton />
            </div>
          )}
        </Overlay>
      )}
    </>
  );
}
