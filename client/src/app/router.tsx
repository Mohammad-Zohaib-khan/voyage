import type { ComponentType } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router';
import { AppShell, PageLoading, RouteError } from '../components/layout/AppShell';
import { RequireAuthOutlet } from '../features/auth/RequireAuth';
import { HomePage } from '../routes/HomePage';

/** Routes are code-split; the home page ships in the main bundle so the first view renders fast. */
const lazyPage = (load: () => Promise<{ default: ComponentType }>) => async () => ({ Component: (await load()).default });

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    hydrateFallbackElement: <PageLoading />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'destinations', lazy: lazyPage(() => import('../routes/DestinationsPage')) },
      { path: 'destinations/:slug', lazy: lazyPage(() => import('../routes/DestinationDetailPage')) },
      { path: 'login', lazy: lazyPage(() => import('../routes/LoginPage')) },
      { path: 'register', lazy: lazyPage(() => import('../routes/RegisterPage')) },
      { path: 'privacy', lazy: lazyPage(() => import('../routes/PrivacyPage')) },
      { path: 'terms', lazy: lazyPage(() => import('../routes/TermsPage')) },
      {
        path: 'app',
        element: <RequireAuthOutlet />,
        children: [
          { index: true, lazy: lazyPage(() => import('../routes/DashboardPage')) },
          { path: 'trips', lazy: lazyPage(() => import('../routes/TripsPage')) },
          { path: 'trips/new', lazy: lazyPage(() => import('../routes/NewTripPage')) },
          { path: 'trips/:tripId', lazy: lazyPage(() => import('../routes/TripDetailPage')) },
          { path: 'saved', lazy: lazyPage(() => import('../routes/SavedPage')) },
          { path: 'settings', lazy: lazyPage(() => import('../routes/SettingsPage')) },
        ],
      },
      { path: '*', lazy: lazyPage(() => import('../routes/NotFoundPage')) },
    ],
  },
];


export const createRouter = () => createBrowserRouter(routes);
