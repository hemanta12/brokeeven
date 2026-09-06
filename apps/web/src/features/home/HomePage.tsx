import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { buttonClass } from '../../components/Button';
import { useSession } from '../auth/api';
import { MyGroupsPage } from '../my-groups/MyGroupsPage';
import { formatCurrency } from '../../shared/format';

const START = 44;
const STEP = 1.6;
const TICK_MS = 26;

// The figure resolves to zero once, on load. The mechanism approved in sketch
// 002: finality comes from the number itself rather than from a badge bolted
// onto it, which is what killed the settle stamp in 001.
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
    // Runs once on mount; the countdown floors at zero and self-clears the
    // timer at that point (bug: it used to keep firing forever after
    // reaching zero). Deliberately not keyed on `value`.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span
      // Resting state was text-ink, identical to the h1 right below it, so
      // the two blurred into one black block. text-band (the dark green the
      // proof-band section uses) keeps the same weight and near-black
      // darkness — it isn't a fade to gray, which would read as the number
      // losing its finality rather than settling into it — while giving it
      // a hue the headline doesn't share.
      className={`block font-mono text-zero font-bold tracking-[-0.04em] ${
        value === 0 ? 'text-band' : 'text-accent'
      }`}
    >
      {formatCurrency(value)}
    </span>
  );
}

// iPhone 15 Pro, to scale, rather than a rounded rectangle by eye. The real
// device is a 393x852pt screen inside a 419x878pt body — its bezel is 2.2mm
// on every side, which works out to ~13pt — with a 55pt display corner
// radius, a 125x36.7pt Dynamic Island sitting 11pt below the top of the
// screen, and the button cluster at 132/178/226pt on the left and 193pt on
// the right. The odd pixel values below are those figures at the 208/419
// scale this renders at; keep them proportional if the width ever changes.
//
// The buttons are the cheap part and do the most work: breaking the
// silhouette is most of what separates a phone from a rounded rectangle at
// this size.
function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto mt-5 w-[13rem] max-w-full">
      <span aria-hidden="true" className="absolute -left-[1.5px] top-[65px] h-[13px] w-[1.5px] rounded-l-sm bg-white/25" />
      <span aria-hidden="true" className="absolute -left-[1.5px] top-[88px] h-[17px] w-[1.5px] rounded-l-sm bg-white/25" />
      <span aria-hidden="true" className="absolute -left-[1.5px] top-[112px] h-[17px] w-[1.5px] rounded-l-sm bg-white/25" />
      <span aria-hidden="true" className="absolute -right-[1.5px] top-[96px] h-[31px] w-[1.5px] rounded-r-sm bg-white/25" />

      {/* Bezel is ink, not a light grey: on this band a light shell would
          out-contrast the screenshot it exists to present. The hairline rim
          stands in for the titanium band and is what keeps a near-black
          object legible against dark green. */}
      <div className="rounded-[33.8px] bg-ink p-[6.5px] shadow-float ring-1 ring-white/20">
        <div className="relative overflow-hidden rounded-[27.3px]">
          {children}
          {/* iOS chrome, drawn here rather than baked into the capture: the
              screenshot is a browser viewport and has no status bar of its
              own, and an island floating on app content with no clock beside
              it reads as a blob rather than a phone. The capture leaves iOS's
              59pt safe area empty for exactly this. 9:41 is Apple's own
              convention. */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 flex h-[29.3px] items-center justify-between px-[22px] font-sans text-[8px] font-semibold text-ink"
          >
            <span>9:41</span>
            {/* Signal, wifi, battery — one path each, at a size where the
                cluster registers as status icons and no more. */}
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

// Written to be read at two speeds. Someone skimming reads only the four bold
// lines, and those four alone have to be the whole pitch; the second line is
// there for the one person in ten who slows down. The old list was four
// features ("Live updates", "No account required") — true, and skipped,
// because a feature makes the reader do the work of imagining what it saves
// them. Each of these leads with the annoyance instead and lets the mechanism
// follow.
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

// Replaces "Why it is free". Every section above this one has spent its
// whole effort proving the product is simple — three steps, one real phone
// screen, a plain benefit list — and that is exactly what plants the one
// doubt a real group has: "my situation is messier than that." This section
// answers that doubt instead of the free/paid question (which moves to a
// passing line by the final button, where reassurance belongs, rather than
// its own section, where it reads as defensive).
//
// Phrased as the reader's own words, first person, not a third-person
// description ("someone typed the wrong amount") — naming their exact
// anxiety is what makes the answer land as aimed at them.
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

// "/" means different things to the two kinds of visitor. Signed out, it is
// the pitch. Signed in, the pitch is spent and the useful thing is the work
// itself, so home becomes the group list (which carries those same three
// actions in its header, so nothing is lost and nothing gets buried in the
// profile menu).
export function HomePage() {
  const { isSignedIn, isPending } = useSession();

  // Nothing, not a spinner, while /auth/me resolves. Either alternative is a
  // flash: a spinner that appears and vanishes inside 100ms reads as a
  // glitch, and painting the signed-out pitch first would show returning
  // users a marketing page before swapping it out from under them.
  if (isPending) return null;

  if (isSignedIn) return <MyGroupsPage />;

  return (
    // overflow-hidden clips the bled sections to <main>'s own rounded desktop
    // corners. The bleed itself lives on the inner div, not on <main>: <main>
    // is centered via `margin: 0 auto` (styles.css), and putting -mx/-my
    // there instead pins that same margin to a fixed -1rem, which knocks the
    // whole sheet off-center on any viewport wide enough for centering to
    // matter (>=640px).
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
          // -mx-2 offsets the px-2 hit-area padding so the link still reads
          // centered under the buttons above it (UIUX_rules.md mobile #1:
          // 44px min tap target, this was bare text with none).
          className="focus-ring mt-3.5 inline-flex min-h-11 -mx-2 items-center rounded px-2 font-sans text-label font-medium text-dim underline transition-opacity duration-150 hover:opacity-70 active:opacity-50"
        >
          Have a code? Join a group
        </Link>
      </section>

      {/* border-t border-line: the same hairline the step/benefit rows below
          use, reused here as the seam between hero and page body. Every
          other section boundary on this page marks itself with a
          background or border shift (the dark band, the bordered "Real
          trips are messier" panel) — this was the one boundary carrying
          only whitespace, which read as a gap rather than a new section. */}
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

      {/* The same --color-band the group page header uses: one dark device
          used twice, not two unrelated dark areas. */}
      {/* The one centred section between "How it works" and "What you get",
          both of which stay left-aligned lists. A figure and its caption
          share the artwork's axis — left-aligned headings with a centred
          image left the image reading as adrift between two text blocks
          rather than as the thing being presented. */}
      <section className="bg-band px-5 py-6 text-center text-white">
        <h2 className="heading text-title text-white">This is the whole app</h2>
        {/* Real capture of /g/:code, in a device shell. This reverses sketch
            015's "no phone frame" — the objection there was to a div-based
            mock *of the product*, which is a named tell; a real screenshot
            sitting in a shell is the opposite, it dates and places the thing
            being shown.

            The shell is why the capture is now a whole 390x844 screen rather
            than the old mid-page crop: a frame promises a device, and a crop
            with two cut edges inside one reads as a mistake. Being a full
            screen also finally earns the heading — the Add Expense button
            resting at the bottom is the app admitting it has nothing else.

            Balances, not Expenses. An expense list only proves we can log
            three amounts, which every splitting app does; the caption below
            promises a *resolution*, and this is the screen that delivers
            one. The seeded numbers are chosen so the residual really is four
            dollars — the caption is checkable against the image rather than
            decorative.

            The capture is 393x852 because that is the iPhone's own logical
            resolution: the shell is built to that device's real proportions,
            so the screen inside it has to be that shape or the whole thing
            reads as an approximation. */}
        <PhoneFrame>
          <img
            src="/group-preview.png"
            alt="A whole phone screen of a real group mid-trip: $123.60 spent, your share $41.20, two payments left to settle, and a four dollar debt with a Settle button next to it."
            width={786}
            height={1704}
            loading="lazy"
            className="block w-full"
          />
        </PhoneFrame>
        {/* Capped to the shell's own width and set tighter to it than the
            heading above is: proximity is what makes this read as that
            image's caption rather than as another paragraph. Sits close to
            the section's bottom edge — the padding below it is the only
            thing between it and "What you get". */}
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
              {/* The quotation mark is the only graphic device here — no
                  number, no checkmark. Opening mark is oversized (set with a
                  negative line-height so its own glyph ascender doesn't push
                  the row taller than the plain-text rows around it); the
                  closing mark is inline and full size, same as it would be
                  in a normal sentence. */}
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
        {/* "Free" moved here from its own section: a passing line next to
            the button is where reassurance belongs, a whole section titled
            "Why it is free" reads as pre-emptively defending a question
            not everyone was asking. No "forever" — that's a price promise,
            which isn't something to commit to; not-becoming-an-ad-platform
            is. */}
        <p className="mt-4 font-sans text-micro leading-relaxed text-dim">
          Free, no ads, no account required.
          <span className="block">Built by Hemanta, who got tired of paying to split a pizza.</span>
        </p>
      </section>
      </div>
    </main>
  );
}
