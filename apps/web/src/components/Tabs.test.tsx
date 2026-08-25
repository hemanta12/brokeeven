import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Tabs } from './Tabs';

const items = [
  { id: 'expenses', label: 'Expenses' },
  { id: 'balances', label: 'Balances' },
];

describe('Tabs', () => {
  it('marks the active tab as selected', () => {
    render(<Tabs items={items} activeId="expenses" onChange={() => {}} label="Group view" />);
    expect(screen.getByRole('tab', { name: 'Expenses' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Balances' })).toHaveAttribute('aria-selected', 'false');
  });

  it('clicking a tab calls onChange with its id', () => {
    const onChange = vi.fn();
    render(<Tabs items={items} activeId="expenses" onChange={onChange} label="Group view" />);
    fireEvent.click(screen.getByRole('tab', { name: 'Balances' }));
    expect(onChange).toHaveBeenCalledWith('balances');
  });

  it('ArrowRight wraps from the last tab back to the first', () => {
    const onChange = vi.fn();
    render(<Tabs items={items} activeId="balances" onChange={onChange} label="Group view" />);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Balances' }), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('expenses');
  });

  it('ArrowLeft wraps from the first tab back to the last', () => {
    const onChange = vi.fn();
    render(<Tabs items={items} activeId="expenses" onChange={onChange} label="Group view" />);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Expenses' }), { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith('balances');
  });
});
