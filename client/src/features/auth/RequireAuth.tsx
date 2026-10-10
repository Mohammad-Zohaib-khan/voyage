import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { RetryPanel, Spinner } from '../../components/ui/Feedback';
import { useSession } from './session';

/** Client-side route guard. The API independently enforces authentication on every request. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading, isError, refetch } = useSession();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="grid min-h-[60svh] place-items-center text-muted">
        <Spinner size={28} label="Checking your session" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="page-x container-wide py-16">
        <RetryPanel message="We couldn’t confirm whether you’re signed in." onRetry={() => void refetch()} />
      </div>
    );
  }
  if (!user) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  return <>{children}</>;
}

/** Route element that guards all nested routes. */
export function RequireAuthOutlet() {
  return (
    <RequireAuth>
      <Outlet />
    </RequireAuth>
  );
}
