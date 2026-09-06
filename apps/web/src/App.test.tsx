import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';

function renderAt(path: string) {
  window.history.pushState({}, '', path);
  render(<App />);
}

describe('App routing', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // "/" now branches on the session, so it renders nothing until /auth/me
  // answers — the landing is what a signed-out visitor gets, the group list
  // is what a signed-in one gets.
  it('renders the signed-out landing at /', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ user: null }), { status: 200 }))
    );

    renderAt('/');

    expect(await screen.findByRole('heading', { name: 'Every group expense ends here.' })).toBeInTheDocument();
  });

  it('renders the group list at / when signed in', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input);
        const body = url.includes('/auth/me')
          ? { user: { id: 'u1', email: 'a@b.co', name: 'A', avatarUrl: null, isGuest: false } }
          : { groups: [] };
        return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
      })
    );

    renderAt('/');

    expect(await screen.findByRole('heading', { name: 'My groups' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /New group/ })).toBeInTheDocument();
  });

  it('renders the create group page at /create', () => {
    renderAt('/create');

    expect(screen.getByRole('heading', { name: 'Create a Group' })).toBeInTheDocument();
  });

  it('renders the join page at /join', () => {
    renderAt('/join');

    expect(screen.getByRole('heading', { name: 'Join a Group' })).toBeInTheDocument();
  });

  it('renders the quick 1:1 page at /quick', () => {
    renderAt('/quick');

    expect(screen.getByRole('heading', { name: 'Split with One Person' })).toBeInTheDocument();
  });

  it('renders the group page loading state at /g/:code', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));

    renderAt('/g/ABC123');

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders a not-found state for unknown routes', () => {
    renderAt('/nope');

    expect(screen.getByRole('heading', { name: 'Not found' })).toBeInTheDocument();
  });
});
