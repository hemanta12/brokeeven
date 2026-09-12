// Whether this browser has acknowledged a group's "keep the code or link" reminder.
// Set only by that explicit acknowledgement, not by copying: signed-out visitors lose
// the group entirely without the link, so a copy that silently failed must not
// retire the reminder.
const STORAGE_PREFIX = 'brokeeven:inviteSaved:';

export function isInviteSaved(code: string): boolean {
  try {
    return localStorage.getItem(STORAGE_PREFIX + code) === '1';
  } catch {
    // Storage unavailable: nothing to remember the group by either, so keep nagging.
    return false;
  }
}

export function markInviteSaved(code: string): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + code, '1');
  } catch {
    // Reminder stays; harmless.
  }
}
