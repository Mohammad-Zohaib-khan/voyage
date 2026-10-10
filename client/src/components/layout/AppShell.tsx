import { Component, type ErrorInfo, type ReactNode } from 'react';
import { isRouteErrorResponse, Link, Outlet, ScrollRestoration, useLocation, useRouteError } from 'react-router';
import { buttonClasses } from '../ui/buttonStyles';
import { Spinner } from '../ui/Feedback';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

export function SkipToContent() {
  return (
    <a
      href="#main"
      className="sr-only z-[70] rounded-[3px] bg-ink px-4 py-3 font-semibold text-canvas focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >
      Skip to content
    </a>
  );
}

/** Wraps every page: skip link, header, main landmark, footer and scroll restoration. */
export function AppShell() {
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  return (
    <>
      <SkipToContent />
      <SiteHeader />
      <main id="main" tabIndex={-1} className={isHome ? 'outline-none' : 'min-h-[70svh] pt-[4.5rem] outline-none'}>
        <div key={pathname} className="page-fade">
          <Outlet />
        </div>
      </main>
      <SiteFooter />
      <ScrollRestoration />
    </>
  );
}

/** Shown while the first route's code is loading. */
export function PageLoading() {
  return (
    <div className="grid min-h-svh place-items-center bg-canvas text-muted">
      <Spinner size={28} label="Loading Voyage" />
    </div>
  );
}

/** Route-level error page. Never shows stack traces. */
export function RouteError() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <>
      <SkipToContent />
      <SiteHeader />
      <main id="main" className="page-x container-wide min-h-[70svh] pt-40 pb-24">
        <p className="label">{notFound ? 'Page not found' : 'Unexpected error'}</p>
        <h1 className="mt-4 max-w-3xl font-serif text-h1">{notFound ? 'This path doesn’t lead anywhere.' : 'Something went wrong on this page.'}</h1>
        <p className="measure mt-6 text-lead text-muted">
          {notFound ? 'The page may have moved, or the link may be mistyped.' : 'Reload the page to try again. If it keeps happening, start again from the home page.'}
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/" className={buttonClasses('primary')}>
            Back to home
          </Link>
          <Link to="/destinations" className={buttonClasses('secondary')}>
            Browse destinations
          </Link>
        </div>
      </main>
    </>
  );
}

interface BoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  /** Called once when a child throws, e.g. to switch a widget to its fallback for good. */
  onError?: (error: Error) => void;
}

/** Contains a failure to one part of a page (e.g. a widget) so the rest stays usable. */
export class ErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error);
    if (import.meta.env.DEV) {
      // Surface the problem during development only; production keeps the console clean.
      console.error(error, info.componentStack);
    }
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
