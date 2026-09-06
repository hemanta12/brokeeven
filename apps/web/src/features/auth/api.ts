import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '../../lib/apiClient';
import { listLocalIdentities } from '../../shared/identity';

export interface SessionUser {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  isGuest: boolean;
}

export const sessionQueryKey = ['session'];
export const myGroupsQueryKey = ['myGroups'];

export function useSession() {
  const query = useQuery({
    queryKey: sessionQueryKey,
    queryFn: () => apiFetch<{ user: SessionUser | null }>('/auth/me')
  });
  const user = query.data?.user ?? null;
  return { ...query, user, isSignedIn: user !== null && !user.isGuest };
}

export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const user = await apiFetch<SessionUser>('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ code })
      });
      // Claim the groups this browser already knows about, so the account
      // starts with the history it should have rather than nothing.
      const entries = listLocalIdentities();
      if (entries.length > 0) {
        await apiFetch<{ claimed: number }>('/auth/claim', {
          method: 'POST',
          body: JSON.stringify({ entries })
        });
      }
      return user;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
      await queryClient.invalidateQueries({ queryKey: myGroupsQueryKey });
    }
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<void>('/auth/logout', { method: 'POST' }),
    // invalidateQueries, not clear(): clear() drops the cache outright, which
    // does not make an already-mounted useQuery (e.g. the page you're still
    // on) refetch -- it just keeps showing its last in-memory result until
    // something remounts it, which read as a stale screen until a hard
    // refresh. invalidateQueries marks the same keys stale and refetches any
    // still-active observer immediately, matching useSignIn just above.
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
      await queryClient.invalidateQueries({ queryKey: myGroupsQueryKey });
    }
  });
}

export interface MyGroup {
  id: string;
  name: string;
  label: string | null;
  joinCode: string;
  members: string[];
  memberCount: number;
  expenseCount: number;
  netAmount: string;
  netDirection: 'owe' | 'owed' | 'settled';
  lastActivityAt: string;
}

export function useMyGroups(enabled: boolean) {
  return useQuery({
    queryKey: myGroupsQueryKey,
    queryFn: () => apiFetch<{ groups: MyGroup[] }>('/me/groups'),
    enabled
  });
}

// Tells the server which person the viewer is, so their entries stay theirs on
// every device. Best-effort: identifying yourself is optional, and a 409 just
// means someone got there first.
export async function claimPerson(personId: string): Promise<void> {
  try {
    await apiFetch<unknown>(`/people/${personId}/claim`, { method: 'POST' });
  } catch {
    // Local identity still stands; this only affects cross-device ownership.
  }
}
