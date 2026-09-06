import { useMutation } from '@tanstack/react-query';

import { apiFetch } from '../../lib/apiClient';
import type { Group, Person } from '../group/types';
import { setIdentity } from '../../shared/identity';
import { claimPerson } from '../auth/api';

interface QuickOneOnOneInput {
  yourName: string;
  theirName: string;
}

export function useCreateQuickGroup() {
  return useMutation({
    mutationFn: async ({ yourName, theirName }: QuickOneOnOneInput) => {
      const group = await apiFetch<Group>('/groups', {
        method: 'POST',
        body: JSON.stringify({ name: `You & ${theirName}` })
      });
      const you = await apiFetch<Person>(`/groups/${group.joinCode}/people`, {
        method: 'POST',
        body: JSON.stringify({ name: yourName })
      });
      await apiFetch<Person>(`/groups/${group.joinCode}/people`, {
        method: 'POST',
        body: JSON.stringify({ name: theirName })
      });
      setIdentity(group.joinCode, you.id);
      await claimPerson(you.id);
      return group;
    }
  });
}
