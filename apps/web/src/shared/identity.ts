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

// Every group this browser has recorded an identity for, sent to the server
// once at sign-in so My Groups is populated from the start rather than empty.
export function listLocalIdentities(): { code: string; personId: string }[] {
  try {
    const entries: { code: string; personId: string }[] = [];
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key?.startsWith(STORAGE_PREFIX)) continue;
      const personId = localStorage.getItem(key);
      if (personId) entries.push({ code: key.slice(STORAGE_PREFIX.length), personId });
    }
    return entries;
  } catch {
    return [];
  }
}
