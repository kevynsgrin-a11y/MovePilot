import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/**
 * Theme provider. Marketing pages default DARK ("cockpit"); the logged-in app +
 * tools default LIGHT ("ivory"). A persistent toggle lives in the header and writes
 * `data-theme` on <html>, persisting the *user's explicit choice* to localStorage.
 *
 * Route-level default: a page declares its preferred theme (routes.tsx `theme`
 * field) and calls `useRouteTheme(pref)` — that default applies only until the user
 * flips the toggle, after which the stored preference wins everywhere.
 */

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'mp-theme';

interface ThemeContextValue {
  theme: Theme;
  /** true once the user has explicitly toggled (stored preference exists). */
  userPinned: boolean;
  setTheme: (t: Theme) => void;
  toggle: () => void;
  /** Apply a route's preferred theme unless the user has pinned a choice. */
  applyRouteDefault: (pref: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStored(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

function applyDom(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const stored = readStored();
  const [userPinned, setUserPinned] = useState<boolean>(stored !== null);
  const [theme, setThemeState] = useState<Theme>(() => {
    if (stored) return stored;
    // Match the pre-paint value the inline script set (OS preference / current attr).
    const current = document.documentElement.getAttribute('data-theme');
    if (current === 'light' || current === 'dark') return current;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Keep <html data-theme> in sync.
  useEffect(() => {
    applyDom(theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    setUserPinned(true);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const applyRouteDefault = useCallback(
    (pref: Theme) => {
      // Only route-driven changes take effect when the user hasn't pinned a choice.
      if (!userPinned) setThemeState(pref);
    },
    [userPinned],
  );

  const value = useMemo(
    () => ({ theme, userPinned, setTheme, toggle, applyRouteDefault }),
    [theme, userPinned, setTheme, toggle, applyRouteDefault],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx;
}

/**
 * Call from a page to declare its preferred theme (e.g. marketing pages -> 'dark',
 * app/tool pages -> 'light'). Respects a user's pinned toggle.
 */
export function useRouteTheme(pref: Theme): void {
  const { applyRouteDefault } = useTheme();
  const applied = useRef<Theme | null>(null);
  useEffect(() => {
    if (applied.current !== pref) {
      applyRouteDefault(pref);
      applied.current = pref;
    }
  }, [pref, applyRouteDefault]);
}
