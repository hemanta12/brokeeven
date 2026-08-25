import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { CreateGroupPage } from './features/create-group/CreateGroupPage';
import { GroupPage } from './features/group/GroupPage';
import { HomePage } from './features/home/HomePage';
import { JoinPage } from './features/join/JoinPage';
import { QuickOneOnOnePage } from './features/quick/QuickOneOnOnePage';
import { queryClient } from './lib/queryClient';
import { Navbar } from './components/Navbar';
import { ErrorBoundary } from './shared/ErrorBoundary';
import { NotFoundState } from './shared/RouteStates';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/create" element={<CreateGroupPage />} />
            <Route path="/join" element={<JoinPage />} />
            <Route path="/quick" element={<QuickOneOnOnePage />} />
            <Route path="/g/:code" element={<GroupPage />} />
            <Route path="*" element={<NotFoundState />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
