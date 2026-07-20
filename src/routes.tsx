import type { ReactElement } from 'react';
import { Landing } from '@/pages/Landing';
import { ToolsHub } from '@/pages/ToolsHub';
import { Volume } from '@/pages/tools/Volume';
import { Weight } from '@/pages/tools/Weight';
import { Distance } from '@/pages/tools/Distance';
import { CarrierCheck } from '@/pages/tools/CarrierCheck';
import { Timeline } from '@/pages/Timeline';
import { Move } from '@/pages/Move';
import { Pricing } from '@/pages/Pricing';
import { Trust } from '@/pages/Trust';
import { Join } from '@/pages/Join';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Vault } from '@/pages/Vault';
import { VaultCompare } from '@/pages/VaultCompare';
import { Alerts } from '@/pages/Alerts';
import { Settings } from '@/pages/Settings';
import { Admin } from '@/pages/Admin';

export type RouteTheme = 'light' | 'dark';

/**
 * Route registry entry.
 *   - `path`    react-router path (supports params, e.g. '/move/:slug').
 *   - `element` the page component element.
 *   - `theme`   preferred theme applied on mount unless the user pinned the toggle
 *               (marketing -> 'dark', logged-in app -> 'light'). Defaults to 'light'.
 *   - `bare`    render WITHOUT the global Header/Footer chrome (auth split screens).
 */
export interface RouteDef {
  path: string;
  element: ReactElement;
  theme?: RouteTheme;
  bare?: boolean;
}

export const routes: RouteDef[] = [
  // Marketing + public tools — dark "cockpit" default.
  { path: '/', element: <Landing />, theme: 'dark' },
  { path: '/tools', element: <ToolsHub />, theme: 'dark' },
  { path: '/tools/volume', element: <Volume />, theme: 'dark' },
  { path: '/tools/weight', element: <Weight />, theme: 'dark' },
  { path: '/tools/distance', element: <Distance />, theme: 'dark' },
  { path: '/tools/carrier-check', element: <CarrierCheck />, theme: 'dark' },
  { path: '/timeline', element: <Timeline />, theme: 'dark' },
  { path: '/move/:slug', element: <Move />, theme: 'dark' },
  { path: '/pricing', element: <Pricing />, theme: 'dark' },
  { path: '/trust', element: <Trust />, theme: 'dark' },

  // Auth — full-bleed split screens, no global chrome.
  { path: '/join', element: <Join />, bare: true },
  { path: '/login', element: <Login />, bare: true },

  // Logged-in app + admin — light "ivory" default.
  { path: '/dashboard', element: <Dashboard />, theme: 'light' },
  { path: '/dashboard/vault', element: <Vault />, theme: 'light' },
  { path: '/dashboard/vault/compare', element: <VaultCompare />, theme: 'light' },
  { path: '/dashboard/alerts', element: <Alerts />, theme: 'light' },
  { path: '/dashboard/settings', element: <Settings />, theme: 'light' },
  { path: '/admin', element: <Admin />, theme: 'light' },
];
