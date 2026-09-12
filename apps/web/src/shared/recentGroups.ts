// Groups this browser has opened, so a signed-out visitor can find them again from
// the landing page. Signed-in users get the server-backed My Groups list instead.
const STORAGE_KEY = 'brokeeven:recentGroups';
const LIMIT = 10;

export interface RecentGroup {
  code: string;
  name: string;
  // Absent on entries stored before labels were recorded.
  label?: string | null;
  visitedAt: string;
}

export function listRecentGroups(): RecentGroup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is RecentGroup =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as RecentGroup).code === 'string' &&
        typeof (entry as RecentGroup).name === 'string'
    );
  } catch {
    return [];
  }
}

// Newest first, one entry per code.
export function rememberRecentGroup(code: string, name: string, label: string | null = null): void {
  try {
    const next = [
      { code, name, label, visitedAt: new Date().toISOString() },
      ...listRecentGroups().filter((entry) => entry.code !== code)
    ].slice(0, LIMIT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable (private mode); this list is a convenience.
  }
}

export function forgetRecentGroup(code: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(listRecentGroups().filter((entry) => entry.code !== code)));
  } catch {
    // Same as above.
  }
}
