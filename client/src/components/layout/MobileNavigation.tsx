import { NavLink } from 'react-router';
import { useSession } from '../../features/auth/session';
import { cn } from '../../lib/cn';
import { Button, ButtonLink } from '../ui/Button';
import { Dialog } from '../ui/Dialog';

interface MobileNavigationProps {
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
}

export function MobileNavigation({ open, onClose, onSignOut }: MobileNavigationProps) {
  const { user } = useSession();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn('block border-b border-line py-4 font-serif text-[2rem] leading-none transition-colors', isActive ? 'text-accent' : 'text-ink hover:text-accent');

  return (
    <Dialog open={open} onClose={onClose} title="Menu" variant="drawer">
      <nav aria-label="Mobile" className="-mt-2">
        <NavLink to="/" end className={linkClass} onClick={onClose}>
          Home
        </NavLink>
        <NavLink to="/destinations" className={linkClass} onClick={onClose}>
          Destinations
        </NavLink>
        <NavLink to="/app/trips" className={linkClass} onClick={onClose}>
          My trips
        </NavLink>
        {user ? (
          <>
            <NavLink to="/app" end className={linkClass} onClick={onClose}>
              Dashboard
            </NavLink>
            <NavLink to="/app/saved" className={linkClass} onClick={onClose}>
              Saved places
            </NavLink>
            <NavLink to="/app/settings" className={linkClass} onClick={onClose}>
              Settings
            </NavLink>
          </>
        ) : null}
      </nav>
      <div className="mt-8 flex flex-col gap-3">
        {user ? (
          <>
            <p className="text-small text-faint">Signed in as {user.email}</p>
            <Button
              variant="secondary"
              onClick={() => {
                onClose();
                onSignOut();
              }}
            >
              Sign out
            </Button>
          </>
        ) : (
          <>
            <ButtonLink to="/register" onClick={onClose}>Create account</ButtonLink>
            <ButtonLink to="/login" variant="secondary" onClick={onClose}>
              Sign in
            </ButtonLink>
          </>
        )}
      </div>
    </Dialog>
  );
}
