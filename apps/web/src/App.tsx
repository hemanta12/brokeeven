import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, Outlet, RouterProvider, ScrollRestoration, createBrowserRouter } from 'react-router-dom';

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

function Layout() {
  return (
    <>
      <Navbar />
      {/* Keyed by pathname only for /groups: its back button is a <Link> (push,
          not pop), so per-entry keying would never restore it. */}
      <ScrollRestoration
        getKey={(location) => (location.pathname === '/groups' ? location.pathname : location.key)}
      />
      <Outlet />
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
  const [router] = useState(() => createBrowserRouter(routes));

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
