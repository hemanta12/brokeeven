import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../test-utils';
import { SettingsSheet } from './SettingsSheet';
import type { Balance } from './types';

// a -> b -> c nets to one payment, so Fewest payments is on offer.
const chain: Balance[] = [
  { fromPersonId: 'a', toPersonId: 'b', amount: '5.00' },
  { fromPersonId: 'b', toPersonId: 'c', amount: '5.00' }
];

function renderSheet(overrides: Partial<React.ComponentProps<typeof SettingsSheet>> = {}) {
  const props: React.ComponentProps<typeof SettingsSheet> = {
    joinCode: 'ABC123',
    inviteLink: 'https://app.test/g/ABC123',
    name: 'Flat 4B',
    label: 'Home',
    currency: 'USD',
    settleMode: 'direct',
    balances: chain,
    closedAt: null,
    createdByUserId: null,
    owner: null,
    viewerUserId: null,
    canClose: true,
    onRequestClose: vi.fn(),
    onClose: vi.fn(),
    onDeleted: vi.fn(),
    ...overrides
  };
  const fetchMock = vi
    .fn()
    .mockImplementation(() => Promise.resolve(new Response(JSON.stringify({}), { status: 200 })));
  vi.stubGlobal('fetch', fetchMock);
  renderWithProviders(<SettingsSheet {...props} />);
  return { props, fetchMock };
}

describe('SettingsSheet', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('lists the sections in order', () => {
    renderSheet();

    const headings = screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);
    expect(headings).toEqual(['Invite people', 'Group', 'Money · applies to everyone', 'Finish up', 'Danger zone']);
  });

  it('asks before changing currency and writes nothing until confirmed', () => {
    const { fetchMock } = renderSheet();

    fireEvent.change(screen.getByLabelText(/Currency/), { target: { value: 'EUR' } });

    const confirm = screen.getByRole('alertdialog');
    expect(within(confirm).getByText('Show amounts in EUR for everyone?')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the currency PATCH once the change is confirmed', async () => {
    const { fetchMock } = renderSheet();

    fireEvent.change(screen.getByLabelText(/Currency/), { target: { value: 'EUR' } });
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Change for everyone' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/groups/ABC123/currency');
    expect(init.method).toBe('PATCH');
    expect(init.body).toBe(JSON.stringify({ currency: 'EUR' }));
  });

  it('hands Close group to the page', () => {
    const { props } = renderSheet();

    fireEvent.click(screen.getByRole('button', { name: 'Close group' }));

    expect(props.onRequestClose).toHaveBeenCalledTimes(1);
  });

  it('on a closed group locks the fields, offers Reopen, and keeps Delete behind ownership', () => {
    renderSheet({ closedAt: '2026-10-01T00:00:00.000Z', createdByUserId: 'someone-else', viewerUserId: 'me' });

    expect(screen.getByText('Group is closed. Reopen it to change these.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Currency/)).toBeDisabled();
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reopen' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
    expect(screen.getByText("Only the group's owner can delete it.")).toBeInTheDocument();
  });

  it('lets the owner delete a closed group', () => {
    renderSheet({ closedAt: '2026-10-01T00:00:00.000Z', createdByUserId: 'me', viewerUserId: 'me' });

    expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled();
  });

  it('keeps Delete off for an open group, with the reason', () => {
    renderSheet();

    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
    expect(screen.getByText(/Close the group first/)).toBeInTheDocument();
  });
});
