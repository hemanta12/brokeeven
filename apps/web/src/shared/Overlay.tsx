import { useEffect, useRef, useState, type ReactNode } from 'react';

import { Button } from '../components/Button';
import { ErrorState } from './RouteStates';

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
  // Close doesn't render, but Escape still closes. Meaningless without headerAction.
  hideClose?: boolean;
  // Controls on the first row, title centered on its own row beneath.
  stackedHeader?: boolean;
  // Caller-driven confirm (e.g. delete), same scrim/inert/Escape mechanics as the
  // built-in discard prompt. Present = open.
  blockingConfirm?: {
    message: string;
    detail?: string;
    confirmLabel: string;
    cancelLabel?: string;
    danger?: boolean;
    pending?: boolean;
    error?: string;
    onConfirm: () => void;
    onCancel: () => void;
  } | null;
  children: ReactNode;
}

// Full-page overlay shell: focus trap, scroll lock, Escape, in-app discard confirm.
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
  blockingConfirm = null,
  children
}: OverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const requestCloseRef = useRef<() => void>(() => {});
  const performCloseRef = useRef<() => void>(() => {});
  const exitingRef = useRef(false);
  // Lazy init so a reduced-motion viewer never flashes the invisible "entering" frame.
  const [phase, setPhase] = useState<Phase>(() => (prefersReducedMotion() ? 'visible' : 'entering'));
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  // Keydown listener is bound once; these refs keep the latest values reachable inside it.
  const confirmingRef = useRef(false);
  confirmingRef.current = confirmingDiscard;
  const blockingConfirmRef = useRef<typeof blockingConfirm>(null);
  blockingConfirmRef.current = blockingConfirm;

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
        if (blockingConfirmRef.current) {
          blockingConfirmRef.current.onCancel();
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
    // inert, not unmounted — unmounting flickers the header; the scrim covers it anyway.
    <div className="overlay-header-actions" inert={!!blockingConfirm || undefined}>
      {/* headerAction hides outright (not inert) under the discard prompt specifically. */}
      {headerAction && !confirmingDiscard ? headerAction : null}
      {/* confirmingDiscard implies Close was reachable already, so hideClose is exempt here. */}
      {(!hideClose || confirmingDiscard) && (
        <button
          type="button"
          aria-label={confirmingDiscard ? 'Back to editing' : closeLabel}
          onClick={() => (confirmingDiscard ? setConfirmingDiscard(false) : requestCloseRef.current())}
          // Explicit bg-surface, not --field-bg: that token shifts per overlay
          // variant (sunken in compact sheets), which made this button inconsistent
          // across modals.
          className="focus-ring flex h-11 w-11 items-center justify-center rounded-full border border-accent bg-surface text-xl text-ink transition-transform duration-100 hover:bg-accent-wash active:scale-90"
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
        {/* inert, not unmounted — content (a filled form) survives either confirm closing. */}
        <div
          className="mt-4 flex flex-1 flex-col"
          inert={confirmingDiscard || !!blockingConfirm || undefined}
          aria-hidden={confirmingDiscard || !!blockingConfirm || undefined}
        >
          {children}
        </div>
      </div>

      {blockingConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-scrim p-6">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label={blockingConfirm.message}
            className="w-full max-w-[22rem] rounded-card bg-surface p-5 shadow-dialog"
          >
            <p className="font-sans text-body font-semibold text-ink">{blockingConfirm.message}</p>
            {blockingConfirm.detail && (
              <p className="mt-1 font-sans text-label text-dim">{blockingConfirm.detail}</p>
            )}
            <div className="mt-5 flex gap-3">
              <Button
                variant="tertiary"
                className="flex-1"
                autoFocus
                onClick={blockingConfirm.onCancel}
                disabled={blockingConfirm.pending}
              >
                {blockingConfirm.cancelLabel ?? 'Cancel'}
              </Button>
              <Button
                variant="primary"
                danger={blockingConfirm.danger}
                className="flex-1"
                onClick={blockingConfirm.onConfirm}
                disabled={blockingConfirm.pending}
              >
                {blockingConfirm.confirmLabel}
              </Button>
            </div>
            {blockingConfirm.error && <ErrorState message={blockingConfirm.error} />}
          </div>
        </div>
      )}

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
