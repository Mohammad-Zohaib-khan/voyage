import { LayoutDashboard, LogOut, Menu as MenuIcon, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { useLogout, useSession } from '../../features/auth/session';
import { cn } from '../../lib/cn';
import { initials } from '../../lib/text';
import { ButtonLink, IconButton } from '../ui/Button';
import { Menu, menuItemClass } from '../ui/Menu';
import { ThemeToggle, useTheme } from '../ui/ThemeToggle';
import { useToast } from '../ui/toastContext';
import { MobileNavigation } from './MobileNavigation';
import { Wordmark } from './Wordmark';

function useScrolledPast(threshold: number) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > threshold);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [threshold]);
  return scrolled;
}

export function SiteHeader() {
  const { pathname } = useLocation();
  const overHero = pathname === '/';
  const scrolled = useScrolledPast(40);
  const transparent = overHero && !scrolled;
  const { isDark } = useTheme();
  const isDarkHeader = transparent ? isDark : isDark;
  const { user } = useSession();
  const logout = useLogout();
  const navigate = useNavigate();
  const toast = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);

  const signOut = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        toast.success('You’re signed out.');
        void navigate('/');
      },
      onError: () => {
        toast.error('We couldn’t reach the server, but this browser’s session data was cleared.');
        void navigate('/');
      },
    });
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'relative py-2 text-[0.9375rem] font-medium transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-300 hover:after:scale-x-100',
      isActive && 'after:scale-x-100',
      transparent
        ? isDarkHeader
          ? 'text-paper/90 hover:text-paper'
          : 'text-ink/80 hover:text-ink'
        : isActive
        ? 'text-ink'
        : 'text-muted hover:text-ink',
    );

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-[background-color,border-color,color] duration-300',
        transparent ? 'border-b border-transparent bg-transparent' : 'border-b border-line bg-canvas/95 supports-[backdrop-filter]:bg-canvas/88 supports-[backdrop-filter]:backdrop-blur-md',
      )}
    >
      <div className="page-x container-wide flex h-[4.5rem] items-center justify-between gap-6">
        <Wordmark onDark={transparent ? isDarkHeader : false} />

        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          <NavLink to="/destinations" className={navLinkClass}>
            Destinations
          </NavLink>
          <NavLink to="/app/trips" className={navLinkClass}>
            My trips
          </NavLink>
          {user ? (
            <NavLink to="/app/saved" className={navLinkClass}>
              Saved
            </NavLink>
          ) : null}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <Menu
              className="hidden md:block"
              trigger={(props) => (
                <button
                  type="button"
                  {...props}
                  aria-label={`${user.displayName}, account menu`}
                  className={cn(
                    'flex items-center gap-2.5 rounded-full py-1 pr-3 pl-1 text-[0.9375rem] font-medium transition-colors',
                    transparent
                      ? isDarkHeader
                        ? 'text-paper hover:bg-white/10'
                        : 'text-ink hover:bg-ink/5'
                      : 'text-ink hover:bg-sunken',
                  )}
                >
                  <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-olive-fill text-micro font-bold text-paper">
                    {initials(user.displayName)}
                  </span>
                  <span className="max-w-36 truncate">{user.displayName}</span>
                </button>
              )}
            >
              {(close) => (
                <>
                  <p className="truncate border-b border-line px-4 pt-1 pb-3 text-small text-faint">{user.email}</p>
                  <Link to="/app" className={menuItemClass} onClick={close}>
                    <LayoutDashboard aria-hidden="true" className="size-4 text-muted" /> Dashboard
                  </Link>
                  <Link to="/app/settings" className={menuItemClass} onClick={close}>
                    <Settings aria-hidden="true" className="size-4 text-muted" /> Settings
                  </Link>
                  <button
                    type="button"
                    className={menuItemClass}
                    onClick={() => {
                      close();
                      signOut();
                    }}
                  >
                    <LogOut aria-hidden="true" className="size-4 text-muted" /> Sign out
                  </button>
                </>
              )}
            </Menu>
          ) : (
            <div className="hidden items-center gap-5 md:flex">
              <Link
                to="/login"
                className={cn('text-[0.9375rem] font-medium', transparent ? (isDarkHeader ? 'text-paper' : 'text-ink') : 'text-ink', 'link')}
              >
                Sign in
              </Link>
              <ButtonLink
                to="/register"
                size="sm"
                variant={transparent ? (isDarkHeader ? 'inverse' : 'primary') : 'primary'}
              >
                Create account
              </ButtonLink>
            </div>
          )}

          <ThemeToggle
            className={cn(
              transparent
                ? isDarkHeader
                  ? 'text-paper/80 hover:text-paper'
                  : 'text-ink/75 hover:text-ink'
                : 'text-muted hover:text-ink',
            )}
          />
          <IconButton
            label="Open menu"
            className={cn(
              'md:hidden',
              transparent && (isDarkHeader ? 'text-paper hover:bg-white/10 hover:text-paper' : 'text-ink hover:bg-ink/5 hover:text-ink'),
            )}
            onClick={() => setMobileOpen(true)}
            aria-haspopup="dialog"
          >
            <MenuIcon aria-hidden="true" className="size-6" />
          </IconButton>
        </div>
      </div>
      <MobileNavigation open={mobileOpen} onClose={() => setMobileOpen(false)} onSignOut={signOut} />
    </header>
  );
}
