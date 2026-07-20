/**
 * Motion primitives — Blueprint §6. Use with framer-motion's LazyMotion so only the
 * `domAnimation` feature bundle (~5-6kb) ships. Wrap the app once (App.tsx) in
 * <LazyMotion features={domAnimation} strict> and use the `m.*` components (not
 * `motion.*`) everywhere so the full bundle is never pulled in.
 *
 * All meaningful-number tickers and sweeps must snap under prefers-reduced-motion;
 * use `usePrefersReducedMotion()` to gate them (the CSS backstop in index.css also
 * neutralises transitions/animations as a last line of defence).
 */

import { useEffect, useState } from 'react';
import type { SpringOptions, Transition, Variants } from 'framer-motion';

// Easing curves (match the CSS custom properties in index.css)
export const ease = {
  outQuart: [0.22, 1, 0.36, 1] as [number, number, number, number],
  outExpo: [0.16, 1, 0.3, 1] as [number, number, number, number],
  inOutQuart: [0.76, 0, 0.24, 1] as [number, number, number, number],
  outBack: [0.34, 1.4, 0.64, 1] as [number, number, number, number],
  standard: [0.4, 0, 0.2, 1] as [number, number, number, number],
};

// Durations in seconds (framer-motion uses seconds)
export const duration = {
  micro: 0.12,
  fast: 0.18,
  base: 0.28,
  mid: 0.42,
  slow: 0.68,
  xslow: 0.9,
};

// Spring presets (Blueprint §6)
export const spring = {
  soft: { type: 'spring', stiffness: 170, damping: 26, mass: 1 } as Transition,
  snappy: { type: 'spring', stiffness: 320, damping: 30 } as Transition,
  // Monotonic — never overshoot money/weight roll-ups.
  number: { type: 'spring', stiffness: 90, damping: 20, mass: 1.1 } as Transition,
};

/**
 * Raw spring option objects for `useSpring(value, options)` (which takes
 * SpringOptions, NOT a Transition — no `type` field). Mirrors the presets above.
 */
export const springOptions: Record<'soft' | 'snappy' | 'number', SpringOptions> = {
  soft: { stiffness: 170, damping: 26, mass: 1 },
  snappy: { stiffness: 320, damping: 30 },
  number: { stiffness: 90, damping: 20, mass: 1.1 },
};

/** Standard scroll-reveal variant: opacity 0->1 + translateY(32->0). */
export const revealUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.mid, ease: ease.outQuart },
  },
};

/** Stagger container for reveal children (70ms, cap 8 handled by caller). */
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

/** Shared viewport config for whileInView (fires at ~85% vh, once). */
export const inViewOnce = { once: true, margin: '0px 0px -15% 0px' } as const;

/**
 * Reactive `prefers-reduced-motion`. Gate count-up tickers, gauge sweeps, spine
 * draws, parallax, and layoutId slides on this returning true (snap to final).
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
