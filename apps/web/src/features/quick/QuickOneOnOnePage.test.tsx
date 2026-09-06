import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type * as ReactRouterDom from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const navigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDom>();
  return { ...actual, useNavigate: () => navigate };
});

import { getIdentity } from '../../shared/identity';
import { QuickOneOnOnePage } from './QuickOneOnOnePage';

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <QuickOneOnOnePage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('QuickOneOnOnePage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates a 2-person group, sets local identity, and navigates to the group', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ id: 'g1', name: 'You & Bob', label: 'Individual', joinCode: 'ABC123', createdAt: '2026-01-01' }),
            { status: 201 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ id: 'you', groupId: 'g1', name: 'Alice', removedAt: null, createdAt: '2026-01-01' }),
            { status: 201 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ id: 'bob', groupId: 'g1', name: 'Bob', removedAt: null, createdAt: '2026-01-01' }),
            { status: 201 }
          )
        )
    );

    renderPage();

    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByLabelText('Their name'), { target: { value: 'Bob' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/g/ABC123'));
    expect(getIdentity('ABC123')).toBe('you');
  });
});
