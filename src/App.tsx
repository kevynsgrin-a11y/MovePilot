import { useEffect, type ReactNode } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { LazyMotion, domAnimation } from 'framer-motion';
import { ThemeProvider, useRouteTheme, type Theme } from '@/lib/theme';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { routes, type RouteDef } from '@/routes';

/**
 * Per-route wrapper: applies the route's preferred theme (respecting a user's pinned
 * toggle) and renders the global chrome unless the route opts out with `bare`.
 */
function RouteView({ theme, bare, children }: { theme?: Theme; bare?: boolean; children: ReactNode }) {
  useRouteTheme(theme ?? 'light');

  if (bare) {
    return <main id="main">{children}</main>;
  }
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}

/** Minimal 404 — a graceful dead-end with links, never a raw error. */
function NotFound() {
  return (
    <div className="container-mp flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="font-display text-h2 text-text">Page not found</p>
      <p className="max-w-prose text-body text-text-muted">
        That route doesn&apos;t exist yet. Try the calculators or head back home.
      </p>
      <div className="flex gap-3">
        <a
          href="/"
          className="rounded-md px-4 py-2 text-body-sm font-medium text-text-muted hover:text-text"
        >
          Home
        </a>
        <a
          href="/tools"
          className="rounded-pill bg-accent px-5 py-2 text-body-sm font-medium text-[#04241f]"
        >
          Open the tools
        </a>
      </div>
    </div>
  );
}

/** Reset scroll to top on navigation (SPA). */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-body-sm focus:font-medium focus:text-[#04241f]"
    >
      Skip to main content
    </a>
  );
}

export function AppRoutes({ list }: { list: RouteDef[] }) {
  return (
    <Routes>
      {list.map((r) => (
        <Route
          key={r.path}
          path={r.path}
          element={
            <RouteView theme={r.theme} bare={r.bare}>
              {r.element}
            </RouteView>
          }
        />
      ))}
      <Route
        path="*"
        element={
          <RouteView theme="light">
            <NotFound />
          </RouteView>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LazyMotion features={domAnimation} strict>
        <BrowserRouter>
          <SkipLink />
          <ScrollToTop />
          <AppRoutes list={routes} />
        </BrowserRouter>
      </LazyMotion>
    </ThemeProvider>
  );
}
