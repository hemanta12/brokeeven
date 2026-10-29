import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../test-utils';
import { GroupActivityBell } from './GroupActivityBell';

const GROUP = {
  id: 'g1',
  name: 'Trip',
  label: null,
  joinCode: 'ABC123',
  currency: 'USD',
  settleMode: 'direct',
  createdAt: '2026-01-01',
  people: [],
  expenses: [],
  settlements: [],
  balances: [],
  lastActivityAt: '2026-01-02T00:00:00.000Z'
};

function stubFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) =>
      Promise.resolve(
        new Response(JSON.stringify(url.endsWith('/activity') ? { entries: [] } : GROUP), { status: 200 })
      )
    )
  );
}

describe('GroupActivityBell', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('renders nothing outside a group page', () => {
    stubFetch();
    renderWithProviders(<GroupActivityBell />, { route: '/groups', path: '/groups' });

    expect(screen.queryByRole('button', { name: /Activity/ })).not.toBeInTheDocument();
  });

  it('shows the bell on a group page once the group has loaded, and opens its Activity sheet', async () => {
    stubFetch();
    renderWithProviders(<GroupActivityBell />, { route: '/g/ABC123', path: '/g/:code' });

    fireEvent.click(await screen.findByRole('button', { name: 'Activity' }));

    expect(screen.getByRole('dialog', { name: 'Activity' })).toBeInTheDocument();
  });

  it('flags newer activity, then clears the flag once the sheet is opened', async () => {
    localStorage.setItem('brokeeven:activitySeen:ABC123', '2026-01-01T00:00:00.000Z');
    stubFetch();
    renderWithProviders(<GroupActivityBell />, { route: '/g/ABC123', path: '/g/:code' });

    fireEvent.click(await screen.findByRole('button', { name: 'Activity, new' }));

    expect(localStorage.getItem('brokeeven:activitySeen:ABC123')).toBe('2026-01-02T00:00:00.000Z');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Activity' })).toBeInTheDocument());
  });
});
