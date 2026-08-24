import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Overlay } from './Overlay';

describe('Overlay', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('closes on Escape when the form is not dirty', () => {
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

  it('closes a dirty form once discard is confirmed', () => {
    const onClose = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(
      <Overlay title="Test" isDirty onClose={onClose}>
        <input />
      </Overlay>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
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
