import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { vi } from 'vitest';
import { ToastProvider } from '../components/ui/Toast';

type Handler = (url: string, init: RequestInit) => { status: number; body?: unknown } | undefined;

/**
 * Replaces fetch with a router of canned API responses so components exercise their real
 * request, loading, error and success paths without a server.
 */
export function mockApi(handler: Handler) {
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  const fetchMock = vi.fn((input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = init.method ?? 'GET';
    calls.push({ url, method, body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined });
    if (url.endsWith('/auth/csrf')) return Promise.resolve(json(200, { data: { csrfToken: 'test-token' }, error: null, meta: null }));
    const result = handler(url, init) ?? { status: 404, body: { data: null, error: { code: 'NOT_FOUND', message: 'Not found' }, meta: null } };
    return Promise.resolve(json(result.status, result.body));
  });
  vi.stubGlobal('fetch', fetchMock);
  return { calls, fetchMock };
}

function json(status: number, body: unknown) {
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export const ok = (data: unknown, meta: unknown = null) => ({ status: 200, body: { data, error: null, meta } });

export function renderWithProviders(ui: ReactElement, { path = '/', route = '/' }: { path?: string; route?: string } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const router = createMemoryRouter(
    [
      { path, element: ui },
      { path: '*', element: <p>Navigated away</p> },
    ],
    { initialEntries: [route] },
  );
  return {
    client,
    router,
    ...render(
      <QueryClientProvider client={client}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </QueryClientProvider>,
    ),
  };
}
