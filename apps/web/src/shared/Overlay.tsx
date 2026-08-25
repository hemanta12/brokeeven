import { useEffect, useRef, useState, type ReactNode } from 'react';

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
// Restrained timing per the app's existing motion principle (Sprint 4.1.5:
// "100-300ms restrained transitions") — ease-out entering, ease-in exiting
// (UIUX_rules.md Core §10), not spring/bounce physics.
const EXIT_MS = 150;

type Phase = 'entering' | 'visible' | 'exiting';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface OverlayProps {
  title: string;
  isDirty: boolean;
  onClose: () => void;
  closeLabel?: string;
  centerTitle?: boolean;
  children: ReactNode;
}

// Full-page overlay shell shared by Add/Edit Expense, Settle Up, and the
// Who Are You prompt (APP_FLOW §2.5, §2.7, §2.9): one-X close, focus trap,
// background scroll lock, focus restoration, Escape, safe-area insets, and
// dirty-form discard confirmation.
export function Overlay({ title, isDirty, onClose, closeLabel = 'Close', centerTitle = false, children }: OverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const requestCloseRef = useRef<() => void>(() => {});
  const exitingRef = useRef(false);
  // Lazy initializer runs synchronously on first render, so a reduced-motion
  // viewer never flashes through an invisible "entering" frame.
  const [phase, setPhase] = useState<Phase>(() => (prefersReducedMotion() ? 'visible' : 'entering'));

  useEffect(() => {
    if (phase !== 'entering') return;
    const frame = requestAnimationFrame(() => setPhase('visible'));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    requestCloseRef.current = () => {
      if (isDirty && !window.confirm('Discard unsaved changes?')) return;
      if (exitingRef.current) return;
      if (prefersReducedMotion()) {
        onClose();
        return;
      }
      exitingRef.current = true;
      setPhase('exiting');
      setTimeout(onClose, EXIT_MS);
    };
  }, [isDirty, onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const container = containerRef.current;
    container?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        requestCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !container) return;
      const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, []);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={title} ref={containerRef}>
      <div className="overlay-content bg-paper-white shadow-lg sm:rounded-lg" data-phase={phase}>
        <div className={`overlay-header mb-6${centerTitle ? ' overlay-header-centered' : ''}`}>
          <h2 className="font-display text-[1.375rem] font-semibold tracking-[-0.02em] leading-[1.15] text-ink-forest">{title}</h2>
          <button
            type="button"
            aria-label={closeLabel}
            onClick={() => requestCloseRef.current()}
            className="focus-ring flex h-11 w-11 items-center justify-center rounded-full bg-ledger-paper text-xl text-ink-forest transition-transform duration-100 hover:bg-ink-forest/10 active:scale-90"
          >
            {closeLabel === 'Close' ? '×' : closeLabel}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
