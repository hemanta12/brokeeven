import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '../../lib/apiClient';
import { capitalizeFirst } from '../../shared/format';
import { vibrateConfirm } from '../../shared/haptics';
import type { Group, GroupWithPeople, Person } from './types';

export function groupQueryKey(code: string | undefined) {
  return ['group', code];
}

export function useGroupByCode(code: string | undefined) {
  return useQuery({
    queryKey: groupQueryKey(code),
    queryFn: () => apiFetch<GroupWithPeople>(`/groups/${code}`),
    enabled: Boolean(code),
    // Names are normalized on write now, but rows created before that stay as
    // typed — capitalize on read so the whole group view is consistent.
    select: (group): GroupWithPeople => ({
      ...group,
      people: group.people.map((person) => ({ ...person, name: capitalizeFirst(person.name) }))
    })
  });
}

export interface ActivityEntry {
  id: string;
  action:
    | 'expense_add'
    | 'expense_edit'
    | 'expense_delete'
    | 'person_add'
    | 'person_remove'
    | 'person_rename'
    | 'settlement'
    | 'settlement_delete';
  actorName: string | null;
  detail: string | null;
  createdAt: string;
}

// Its own query, not part of the group fetch: the log grows without bound
// while the rest of the payload doesn't, and it's only wanted once someone
// opens the Activity tab — hence `enabled`.
export function useGroupActivity(code: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['group', code, 'activity'],
    queryFn: () => apiFetch<{ entries: ActivityEntry[] }>(`/groups/${code}/activity`),
    enabled: Boolean(code) && enabled
  });
}

export function useCreateGroup() {
  return useMutation({
    mutationFn: (input: { name: string; label?: string }) =>
      apiFetch<Group>('/groups', { method: 'POST', body: JSON.stringify(input) })
  });
}

export function useAddPerson(code?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code: groupCode, name }: { code: string; name: string }) =>
      apiFetch<Person>(`/groups/${groupCode}/people`, { method: 'POST', body: JSON.stringify({ name }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupQueryKey(code) })
  });
}

export function useRemovePerson(code: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (personId: string) => apiFetch<Person>(`/people/${personId}`, { method: 'PATCH' }),
    onSuccess: () => {
      vibrateConfirm();
      return queryClient.invalidateQueries({ queryKey: groupQueryKey(code) });
    }
  });
}

export function useRenamePerson(code: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      apiFetch<Person>(`/people/${id}/name`, { method: 'PATCH', body: JSON.stringify({ name }) }),
    onSuccess: () => {
      vibrateConfirm();
      return queryClient.invalidateQueries({ queryKey: groupQueryKey(code) });
    }
  });
}
