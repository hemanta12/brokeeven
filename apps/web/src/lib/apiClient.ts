export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// A successful write means the API issued a session cookie; if a later response
// still reports no viewer, the browser is refusing to store it (entries won't
// stay editable).
let completedWrite = false;

export function hasCompletedWrite(): boolean {
  return completedWrite;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    ...init,
    // Session cookie identifies the actor (guest or signed in) for ownership.
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers
    }
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(response.status, body?.error ?? response.statusText);
  }

  if (init?.method && init.method !== 'GET') {
    completedWrite = true;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
