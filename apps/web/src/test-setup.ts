import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

import '@testing-library/jest-dom/vitest';

afterEach(cleanup);

// jsdom doesn't implement matchMedia at all — components that feature-detect
// prefers-reduced-motion (e.g. Overlay's enter/exit transition) would throw
// without this. Defaults to "no preference" (matches: false), same as a
// default browser profile.
window.matchMedia ??= (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  }) as MediaQueryList;
