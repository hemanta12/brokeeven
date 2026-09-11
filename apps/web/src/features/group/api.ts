import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '../../lib/apiClient';
import { capitalizeFirst } from '../../shared/format';
import { vibrateConfirm } from '../../shared/haptics';
import type { Group, GroupWithPeople, Person, SettleMode } from './types';

export function groupQueryKey(code: string | undefined) {
  return ['group', code];
}

export function useGroupByCode(code: string | undefined) {
  return useQuery({
    queryKey: groupQueryKey(code),
    queryFn: () => apiFetch<GroupWithPeople>(`/groups/${code}`),
    enabled: Boolean(code),
    // Rows created before write-time normalization stay as typed — capitalize on
    // read for consistency.
    select: (group): GroupWithPeople => ({
      ...group,
      // An API that predates the field would otherwise leave settleMode undefined,
      // which reads as "no surface is live" and hides every Settle button.
      settleMode: group.settleMode ?? 'direct',
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
    | 'settlement_delete'
    | 'group_edit'
    | 'group_close'
    | 'group_reopen';
  actorName: string | null;
  detail: string | null;
  createdAt: string;
}

// Own query, not part of the group fetch: the log grows without bound and is
// only wanted when the Activity tab opens (hence `enabled`).
export function useGroupActivity(code: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['group', code, 'activity'],
    queryFn: () => apiFetch<{ entries: ActivityEntry[] }>(`/groups/${code}/activity`),
    enabled: Boolean(code) && enabled
  });
}

export function useCreateGroup() {
  return useMutation({
    mutationFn: (input: { name: string; label?: string; currency?: string }) =>
      apiFetch<Group>('/groups', { method: 'POST', body: JSON.stringify(input) })
  });
}

export function useAddPerson(code?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    // No create-time API for the handle — chains into the existing PATCH once the person exists.
    mutationFn: async ({ code: groupCode, name, paymentHandle }: { code: string; name: string; paymentHandle?: string }) => {
      const person = await apiFetch<Person>(`/groups/${groupCode}/people`, {
        method: 'POST',
        body: JSON.stringify({ name })
      });
      if (!paymentHandle?.trim()) return person;
      return apiFetch<Person>(`/people/${person.id}/handle`, {
        method: 'PATCH',
        body: JSON.stringify({ paymentHandle, code: groupCode })
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupQueryKey(code) })
  });
}

export function useRemovePerson(code: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (personId: string) =>
      apiFetch<Person>(`/people/${personId}`, { method: 'PATCH', body: JSON.stringify({ code }) }),
    onSuccess: () => {
      vibrateConfirm();
      return queryClient.invalidateQueries({ queryKey: groupQueryKey(code) });
    }
  });
}

export function useUpdateGroupCurrency(code: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (currency: string) =>
      apiFetch<Group>(`/groups/${code}/currency`, {
        method: 'PATCH',
        body: JSON.stringify({ currency })
      }),
    onSuccess: () => {
      vibrateConfirm();
      return queryClient.invalidateQueries({ queryKey: groupQueryKey(code) });
    }
  });
}

export function useUpdateSettleMode(code: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settleMode: SettleMode) =>
      apiFetch<Group>(`/groups/${code}/settle-mode`, {
        method: 'PATCH',
        body: JSON.stringify({ settleMode })
      }),
    onSuccess: () => {
      vibrateConfirm();
      return queryClient.invalidateQueries({ queryKey: groupQueryKey(code) });
    }
  });
}

export function useCloseGroup(code: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (forgiveThreshold: number) =>
      apiFetch<Group>(`/groups/${code}/close`, {
        method: 'POST',
        body: JSON.stringify({ forgiveThreshold })
      }),
    onSuccess: () => {
      vibrateConfirm();
      return queryClient.invalidateQueries({ queryKey: groupQueryKey(code) });
    }
  });
}

export function useReopenGroup(code: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<Group>(`/groups/${code}/reopen`, { method: 'POST' }),
    onSuccess: () => {
      vibrateConfirm();
      return queryClient.invalidateQueries({ queryKey: groupQueryKey(code) });
    }
  });
}

export function useUpdatePaymentHandle(code: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, paymentHandle }: { id: string; paymentHandle: string }) =>
      apiFetch<Person>(`/people/${id}/handle`, { method: 'PATCH', body: JSON.stringify({ paymentHandle, code }) }),
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
      apiFetch<Person>(`/people/${id}/name`, { method: 'PATCH', body: JSON.stringify({ name, code }) }),
    onSuccess: () => {
      vibrateConfirm();
      return queryClient.invalidateQueries({ queryKey: groupQueryKey(code) });
    }
  });
}
