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

  it('renders the homepage at /', () => {
    renderAt('/');

    expect(screen.getByRole('heading', { name: 'BrokeEven' })).toBeInTheDocument();
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
