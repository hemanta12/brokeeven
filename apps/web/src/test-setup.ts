import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

import '@testing-library/jest-dom/vitest';

afterEach(cleanup);

// jsdom has no matchMedia, so components that feature-detect
// prefers-reduced-motion (e.g. Overlay) would throw. Defaults to "no preference".
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

// jsdom has no layout, so window.scrollTo throws "Not implemented" and floods
// stderr — ScrollRestoration calls it on every route change.
window.scrollTo = () => {};
