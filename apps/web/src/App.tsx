import { QueryClientProvider } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Link, Outlet, RouterProvider, ScrollRestoration, createBrowserRouter, useLocation, useNavigationType } from 'react-router-dom';

import { CreateGroupPage } from './features/create-group/CreateGroupPage';
import { GroupPage } from './features/group/GroupPage';
import { HomePage } from './features/home/HomePage';
import { JoinPage } from './features/join/JoinPage';
import { PrivacyPolicyPage } from './features/legal/PrivacyPolicyPage';
import { TermsOfUsePage } from './features/legal/TermsOfUsePage';
import { MyGroupsPage } from './features/my-groups/MyGroupsPage';
import { QuickOneOnOnePage } from './features/quick/QuickOneOnOnePage';
import { queryClient } from './lib/queryClient';
import { Navbar } from './components/Navbar';
import { ErrorBoundary } from './shared/ErrorBoundary';
import { NotFoundState } from './shared/RouteStates';

const SUPPORTS_VIEW_TRANSITIONS = typeof document !== 'undefined' && 'startViewTransition' in document;

function targetPathname(to: unknown): string | null {
  const raw = typeof to === 'string' ? to : (to as { pathname?: string } | null)?.pathname;
  if (raw === undefined) return null;
  return new URL(raw, window.location.href).pathname;
}

// Pages opened with direction 'up' (the Home buttons) rise from the bottom; their
// Back sinks the page back down instead of sliding it right.
const risenPaths = new Set<string>();

// Every in-app navigation runs inside a view transition so the page slides over
// (or off) the one beneath it. Navigating to the page already showing (the logo
// on Home, a query-only change) comes from nowhere, so it gets no transition. The direction rides on <html data-nav> for the CSS;
// a Back control marks its link with state.direction = 'back'. Browser back/forward
// (POP) is handled by the browser and gets no transition.
function withViewTransitions(router: ReturnType<typeof createBrowserRouter>) {
  if (!SUPPORTS_VIEW_TRANSITIONS) return router;
  const navigate = router.navigate.bind(router) as (to: unknown, opts?: Record<string, unknown>) => Promise<void>;
  router.navigate = ((to: unknown, opts?: { state?: { direction?: string } } & Record<string, unknown>) => {
    if (typeof to === 'number') return navigate(to, opts);
    const target = targetPathname(to);
    if (target === null || target === router.state.location.pathname) return navigate(to, opts);
    // 'none': the destination brings its own motion (e.g. a sheet opening over it).
    const direction = opts?.state?.direction;
    if (direction === 'none') return navigate(to, opts);
    let nav = direction === 'back' ? 'back' : direction === 'up' ? 'up' : 'forward';
    if (nav === 'up') risenPaths.add(target);
    if (nav === 'back' && risenPaths.delete(router.state.location.pathname)) nav = 'down';
    document.documentElement.dataset.nav = nav;
    return navigate(to, { ...opts, viewTransition: true });
  }) as typeof router.navigate;
  return router;
}

function Layout() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  // PUSH/REPLACE are animated by the view transition (see withViewTransitions),
  // which keeps the old page on screen; only browsers without the API, a cold
  // load and back/forward (POP) fall back to the page simply rising in.
  const firstRender = useRef(true);
  const entering =
    firstRender.current || navigationType === 'POP' || !SUPPORTS_VIEW_TRANSITIONS ? 'page-enter' : '';
  firstRender.current = false;
  return (
    <>
      <Navbar />
      {/* Keyed by pathname only for /groups: its back button is a <Link> (push,
          not pop), so per-entry keying would never restore it. */}
      <ScrollRestoration
        getKey={(location) => (location.pathname === '/groups' ? location.pathname : location.key)}
      />
      {/* Keyed by path so each route rises in; query/hash changes don't replay it. */}
      <div key={pathname} className={entering || undefined}>
        <Outlet />
      </div>
    </>
  );
}

const routes = [
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/create', element: <CreateGroupPage /> },
      { path: '/join', element: <JoinPage /> },
      { path: '/groups', element: <MyGroupsPage /> },
      { path: '/quick', element: <QuickOneOnOnePage /> },
      { path: '/g/:code', element: <GroupPage /> },
      { path: '/privacy', element: <PrivacyPolicyPage /> },
      { path: '/terms', element: <TermsOfUsePage /> },
      {
        path: '*',
        element: (
          <main>
            <NotFoundState />
            <p className="mt-4 font-sans text-body text-ink">
              <Link to="/" className="underline">
                Back to home
              </Link>
              .
            </p>
          </main>
        )
      }
    ]
  }
];

export function App() {
  // Lazy init, not module scope (freezes on the first URL loaded) or a plain
  // per-render call (remounts the tree).
  const [router] = useState(() => withViewTransitions(createBrowserRouter(routes)));

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
