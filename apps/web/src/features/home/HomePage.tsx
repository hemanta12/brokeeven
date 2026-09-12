import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { buttonClass } from '../../components/Button';
import { useSession } from '../auth/api';
import { MyGroupsPage } from '../my-groups/MyGroupsPage';
import { formatCurrency } from '../../shared/format';

const START = 44;
const STEP = 1.6;
const TICK_MS = 26;

// The figure counts down to zero once, on load.
function ZeroTicker() {
  const [value, setValue] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : START
  );

  useEffect(() => {
    if (value === 0) return;
    const timer = setInterval(() => {
      setValue((current) => {
        const next = Math.max(0, Number((current - STEP).toFixed(2)));
        if (next === 0) clearInterval(timer);
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(timer);
    // Runs once on mount; the interval self-clears at zero. Not keyed on `value`.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span
      // text-band (not text-ink) so it doesn't blur into the h1 below.
      className={`block font-mono text-zero font-bold tracking-[-0.04em] ${
        value === 0 ? 'text-band' : 'text-accent'
      }`}
    >
      {formatCurrency(value)}
    </span>
  );
}

// iPhone 15 Pro proportions, to scale. The odd pixel values are the device's real
// measurements at the 208/419 render scale — keep them proportional if the width changes.
function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto mt-5 w-[13rem] max-w-full">
      <span aria-hidden="true" className="absolute -left-[1.5px] top-[65px] h-[13px] w-[1.5px] rounded-l-sm bg-white/25" />
      <span aria-hidden="true" className="absolute -left-[1.5px] top-[88px] h-[17px] w-[1.5px] rounded-l-sm bg-white/25" />
      <span aria-hidden="true" className="absolute -left-[1.5px] top-[112px] h-[17px] w-[1.5px] rounded-l-sm bg-white/25" />
      <span aria-hidden="true" className="absolute -right-[1.5px] top-[96px] h-[31px] w-[1.5px] rounded-r-sm bg-white/25" />

      {/* Ink bezel, not grey: a light shell would out-contrast the screenshot. */}
      <div className="rounded-[33.8px] bg-ink p-[6.5px] shadow-float ring-1 ring-white/20">
        <div className="relative overflow-hidden rounded-[27.3px]">
          {children}
          {/* iOS status bar drawn here — the browser capture has none. 9:41 is Apple's convention. */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 flex h-[29.3px] items-center justify-between px-[22px] font-sans text-[8px] font-semibold text-ink"
          >
            <span>9:41</span>
            <svg viewBox="0 0 26 9" className="h-[7px] w-[20px]" fill="currentColor">
              <rect x="0" y="5.5" width="1.6" height="3" rx="0.5" />
              <rect x="2.6" y="4" width="1.6" height="4.5" rx="0.5" />
              <rect x="5.2" y="2.4" width="1.6" height="6.1" rx="0.5" />
              <rect x="7.8" y="1" width="1.6" height="7.5" rx="0.5" />
              <path d="M12.2 3.1a4.6 4.6 0 0 1 5.6 0l-.9 1.1a3.2 3.2 0 0 0-3.8 0zM13.6 5.2a2.4 2.4 0 0 1 2.8 0L15 6.9z" />
              <rect x="19.6" y="1.6" width="5.4" height="6" rx="1.6" opacity="0.4" />
              <rect x="20.4" y="2.5" width="3.4" height="4.2" rx="0.9" />
              <path d="M25.5 3.8v2c.4-.2.5-.5.5-1s-.1-.8-.5-1z" opacity="0.4" />
            </svg>
          </div>
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-[5.5px] h-[18px] w-[62px] -translate-x-1/2 rounded-full bg-ink"
          />
        </div>
      </div>
    </div>
  );
}

function Tick() {
  return (
    <span aria-hidden="true" className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent-wash">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="size-2.5 text-accent">
        <path d="M4 12.5l5.5 5.5L20 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

const STEPS = [
  'Start a group and share the code. No app for them to install.',
  'Add what you paid as you go. Everyone sees it happen live.',
  'Settle up, hit zero, and stop thinking about it.',
];

const BENEFITS = [
  {
    title: 'Nobody has to download anything',
    detail: 'Send the link, they are in. Any phone, any browser, no account, no "I will do it later".',
  },
  {
    title: 'You stop being the group accountant',
    detail: 'Everyone watches the same running total, so nobody has to be told what they owe.',
  },
  {
    title: 'It will not stall halfway through a trip',
    detail: 'No cap on groups, people or expenses. There is no upgrade, so there is nothing to hit.',
  },
  {
    title: 'The cents always add up',
    detail: 'Split three ways, the spare penny goes to somebody. It never quietly vanishes.',
  },
];

const MESSY_QUESTIONS = [
  {
    q: 'Do I still owe for the dinner I skipped?',
    a: 'No. Split it by percent or exact amount, not evenly across everyone.',
  },
  {
    q: 'What if someone bails halfway through the trip?',
    a: 'Remove them and their share redistributes to whoever is still in.',
  },
  {
    q: 'I typed $400 instead of $40.',
    a: 'Fix it. Everyone sees the correction immediately.',
  },
  {
    q: 'They paid me back in cash, not through the app.',
    a: 'Log it with a note and it comes off the balance. Wrong tap? Undo it.',
  },
];

// "/" is the pitch when signed out, the group list when signed in.
export function HomePage() {
  const { isSignedIn, isPending } = useSession();

  // Nothing, not a spinner, while /auth/me resolves: a sub-100ms spinner reads as
  // a glitch, and showing the pitch first would flash it at returning users.
  if (isPending) return null;

  if (isSignedIn) return <MyGroupsPage />;

  return (
    // Bleed lives on the inner div, not <main>: <main> is centered with margin:auto
    // (styles.css), and -mx/-my there would pin it to -1rem and off-center the sheet.
    <main className="overflow-hidden">
      <div className="-mx-4 -my-4 flex flex-col">
      <section className="px-5 pb-10 pt-14 text-center">
        <ZeroTicker />
        <h1 className="mt-3.5 heading text-display">Every group expense ends here.</h1>
        <p className="mx-auto mt-3 max-w-[30ch] font-sans text-body text-dim">
          Split the bill, break even, and get back to being friends.
        </p>
        <div className="mt-7 flex flex-col gap-2.5">
          <Link to="/create" className={buttonClass({ size: 'lg', className: 'w-full' })}>
            Start a group
          </Link>
          <Link to="/quick" className={buttonClass({ variant: 'secondary', size: 'lg', className: 'w-full' })}>
            New 1:1 split
          </Link>
        </div>
        <Link
          to="/join"
          // -mx-2 offsets the px-2 tap-target padding so the link stays visually centered.
          className="focus-ring mt-3.5 inline-flex min-h-11 -mx-2 items-center rounded px-2 font-sans text-label font-medium text-dim underline transition-opacity duration-150 hover:opacity-70 active:opacity-50"
        >
          Have a code? Join a group
        </Link>
      </section>

      <section className="border-t border-line px-5 py-9">
        <h2 className="heading text-title">How it works</h2>
        <p className="mt-1 font-sans text-label text-dim">Three steps. The third one is the point.</p>
        <ol className="mt-4">
          {STEPS.map((step, index) => (
            <li key={step} className="flex gap-3.5 border-t border-line py-3.5 first:border-t-0 first:pt-0">
              <span className="font-mono text-micro font-semibold text-accent">
                {String(index + 1).padStart(2, '0')}
              </span>
              <p className="m-0 font-sans text-label leading-relaxed text-ink">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-band px-5 py-6 text-center text-white">
        <h2 className="heading text-title text-white">This is the whole app</h2>
        {/* Real /g/:code capture in the device shell. The seeded numbers make the
            residual exactly four dollars, so the caption below is checkable against
            the image. */}
        <PhoneFrame>
          <img
            src="/group-preview.png"
            alt="A whole phone screen of a real group mid-trip: $123.60 spent, your share $61.80, one payment left to settle: a four dollar debt with a Settle button next to it."
            width={786}
            height={1704}
            loading="lazy"
            className="block w-full"
          />
        </PhoneFrame>
        <p className="mx-auto mt-3 max-w-[15rem] font-sans text-label text-band-dim">
          Two dinners and a taxi. Nobody is chasing anybody for four dollars.
        </p>
      </section>

      <section className="px-5 py-9">
        <h2 className="heading text-title">What you get</h2>
        <ul className="mt-2">
          {BENEFITS.map(({ title, detail }) => (
            <li
              key={title}
              className="flex items-start gap-3 border-t border-line py-3.5 first:border-t-0"
            >
              <Tick />
              <div className="min-w-0">
                <p className="m-0 font-sans text-label font-semibold text-ink">{title}</p>
                <p className="m-0 mt-1 font-sans text-micro leading-relaxed text-dim">{detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-line bg-surface px-5 py-9">
        <h2 className="heading text-title">Real trips are messier than that</h2>
        <ul className="mt-4">
          {MESSY_QUESTIONS.map(({ q, a }) => (
            <li key={q} className="border-t border-line py-4 first:border-t-0 first:pt-0">
              {/* Opening quote mark is oversized with a negative line-height so its
                  ascender doesn't make this row taller than the plain rows. */}
              <p className="m-0 flex gap-1.5 font-sans text-label font-semibold text-ink">
                <span aria-hidden="true" className="-mt-1 text-[22px] leading-[0.5] text-line-strong">
                  &#8220;
                </span>
                {q}&#8221;
              </p>
              <p className="m-0 mt-1.5 pl-[19px] font-sans text-micro leading-relaxed text-dim">{a}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="px-5 pb-11 pt-9 text-center">
        <Link to="/create" className={buttonClass({ size: 'lg', className: 'mx-auto w-full max-w-[13.75rem]' })}>
          Start a group
        </Link>
        <p className="mt-4 font-sans text-micro leading-relaxed text-dim">
          Free, no ads, no account required.
          <span className="block">Built by Hemanta, who got tired of paying to split a pizza.</span>
        </p>
        <p className="mt-3 font-sans text-micro text-dim">
          <Link to="/privacy" className="underline">
            Privacy
          </Link>
          <span className="mx-2">·</span>
          <Link to="/terms" className="underline">
            Terms
          </Link>
        </p>
      </section>
      </div>
    </main>
  );
}
