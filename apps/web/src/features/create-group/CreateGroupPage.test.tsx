import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type * as ReactRouterDom from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const navigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDom>();
  return { ...actual, useNavigate: () => navigate };
});

import { CreateGroupPage } from './CreateGroupPage';

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CreateGroupPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('CreateGroupPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates the group, adds a person, then continues to the group view', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ id: 'g1', name: 'Trip', label: null, joinCode: 'ABC123', createdAt: '2026-01-01' }),
            { status: 201 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ id: 'p1', groupId: 'g1', name: 'Alice', removedAt: null, createdAt: '2026-01-01' }),
            { status: 201 }
          )
        )
    );

    renderPage();

    fireEvent.change(screen.getByLabelText('Group name'), { target: { value: 'Trip' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create group' }));

    expect(await screen.findByRole('heading', { name: 'Add people to Trip' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Alice' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add person' }));

    expect(await screen.findByText('Alice')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continue to group' }));

    expect(navigate).toHaveBeenCalledWith('/g/ABC123');
  });
});
