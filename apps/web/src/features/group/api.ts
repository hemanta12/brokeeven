import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '../../lib/apiClient';
import type { Group, GroupWithPeople, Person } from './types';

export function groupQueryKey(code: string | undefined) {
  return ['group', code];
}

export function useGroupByCode(code: string | undefined) {
  return useQuery({
    queryKey: groupQueryKey(code),
    queryFn: () => apiFetch<GroupWithPeople>(`/groups/${code}`),
    enabled: Boolean(code)
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupQueryKey(code) })
  });
}

export function useRenamePerson(code: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      apiFetch<Person>(`/people/${id}/name`, { method: 'PATCH', body: JSON.stringify({ name }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupQueryKey(code) })
  });
}
