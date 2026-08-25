import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from './Badge';
import { Overlay } from '../shared/Overlay';

export function Navbar() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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
          <div className="flex flex-col gap-3">
            {['Name', 'Email', 'Notifications'].map((label) => (
              <div key={label} className="flex items-center justify-between rounded-[10px] bg-ledger-paper px-4 py-3">
                <span className="font-sans text-body text-ink-forest">{label}</span>
                <Badge>Coming soon</Badge>
              </div>
            ))}
          </div>
        </Overlay>
      )}
    </>
  );
}
