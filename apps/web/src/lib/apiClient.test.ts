import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiFetch } from './apiClient';

describe('apiFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns parsed JSON on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: '1' }), { status: 200 }))
    );

    await expect(apiFetch('/groups/ABC')).resolves.toEqual({ id: '1' });
  });

  it('throws ApiError with the server message on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ error: 'Group not found' }), { status: 404 }))
    );

    await expect(apiFetch('/groups/missing')).rejects.toMatchObject(
      new ApiError(404, 'Group not found')
    );
  });
});
