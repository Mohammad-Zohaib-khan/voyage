import { Link } from 'react-router';
import { RouteMark } from './Wordmark';

export function SiteFooter() {
  return (
    <footer className="bg-forest text-on-forest">
      <div className="page-x container-wide pt-20 pb-10">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-7">
            <p className="flex items-center gap-3 font-serif text-[clamp(3.5rem,2rem+7vw,8rem)] leading-[0.85] tracking-[-0.02em]">
              <RouteMark className="h-[0.55em]" />
              Voyage
            </p>
            <p className="mt-6 max-w-md text-on-forest-muted">
              A planner for considered journeys. Every cost you see is an estimate for planning, never a price, a quote or a booking.
            </p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 text-[0.9375rem] md:col-span-5 md:justify-items-end">
            <ul className="space-y-3">
              <li>
                <Link to="/destinations" className="link">
                  Destinations
                </Link>
              </li>
              <li>
                <Link to="/app/trips" className="link">
                  My trips
                </Link>
              </li>
              <li>
                <Link to="/app/trips/new" className="link">
                  Plan a trip
                </Link>
              </li>
            </ul>
            <ul className="space-y-3">
              <li>
                <Link to="/privacy" className="link">
                  Privacy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="link">
                  Terms
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="mt-16 flex flex-col gap-3 border-t border-white/12 pt-6 text-small text-on-forest-muted md:flex-row md:justify-between">
          <p>Voyage is a portfolio project. It does not sell travel or take payments.</p>
          <p>
            Photography from{' '}
            <a href="https://unsplash.com/?utm_source=voyage_travel_planner&utm_medium=referral" target="_blank" rel="noopener noreferrer" className="link">
              Unsplash
            </a>
            , credited on each page.
          </p>
        </div>
      </div>
    </footer>
  );
}
