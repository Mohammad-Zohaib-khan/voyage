/**
 * Thin fetch wrapper for the Voyage API.
 * - Always same-origin with credentials (session cookie is HttpOnly; JS never sees it).
 * - Fetches and caches the per-session CSRF token and sends it on every state-changing request.
 * - On a CSRF rejection (e.g. the session expired) it refreshes the token once and retries.
 */

export interface FieldIssue {
  path: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: FieldIssue[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isNetwork() {
    return this.status === 0;
  }
}

interface Envelope<T> {
  data: T;
  error: { code: string; message: string; details?: FieldIssue[] } | null;
  meta: Record<string, unknown> | null;
}

export interface Page<T> {
  items: T;
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const API_BASE = '/api/v1';
let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;

export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

async function fetchCsrfToken(): Promise<string> {
  csrfRequest ??= raw<{ csrfToken: string }>('GET', '/auth/csrf')
    .then(({ data }) => {
      csrfToken = data.csrfToken;
      return data.csrfToken;
    })
    .finally(() => {
      csrfRequest = null;
    });
  return csrfRequest;
}

async function raw<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<Envelope<T>> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET' && csrfToken) headers['X-CSRF-Token'] = csrfToken;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK_ERROR', 'We couldn’t reach Voyage. Check your connection and try again.');
  }

  if (response.status === 204) return { data: undefined as T, error: null, meta: null };

  let payload: Envelope<T> | null;
  try {
    payload = (await response.json()) as Envelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || payload.error) {
    const error = payload?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'UNKNOWN',
      error?.message ?? 'Something went wrong. Try again in a moment.',
      error?.details ?? [],
    );
  }
  return payload;
}

async function send<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<Envelope<T>> {
  if (method !== 'GET' && !csrfToken) await fetchCsrfToken();
  try {
    return await raw<T>(method, path, body, signal);
  } catch (error) {
    if (error instanceof ApiError && error.code === 'CSRF_INVALID') {
      csrfToken = null;
      await fetchCsrfToken();
      return raw<T>(method, path, body, signal);
    }
    throw error;
  }
}

export const api = {
  get: async <T>(path: string, signal?: AbortSignal) => (await send<T>('GET', path, undefined, signal)).data,
  getPage: async <T>(path: string, signal?: AbortSignal): Promise<Page<T>> => {
    const envelope = await send<T>('GET', path, undefined, signal);
    return { items: envelope.data, meta: envelope.meta as Page<T>['meta'] };
  },
  post: async <T>(path: string, body?: unknown) => (await send<T>('POST', path, body ?? {})).data,
  patch: async <T>(path: string, body: unknown) => (await send<T>('PATCH', path, body)).data,
  delete: async <T = undefined>(path: string) => (await send<T>('DELETE', path)).data,
  /** Authorised file download (e.g. CSV). Returns the blob and the server-suggested filename. */
  download: async (path: string): Promise<{ blob: Blob; filename: string }> => {
    let response: Response;
    try {
      response = await fetch(`${API_BASE}${path}`, { credentials: 'same-origin' });
    } catch {
      throw new ApiError(0, 'NETWORK_ERROR', 'We couldn’t reach Voyage. Check your connection and try again.');
    }
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as Envelope<unknown> | null;
      throw new ApiError(response.status, payload?.error?.code ?? 'UNKNOWN', payload?.error?.message ?? 'The export failed. Try again.');
    }
    const disposition = response.headers.get('Content-Disposition') ?? '';
    const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'voyage-trip.csv';
    return { blob: await response.blob(), filename };
  },
};

/** Map server field issues onto react-hook-form fields. */
export function fieldErrors(error: unknown): FieldIssue[] {
  return error instanceof ApiError ? error.details : [];
}

export function errorMessage(error: unknown, fallback = 'Something went wrong. Try again in a moment.'): string {
  if (error instanceof ApiError) return error.message;
  return fallback;
}
