import { useEffect, useRef, useState, type CSSProperties, type MutableRefObject, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '../components/Button';
import { readOrigin, originStyle } from './overlayOrigin';
import { ErrorState } from './RouteStates';

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
// Upper bound for a prompt's exit (--dur-exit in styles.css). The overlay itself
// waits for its own computed transition length instead, so variants with
// shorter exits don't leave a blank beat before unmounting.
const EXIT_MS = 320;

function toMs(value: string): number {
  return value.endsWith('ms') ? parseFloat(value) : parseFloat(value) * 1000;
}

// Longest duration + delay among an element's transitions, in ms.
function transitionLength(element: HTMLElement | null): number {
  if (!element) return EXIT_MS;
  const style = getComputedStyle(element);
  const durations = style.transitionDuration.split(',').map(toMs);
  const delays = style.transitionDelay.split(',').map(toMs);
  const total = Math.max(...durations.map((duration, i) => duration + (delays[i % delays.length] ?? 0)));
  return Number.isFinite(total) && total > 0 ? total : EXIT_MS;
}

type Phase = 'entering' | 'visible' | 'exiting';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Holds the last non-null value on screen for `ms` after it goes null, so a
// conditionally rendered layer can play its exit before it unmounts.
function useExitable<T>(value: T | null, ms: number): { value: T | null; exiting: boolean } {
  const [held, setHeld] = useState<T | null>(value);
  useEffect(() => {
    if (value !== null) {
      setHeld(value);
      return;
    }
    if (prefersReducedMotion()) {
      setHeld(null);
      return;
    }
    const timer = setTimeout(() => setHeld(null), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  const shown = value ?? held;
  return { value: shown, exiting: value === null && shown !== null };
}

// Lets a modal close itself after a save through the overlay's exit animation,
// instead of unmounting mid-frame. Pass `closeRef` to <Overlay>; call `close()`.
export function useOverlayClose(onClose: () => void): {
  closeRef: MutableRefObject<(() => void) | null>;
  close: () => void;
} {
  const closeRef = useRef<(() => void) | null>(null);
  return { closeRef, close: () => (closeRef.current ? closeRef.current() : onClose()) };
}

interface OverlayProps {
  title: string;
  isDirty: boolean;
  // Words instead of the × glyph, where skipping is a real choice ("Just looking").
  // Widens the button to a pill; the shape and tone stay the same.
  closeLabel?: string;
  onClose: () => void;
  // Filled with a close that skips the dirty check but plays the exit.
  closeRef?: MutableRefObject<(() => void) | null>;
  centerTitle?: boolean;
  // Float a content-sized card on a scrim instead of a full-height sheet.
  compact?: boolean;
  // Opened from a corner control (navbar, header): the sheet grows briefly out
  // of that corner instead of sliding the whole screen in from an edge.
  anchored?: boolean;
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
  closeRef,
  closeLabel = 'Close',
  centerTitle = false,
  compact = false,
  anchored = false,
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
  // Frozen at mount: the exit returns to where the entrance came from.
  const [origin] = useState(readOrigin);
  const discardLayer = useExitable(confirmingDiscard ? true : null, EXIT_MS);
  const confirmLayer = useExitable(blockingConfirm, EXIT_MS);
  // Keydown listener is bound once; these refs keep the latest values reachable inside it.
  const confirmingRef = useRef(false);
  confirmingRef.current = confirmingDiscard;
  const blockingConfirmRef = useRef<typeof blockingConfirm>(null);
  blockingConfirmRef.current = blockingConfirm;
  if (closeRef) closeRef.current = () => performCloseRef.current();
  useEffect(
    () => () => {
      if (closeRef) closeRef.current = null;
    },
    [closeRef]
  );

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
      // Read after the phase flips and styles resolve, so the exit's own timing counts.
      requestAnimationFrame(() => setTimeout(onClose, transitionLength(containerRef.current)));
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
      // Stacked overlays each listen on document; only the topmost may react.
      const overlays = document.querySelectorAll('.overlay');
      if (container && overlays[overlays.length - 1] !== container) return;
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
          className={`focus-ring flex h-11 shrink-0 items-center justify-center rounded-full border border-accent bg-surface text-ink pressable hover:bg-accent-wash active:scale-90 ${
            confirmingDiscard || closeLabel === 'Close'
              ? 'w-11 text-xl'
              : 'px-4 font-sans text-label font-medium'
          }`}
        >
          {confirmingDiscard || closeLabel === 'Close' ? '×' : closeLabel}
        </button>
      )}
    </div>
  );

  // Portaled to <body>: an overlay rendered inside a transformed, clipped or
  // stacking-context ancestor (the route transition, the summary card) would be
  // positioned and layered against that ancestor instead of the viewport.
  return createPortal(
    <div
      className={compact ? 'overlay overlay-compact' : anchored ? 'overlay overlay-anchored' : 'overlay'}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      ref={containerRef}
      data-phase={phase}
      data-from={origin.from}
      style={originStyle(origin) as CSSProperties}
    >
      <div className="overlay-content">
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

      {confirmLayer.value && (
        <ConfirmLayer exiting={confirmLayer.exiting}>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label={confirmLayer.value.message}
            className="w-full max-w-[22rem] rounded-card bg-surface p-5 shadow-dialog"
          >
            <p className="font-sans text-body font-semibold text-ink">{confirmLayer.value.message}</p>
            {confirmLayer.value.detail && (
              <p className="mt-1 font-sans text-label text-dim">{confirmLayer.value.detail}</p>
            )}
            <div className="mt-5 flex gap-3">
              <Button
                variant="tertiary"
                className="flex-1"
                autoFocus
                onClick={confirmLayer.value.onCancel}
                disabled={confirmLayer.value.pending}
              >
                {confirmLayer.value.cancelLabel ?? 'Cancel'}
              </Button>
              <Button
                variant="primary"
                danger={confirmLayer.value.danger}
                className="flex-1"
                onClick={confirmLayer.value.onConfirm}
                disabled={confirmLayer.value.pending}
              >
                {confirmLayer.value.confirmLabel}
              </Button>
            </div>
            {confirmLayer.value.error && <ErrorState message={confirmLayer.value.error} />}
          </div>
        </ConfirmLayer>
      )}

      {discardLayer.value && (
        <ConfirmLayer exiting={discardLayer.exiting}>
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
        </ConfirmLayer>
      )}
    </div>,
    document.body
  );
}

// Scrim + card for a prompt over an overlay. Grows out of the control that
// raised it (origin read once, at mount) and returns there on exit.
function ConfirmLayer({ exiting, children }: { exiting: boolean; children: ReactNode }) {
  const [origin] = useState(readOrigin);
  return (
    <div
      className={`${exiting ? 'scrim-out pointer-events-none' : 'scrim-in'} fixed inset-0 z-[60] flex items-center justify-center bg-scrim p-6`}
      style={originStyle(origin) as CSSProperties}
      aria-hidden={exiting || undefined}
      inert={exiting || undefined}
    >
      <div className={`${exiting ? 'dialog-out' : 'dialog-in'} flex w-full justify-center`}>{children}</div>
    </div>
  );
}
