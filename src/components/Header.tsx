import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useTheme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';

const NAV: { label: string; to: string }[] = [
  { label: 'Tools', to: '/tools' },
  { label: 'Timeline', to: '/timeline' },
  { label: 'Verify a Carrier', to: '/tools/carrier-check' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'How It Works', to: '/trust' },
];

function Wordmark() {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="MovePilot home">
      <svg viewBox="0 0 32 24" width="30" height="22" aria-hidden="true" className="shrink-0">
        <path
          d="M4 19 C 11 5, 21 5, 28 19"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="4" cy="19" r="2.4" fill="var(--accent)" />
        <circle cx="28" cy="19" r="2.6" fill="none" stroke="var(--copper)" strokeWidth="2" />
      </svg>
      <span className="font-display text-h5 font-medium tracking-[-0.01em] text-text">MovePilot</span>
    </Link>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-pressed={isDark}
      className="inline-flex h-11 w-11 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-sunk hover:text-text"
    >
      {isDark ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
    </button>
  );
}

/**
 * Header — sticky 64px translucent-on-scroll nav (blueprint §4 global chrome).
 * One `<header>`/`<nav>` per page; skip-link is rendered in App above this.
 */
export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 h-16 w-full transition-colors duration-base',
        scrolled
          ? 'border-b border-[color:var(--border)] bg-[color:var(--bg)]/72 backdrop-blur-[12px]'
          : 'border-b border-transparent',
      )}
    >
      <div className="container-mp flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Wordmark />
          <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/tools'}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2 text-body-sm font-medium transition-colors',
                    isActive ? 'text-text' : 'text-text-muted hover:text-text',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            to="/login"
            className="hidden rounded-md px-3 py-2 text-body-sm font-medium text-text-muted transition-colors hover:text-text sm:inline-flex"
          >
            Sign in
          </Link>
          <Button to="/tools" size="sm" className="hidden sm:inline-flex">
            Start a move — free
          </Button>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-text lg:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          aria-label="Mobile"
          className="border-t border-[color:var(--border)] bg-[color:var(--bg)] lg:hidden"
        >
          <div className="container-mp flex flex-col py-3">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-2 py-3 text-body font-medium text-text-muted hover:bg-surface-sunk hover:text-text"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-[color:var(--border)] pt-3">
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-2 py-3 text-body font-medium text-text-muted"
              >
                Sign in
              </Link>
              <Button to="/tools" block onClick={() => setMobileOpen(false)}>
                Start a move — free
              </Button>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
