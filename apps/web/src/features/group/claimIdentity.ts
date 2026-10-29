import { setIdentity } from '../../shared/identity';
import { claimPerson } from '../auth/api';

// "This is me" for a group: remembered on this device and linked to the session
// (survives a new device once signed in). The claim is not awaited: a failed
// one costs nothing locally.
export function claimIdentity(code: string, personId: string): void {
  setIdentity(code, personId);
  void claimPerson(personId, code);
}
