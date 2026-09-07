import { useEffect, useRef, useState, type ReactNode } from 'react';

import { Button } from '../components/Button';

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
// Restrained exit timing (UIUX_rules.md §10): ease-in, no spring physics.
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
  // Float a content-sized card on a scrim instead of a full-height sheet.
  compact?: boolean;
  // Secondary control shown left of the close button (e.g. an Edit icon).
  headerAction?: ReactNode;
  // Swaps Close out for headerAction alone, bypassing Close's exit animation
  // (which assumes the overlay unmounts once it fires). Only meaningful
  // together with headerAction; Escape still runs the real close underneath.
  hideClose?: boolean;
  // Controls on the first row, title centered on its own row beneath.
  stackedHeader?: boolean;
  children: ReactNode;
}

// Full-page overlay shell (Add/Edit Expense, Settle Up, Who Are You): focus trap,
// scroll lock, focus restoration, Escape, safe-area insets, and in-app dirty-form
// discard confirmation (never window.confirm).
export function Overlay({
  title,
  isDirty,
  onClose,
  closeLabel = 'Close',
  centerTitle = false,
  compact = false,
  headerAction,
  hideClose = false,
  stackedHeader = false,
  children
}: OverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const requestCloseRef = useRef<() => void>(() => {});
  const performCloseRef = useRef<() => void>(() => {});
  const exitingRef = useRef(false);
  // Lazy init so a reduced-motion viewer never flashes the invisible "entering" frame.
  const [phase, setPhase] = useState<Phase>(() => (prefersReducedMotion() ? 'visible' : 'entering'));
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  // Keydown listener is bound once; this ref keeps the latest value reachable inside it.
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
      // Dirty form asks first, in-app — never confirm().
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

  const controls = (
    <div className="overlay-header-actions">
      {/* Hidden under the discard prompt so it can't be tabbed to behind the scrim. */}
      {headerAction && !confirmingDiscard ? headerAction : null}
      {/* confirmingDiscard can only exist if Close was reachable to start a
          close in the first place, so it's exempt from hideClose. */}
      {(!hideClose || confirmingDiscard) && (
        <button
          type="button"
          aria-label={confirmingDiscard ? 'Back to editing' : closeLabel}
          onClick={() => (confirmingDiscard ? setConfirmingDiscard(false) : requestCloseRef.current())}
          className="focus-ring flex h-11 w-11 items-center justify-center rounded-full bg-[var(--field-bg,var(--color-surface))] text-xl text-ink transition-transform duration-100 hover:bg-ink/10 active:scale-90"
        >
          {closeLabel === 'Close' ? '×' : closeLabel}
        </button>
      )}
    </div>
  );

  return (
    <div className={compact ? 'overlay overlay-compact' : 'overlay'} role="dialog" aria-modal="true" aria-label={title} ref={containerRef}>
      <div className="overlay-content" data-phase={phase}>
        <div
          className={`overlay-header mb-6${stackedHeader ? ' overlay-header-stacked' : ''}${
            centerTitle && !stackedHeader ? ' overlay-header-centered' : ''
          }${headerAction && !stackedHeader ? ' has-header-action' : ''}`}
        >
          {stackedHeader && controls}
          <h2 className="heading text-title">{title}</h2>
          {!stackedHeader && controls}
        </div>
        {/* Form stays mounted (inert, not unmounted) under the discard prompt so
            "Keep editing" returns to it with every field still filled in. */}
        <div
          className="mt-4 flex flex-1 flex-col"
          inert={confirmingDiscard || undefined}
          aria-hidden={confirmingDiscard || undefined}
        >
          {children}
        </div>
      </div>

      {confirmingDiscard && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-scrim p-6">
          <div className="w-full max-w-[22rem] rounded-card bg-surface p-5 shadow-dialog">
            <p className="font-sans text-body font-semibold text-ink">Discard unsaved changes?</p>
            <p className="mt-1 font-sans text-label text-dim">Leaving now clears what you entered.</p>
            <div className="mt-5 flex flex-col gap-2">
              <Button variant="secondary" autoFocus onClick={() => setConfirmingDiscard(false)}>
                Keep editing
              </Button>
              <Button
                variant="tertiary"
                danger
                onClick={() => {
                  setConfirmingDiscard(false);
                  performCloseRef.current();
                }}
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
