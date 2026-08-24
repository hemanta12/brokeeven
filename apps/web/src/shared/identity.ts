const STORAGE_PREFIX = 'brokeeven:identity:';

export function getIdentity(groupCode: string): string | null {
  try {
    return localStorage.getItem(STORAGE_PREFIX + groupCode);
  } catch {
    return null;
  }
}

export function setIdentity(groupCode: string, personId: string): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + groupCode, personId);
  } catch {
    // localStorage unavailable (private mode, disabled) -- identity is a convenience, safe to skip.
  }
}
