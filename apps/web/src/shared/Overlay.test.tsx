import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Overlay } from './Overlay';

describe('Overlay', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('closes on Escape when the form is not dirty', async () => {
    const onClose = vi.fn();
    render(
      <Overlay title="Test" isDirty={false} onClose={onClose}>
        <input />
      </Overlay>
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    // Escape triggers the exit transition first, then onClose after it settles.
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('closes immediately, with no exit delay, when the viewer prefers reduced motion', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    const onClose = vi.fn();
    render(
      <Overlay title="Test" isDirty={false} onClose={onClose}>
        <input />
      </Overlay>
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('confirms discard before closing a dirty form, and respects cancel', () => {
    const onClose = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(
      <Overlay title="Test" isDirty onClose={onClose}>
        <input />
      </Overlay>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes a dirty form once discard is confirmed', async () => {
    const onClose = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(
      <Overlay title="Test" isDirty onClose={onClose}>
        <input />
      </Overlay>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('traps focus by wrapping Tab from the last element to the first', () => {
    render(
      <Overlay title="Test" isDirty={false} onClose={vi.fn()}>
        <input data-testid="only-field" />
      </Overlay>
    );

    const closeButton = screen.getByRole('button', { name: 'Close' });
    const field = screen.getByTestId('only-field');
    field.focus();
    expect(document.activeElement).toBe(field);

    fireEvent.keyDown(document, { key: 'Tab' });

    expect(document.activeElement).toBe(closeButton);
  });
});
