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

  it('shows a count badge named for assistive tech, and hides it at zero', () => {
    const { rerender } = render(
      <Tabs
        items={[items[0]!, { ...items[1]!, badge: { count: 2, label: '2 open payments' } }]}
        activeId="expenses"
        onChange={() => {}}
        label="Group view"
      />
    );
    const tab = screen.getByRole('tab', { name: /Balances/ });
    expect(tab).toHaveTextContent('2');
    expect(screen.getByLabelText('2 open payments')).toBeInTheDocument();

    rerender(
      <Tabs
        items={[items[0]!, { ...items[1]!, badge: { count: 0, label: '0 open payments' } }]}
        activeId="expenses"
        onChange={() => {}}
        label="Group view"
      />
    );
    expect(screen.queryByLabelText('0 open payments')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Balances' })).toBeInTheDocument();
  });
});
