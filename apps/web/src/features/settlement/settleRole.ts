import type { Balance } from '../group/types';

// Which side of the tapped balance the viewer is on. Either side may record the
// settlement; only the wording differs. Null for a balance that isn't theirs.
export type SettleRole = 'pay' | 'receive';

export function settleRole(balance: Pick<Balance, 'fromPersonId' | 'toPersonId'>, viewerId: string | null): SettleRole | null {
  if (!viewerId) return null;
  if (balance.fromPersonId === viewerId) return 'pay';
  if (balance.toPersonId === viewerId) return 'receive';
  return null;
}

export const SETTLE_TITLE: Record<SettleRole, string> = {
  pay: 'Pay back',
  receive: 'Mark as received'
};
