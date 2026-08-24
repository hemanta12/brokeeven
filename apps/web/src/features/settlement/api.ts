import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '../../lib/apiClient';
import { groupQueryKey } from '../group/api';
import type { Settlement } from '../group/types';

export interface SettlementInput {
  fromPersonId: string;
  toPersonId: string;
  amount: number;
  note: string;
}

export function useCreateSettlement(code: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SettlementInput) =>
      apiFetch<Settlement>(`/groups/${code}/settlements`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupQueryKey(code) })
  });
}
