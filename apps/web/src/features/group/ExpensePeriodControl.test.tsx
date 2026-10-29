import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ALL_TIME, monthIndex, type Period } from './expensePeriod';
import { ExpensePeriodControl } from './ExpensePeriodControl';

const OCT_26 = monthIndex(2026, 9);
const DATES = ['2026-10-29', '2026-10-03', '2026-09-21', '2025-12-20'];
const BOUNDS = { min: monthIndex(2025, 11), max: OCT_26 };

function setup(period: Period, overrides: Partial<React.ComponentProps<typeof ExpensePeriodControl>> = {}) {
  const onChange = vi.fn();
  render(
    <ExpensePeriodControl
      period={period}
      thisMonth={OCT_26}
      bounds={BOUNDS}
      years={[2026, 2025]}
      dates={DATES}
      onChange={onChange}
      {...overrides}
    />
  );
  return { onChange };
}

const month = (index: number): Period => ({ kind: 'month', index });

describe('ExpensePeriodControl', () => {
  it('names the period on the pill', () => {
    setup(month(OCT_26));

    expect(screen.getByRole('button', { name: /Oct 2026/ })).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('shows the month arrows only for a single month, and steps through them', () => {
    const { onChange } = setup(month(monthIndex(2026, 8)));

    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(onChange).toHaveBeenLastCalledWith(month(monthIndex(2026, 7)));
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(onChange).toHaveBeenLastCalledWith(month(OCT_26));
  });

  it.each([
    ['All time', ALL_TIME],
    ['a year', { kind: 'year', year: 2026 } as Period],
    ['a range', { kind: 'range', from: 1, to: 2 } as Period]
  ])('has no arrows for %s', (_name, period) => {
    setup(period);

    expect(screen.queryByRole('button', { name: 'Previous month' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next month' })).not.toBeInTheDocument();
  });

  it('disables the arrow at either end of the span', () => {
    setup(month(OCT_26));
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeEnabled();
  });

  it('disables the previous arrow at the earliest expense month', () => {
    setup(month(BOUNDS.min));

    expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled();
  });

  it('offers All time, This month, Year and Custom range, with the active one checked', () => {
    setup(month(OCT_26));

    fireEvent.click(screen.getByRole('button', { name: /Oct 2026/ }));

    const menu = screen.getByRole('menu');
    expect(within(menu).getByRole('menuitemradio', { name: /All time/ })).toHaveAttribute('aria-checked', 'false');
    expect(within(menu).getByRole('menuitemradio', { name: /This month/ })).toHaveAttribute('aria-checked', 'true');
    expect(within(menu).getByRole('menuitem', { name: /Year/ })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: /Custom range/ })).toBeInTheDocument();
  });

  it('picks All time and This month from the menu', () => {
    const { onChange } = setup(month(monthIndex(2026, 8)));

    fireEvent.click(screen.getByRole('button', { name: /Sep 2026/ }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: /This month/ }));
    expect(onChange).toHaveBeenLastCalledWith(month(OCT_26));

    fireEvent.click(screen.getByRole('button', { name: /Sep 2026/ }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: /All time/ }));
    expect(onChange).toHaveBeenLastCalledWith(ALL_TIME);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('drills Year into a same-menu panel of years with counts, and goes back', () => {
    const { onChange } = setup(month(OCT_26));

    fireEvent.click(screen.getByRole('button', { name: /Oct 2026/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Year/ }));

    const menu = screen.getByRole('menu');
    const items = within(menu).getAllByRole('menuitemradio');
    expect(items.map((item) => item.textContent)).toEqual(['20263 expenses', '20251 expense']);

    fireEvent.click(screen.getByRole('menuitem', { name: /^Year$/ }));
    expect(screen.getByRole('menuitemradio', { name: /All time/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: /Year/ }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: /2025/ }));
    expect(onChange).toHaveBeenCalledWith({ kind: 'year', year: 2025 });
  });

  it('closes on Escape and returns focus to the pill', () => {
    setup(ALL_TIME);

    const pill = screen.getByRole('button', { name: /All time/ });
    fireEvent.click(pill);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(pill).toHaveFocus();
  });

  describe('custom range', () => {
    function openRange(period: Period = month(OCT_26)) {
      const result = setup(period);
      fireEvent.click(screen.getByRole('button', { name: new RegExp(period.kind === 'all' ? 'All time' : 'Oct 2026|Aug|Sep') }));
      fireEvent.click(screen.getByRole('menuitem', { name: /Custom range/ }));
      return result;
    }

    it('opens a modal seeded from the current month, with the count in the apply button', () => {
      openRange();

      const dialog = screen.getByRole('dialog', { name: 'Custom range' });
      expect(within(dialog).getByRole('button', { name: /^Show Oct 2026 · 2 expenses$/ })).toBeInTheDocument();
    });

    it('applies a month-to-month range: From then To', () => {
      const { onChange } = openRange();
      const dialog = screen.getByRole('dialog', { name: 'Custom range' });

      fireEvent.click(within(dialog).getByRole('button', { name: /^Aug 2026/ }));
      fireEvent.click(within(dialog).getByRole('button', { name: /^Sep 2026/ }));

      const apply = within(dialog).getByRole('button', { name: /^Show Aug – Sep 2026 · 1 expense$/ });
      fireEvent.click(apply);
      expect(onChange).toHaveBeenCalledWith({ kind: 'range', from: monthIndex(2026, 7), to: monthIndex(2026, 8) });
    });

    it('applies a single picked month as a month period', () => {
      const { onChange } = openRange();
      const dialog = screen.getByRole('dialog', { name: 'Custom range' });

      fireEvent.click(within(dialog).getByRole('button', { name: /^Sep 2026/ }));
      fireEvent.click(within(dialog).getByRole('button', { name: /^Sep 2026/ }));
      fireEvent.click(within(dialog).getByRole('button', { name: /^Show Sep 2026/ }));

      expect(onChange).toHaveBeenCalledWith(month(monthIndex(2026, 8)));
    });

    it('does not allow months after the span', () => {
      openRange();

      expect(screen.getByRole('button', { name: /^Nov 2026/ })).toBeDisabled();
    });

    it('marks months that have expenses', () => {
      openRange();

      expect(screen.getByRole('button', { name: 'Sep 2026, has expenses' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Aug 2026' })).toBeInTheDocument();
    });
  });
});
