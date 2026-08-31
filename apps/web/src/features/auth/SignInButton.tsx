import { useEffect, useRef, useState } from 'react';

import { ErrorState } from '../../shared/RouteStates';
import { useSignIn } from './api';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

interface GoogleIdentityServices {
  accounts: {
    id: {
      initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
      renderButton: (parent: HTMLElement, options: Record<string, string | number>) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

// Google's script is fetched only when this button is actually rendered, so
// anonymous visitors never pay for a third-party request they will not use.
function loadGoogleScript(): Promise<void> {
  if (window.google) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Could not reach Google')));
      return;
    }
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not reach Google'));
    document.head.appendChild(script);
  });
}

export function SignInButton() {
  const containerRef = useRef<HTMLDivElement>(null);
  const signIn = useSignIn();
  const [loadError, setLoadError] = useState<string | null>(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: ({ credential }) => signIn.mutate(credential)
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          width: 260
        });
      })
      .catch((error: Error) => {
        if (!cancelled) setLoadError(error.message);
      });

    return () => {
      cancelled = true;
    };
    // Keyed on clientId alone: signIn.mutate is stable for the life of the
    // hook, and re-running this would render a second Google button.
  }, [clientId]);

  if (!clientId) {
    return <p className="font-sans text-label text-ink-forest/60">Sign-in is not configured for this build.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div ref={containerRef} />
      {loadError && <ErrorState message={loadError} />}
      {signIn.isPending && <p className="font-sans text-label text-ink-forest/60">Signing in…</p>}
      {signIn.isError && <ErrorState message={signIn.error.message} />}
    </div>
  );
}
