import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { refreshSession } from '@/api/client';
import { Spinner, Toaster } from '@/components/ui';
import { Layout } from './Layout';
import { RequireAuth } from './RequireAuth';
import { Landing } from '@/pages/Landing';
import { VisualizerHome, VisualizerCategory } from '@/pages/Visualizer';
import { NotFound } from '@/pages/NotFound';

const Problems = lazy(() => import('@/pages/Problems'));
const ProblemDetailPage = lazy(() => import('@/pages/ProblemDetail'));
const Solve = lazy(() => import('@/pages/Solve'));
const SolveResult = lazy(() => import('@/pages/SolveResult'));
const Learn = lazy(() => import('@/pages/Learn'));
const ChallengePage = lazy(() => import('@/pages/Challenge'));
const About = lazy(() => import('@/pages/About'));
const Auth = lazy(() => import('@/pages/Auth'));
const Dashboard = lazy(() => import('@/pages/account/Dashboard'));
const Bookmarks = lazy(() => import('@/pages/account/Bookmarks'));
const History = lazy(() => import('@/pages/account/History'));
const Profile = lazy(() => import('@/pages/account/Profile'));
const Achievements = lazy(() => import('@/pages/account/Achievements'));

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (n, e) => n < 1 && !(e instanceof Error && e.name === 'OfflineError'),
      refetchOnWindowFocus: false,
    },
  },
});

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="visualizer" element={<VisualizerHome />} />
        <Route path="visualizer/:category" element={<VisualizerCategory />} />
        <Route path="problems" element={<Problems />} />
        <Route path="problems/:slug" element={<ProblemDetailPage />} />
        <Route path="solve" element={<Solve />} />
        <Route path="solve/:id" element={<SolveResult />} />
        <Route path="learn" element={<Learn />} />
        <Route path="learn/challenges/:id" element={<ChallengePage />} />
        <Route path="about" element={<About />} />
        <Route path="login" element={<Auth mode="login" />} />
        <Route path="register" element={<Auth mode="register" />} />
        <Route element={<RequireAuth />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="bookmarks" element={<Bookmarks />} />
          <Route path="history" element={<History />} />
          <Route path="profile" element={<Profile />} />
          <Route path="achievements" element={<Achievements />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export function App() {
  useEffect(() => {
    void refreshSession();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense
          fallback={
            <div className="p-10">
              <Spinner />
            </div>
          }
        >
          <AppRoutes />
        </Suspense>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
