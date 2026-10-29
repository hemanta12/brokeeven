const STORAGE_PREFIX = 'brokeeven:activitySeen:';

// Per-device "last activity I have seen" for a group, as the server's own
// timestamp so a skewed local clock can't hide or fake an unread dot.
export function getActivitySeen(groupCode: string): string | null {
  try {
    return localStorage.getItem(STORAGE_PREFIX + groupCode);
  } catch {
    return null;
  }
}

export function setActivitySeen(groupCode: string, seenAt: string): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + groupCode, seenAt);
  } catch {
    // localStorage unavailable (private mode); the dot is a convenience, safe to skip.
  }
}

// Unread only against a baseline: with nothing stored there is nothing to be
// newer than.
export function hasUnreadActivity(lastActivityAt: string | null | undefined, seenAt: string | null): boolean {
  if (!lastActivityAt || !seenAt) return false;
  return Date.parse(lastActivityAt) > Date.parse(seenAt);
}
