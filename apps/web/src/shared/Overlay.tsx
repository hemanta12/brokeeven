import { useEffect, useRef, useState, type ReactNode } from 'react';

import { Button } from '../components/Button';

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
  // Short, non-form panels (Group info, People): float a content-sized card
  // on a scrim instead of a full-height paper sheet.
  compact?: boolean;
  children: ReactNode;
}

// Full-page overlay shell shared by Add/Edit Expense, Settle Up, and the
// Who Are You prompt (APP_FLOW §2.5, §2.7, §2.9): one-X close, focus trap,
// background scroll lock, focus restoration, Escape, safe-area insets, and
// dirty-form discard confirmation (an in-app panel, not window.confirm).
export function Overlay({ title, isDirty, onClose, closeLabel = 'Close', centerTitle = false, compact = false, children }: OverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const requestCloseRef = useRef<() => void>(() => {});
  const performCloseRef = useRef<() => void>(() => {});
  const exitingRef = useRef(false);
  // Lazy initializer runs synchronously on first render, so a reduced-motion
  // viewer never flashes through an invisible "entering" frame.
  const [phase, setPhase] = useState<Phase>(() => (prefersReducedMotion() ? 'visible' : 'entering'));
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  // The keydown listener is bound once (empty deps); this ref keeps the latest
  // value reachable from inside it.
  const confirmingRef = useRef(false);
  confirmingRef.current = confirmingDiscard;

  useEffect(() => {
    if (phase !== 'entering') return;
    const frame = requestAnimationFrame(() => setPhase('visible'));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const performClose = () => {
      if (exitingRef.current) return;
      if (prefersReducedMotion()) {
        onClose();
        return;
      }
      exitingRef.current = true;
      setPhase('exiting');
      setTimeout(onClose, EXIT_MS);
    };
    performCloseRef.current = performClose;
    requestCloseRef.current = () => {
      // A dirty form asks first, in-app — never a browser confirm() dialog.
      if (isDirty) {
        setConfirmingDiscard(true);
        return;
      }
      performClose();
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
        if (confirmingRef.current) {
          setConfirmingDiscard(false);
          return;
        }
        requestCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !container) return;
      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => !element.closest('[inert]')
      );
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
    <div className={compact ? 'overlay overlay-compact' : 'overlay'} role="dialog" aria-modal="true" aria-label={title} ref={containerRef}>
      <div className="overlay-content bg-paper-white" data-phase={phase}>
        <div className={`overlay-header mb-6${centerTitle ? ' overlay-header-centered' : ''}`}>
          <h2 className="heading text-[1.375rem]">{title}</h2>
          <button
            type="button"
            aria-label={confirmingDiscard ? 'Back to editing' : closeLabel}
            onClick={() => (confirmingDiscard ? setConfirmingDiscard(false) : requestCloseRef.current())}
            className="focus-ring flex h-11 w-11 items-center justify-center rounded-full bg-ledger-paper text-xl text-ink-forest transition-transform duration-100 hover:bg-ink-forest/10 active:scale-90"
          >
            {closeLabel === 'Close' ? '×' : closeLabel}
          </button>
        </div>
        {/* flex-1 so a form inside can push its own sticky footer to the
            sheet's bottom edge (see .modal-footer). The form stays mounted
            under the discard prompt — inert, not unmounted — so "Keep editing"
            returns to it with every field still filled in. */}
        <div
          className="mt-4 flex flex-1 flex-col"
          inert={confirmingDiscard || undefined}
          aria-hidden={confirmingDiscard || undefined}
        >
          {children}
        </div>
      </div>

      {/* A small centred card on a scrim, not another full sheet. */}
      {confirmingDiscard && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-forest/45 p-6">
          <div className="w-full max-w-[22rem] rounded-[16px] bg-paper-white p-5 shadow-[0_12px_32px_-8px_color-mix(in_srgb,var(--color-ink-forest)_35%,transparent)]">
            <p className="font-sans text-body font-semibold text-ink-forest">Discard unsaved changes?</p>
            <p className="mt-1 font-sans text-label text-ink-forest/70">Leaving now clears what you entered.</p>
            <div className="mt-5 flex flex-col gap-2">
              <Button variant="secondary" autoFocus onClick={() => setConfirmingDiscard(false)}>
                Keep editing
              </Button>
              <Button
                variant="tertiary"
                onClick={() => {
                  setConfirmingDiscard(false);
                  performCloseRef.current();
                }}
                className="text-debt-red! hover:bg-debt-red/10!"
              >
                Discard changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
