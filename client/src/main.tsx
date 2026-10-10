import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { createRouter } from './app/router';
import { ToastProvider } from './components/ui/Toast';
import { PreferencesProvider } from './features/auth/PreferencesEffect';
import { ApiError } from './lib/api';
import './styles/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Retry network blips, not client errors such as 401/404.
      retry: (failureCount, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
    },
    mutations: { retry: false },
  },
});

const router = createRouter();
const root = document.getElementById('root');
if (!root) throw new Error('Root element missing');

// Errors already contained by an error boundary (e.g. an optional 3D scene that could not load)
// are handled by that boundary's fallback; only surface them while developing.
createRoot(root, {
  onCaughtError: (error, info) => {
    if (import.meta.env.DEV) console.error(error, info.componentStack);
  },
}).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <PreferencesProvider>
          <RouterProvider router={router} />
        </PreferencesProvider>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);
