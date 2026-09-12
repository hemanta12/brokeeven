import { useEffect, useRef, useState } from 'react';

import { Button } from '../../components/Button';
import { ErrorState } from '../../shared/RouteStates';
import { useSignIn } from './api';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

interface CodeResponse {
  code?: string;
  state?: string;
  error?: string;
}

interface CodeClient {
  requestCode: () => void;
}

interface GoogleIdentityServices {
  accounts: {
    oauth2: {
      initCodeClient: (config: {
        client_id: string;
        scope: string;
        ux_mode: 'popup';
        state: string;
        callback: (response: CodeResponse) => void;
      }) => CodeClient;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

// Fetched only when this button renders, so anonymous visitors never pay for it.
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

// Google's own four-colour "G", required by their brand guidelines on any
// custom sign-in button.
function GoogleGlyph() {
  return (
    <svg viewBox="0 0 18 18" className="size-4.5 shrink-0" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.581C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 6.293C4.672 4.166 6.656 2.58 9 2.58z"
      />
    </svg>
  );
}

// Our own button drives Google's OAuth popup (initCodeClient), not Google's
// iframe-rendered button. A fresh code client is built per click (fresh state
// nonce) and requestCode() is called synchronously in the same handler —
// the popup, like window.open, only survives inside the original user gesture.
export function SignInButton({ onSuccess }: { onSuccess?: () => void } = {}) {
  const signIn = useSignIn();
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const gisRef = useRef<GoogleIdentityServices | null>(null);
  // A fresh nonce per popup request, checked against the callback's echoed
  // `state` so a stray/forged callback can't be mistaken for this attempt.
  const pendingStateRef = useRef<string | null>(null);
  // The GSI callback is created once on script load, so it reaches onSuccess via
  // a ref; capturing the prop directly would freeze whichever value existed when
  // the script finished loading.
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !window.google) return;
        gisRef.current = window.google;
        setIsReady(true);
      })
      .catch((error: Error) => {
        if (!cancelled) setLoadError(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  function requestSignIn() {
    if (!gisRef.current || !clientId) return;
    const state = crypto.randomUUID();
    pendingStateRef.current = state;
    const codeClient: CodeClient = gisRef.current.accounts.oauth2.initCodeClient({
      client_id: clientId,
      scope: 'openid email profile',
      ux_mode: 'popup',
      state,
      callback: (response) => {
        if (response.state !== pendingStateRef.current) return;
        if (response.code) signIn.mutate(response.code, { onSuccess: () => onSuccessRef.current?.() });
      }
    });
    codeClient.requestCode();
  }

  if (!clientId) {
    return <p className="font-sans text-label text-dim">Sign-in is not configured for this build.</p>;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        variant="secondary"
        size="lg"
        className="w-full"
        disabled={!isReady || signIn.isPending}
        onClick={requestSignIn}
      >
        <GoogleGlyph />
        {signIn.isPending ? 'Signing in…' : 'Continue with Google'}
      </Button>
      {loadError && <ErrorState message={loadError} />}
      {signIn.isError && <ErrorState message={signIn.error.message} />}
    </div>
  );
}
