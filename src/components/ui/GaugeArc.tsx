import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { usePrefersReducedMotion } from '@/lib/motion';

export type GaugeVerdict = 'success' | 'warn' | 'danger' | 'neutral';

interface GaugeArcProps {
  /** 0–100 score. `null`/`undefined` renders the empty track. */
  value: number | null | undefined;
  verdict?: GaugeVerdict;
  /** Scanning state — track pulses while the lookup is in flight. */
  scanning?: boolean;
  /** Big centred content (e.g. the score number + label). */
  children?: ReactNode;
  size?: number;
  className?: string;
  /** Accessible description of the meter. */
  ariaLabel?: string;
}

// 270° arc (gap at the bottom). pathLength=100 lets us treat the stroke in score units.
const ARC = 'M 26.06 93.94 A 48 48 0 1 1 93.94 93.94';

const verdictColor: Record<GaugeVerdict, string> = {
  success: 'var(--success)',
  warn: 'var(--warn)',
  danger: 'var(--danger)',
  neutral: 'var(--accent)',
};

/**
 * GaugeArc — the FMCSA safety-score instrument. 0–100 arc with an animated sweep
 * (stroke-dashoffset), stroke color = verdict. Under reduced-motion the fill snaps.
 * Renders as a `meter` for assistive tech.
 */
export function GaugeArc({
  value,
  verdict = 'neutral',
  scanning,
  children,
  size = 160,
  className,
  ariaLabel,
}: GaugeArcProps) {
  const reduced = usePrefersReducedMotion();
  const hasValue = typeof value === 'number' && Number.isFinite(value);
  const target = hasValue ? Math.min(100, Math.max(0, value as number)) : 0;

  // Animate the dash offset from empty -> target after mount / on change.
  const [display, setDisplay] = useState(reduced ? target : 0);
  const raf = useRef<number>();
  useEffect(() => {
    if (reduced || !hasValue) {
      setDisplay(target);
      return;
    }
    // Simple eased tween (transform/opacity budget kept for other motion).
    const start = performance.now();
    const from = display;
    const dur = 680;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(from + (target - from) * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, hasValue, reduced]);

  const stroke = verdictColor[verdict];

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={hasValue ? target : undefined}
      aria-label={ariaLabel}
    >
      <svg viewBox="0 0 120 120" width={size} height={size} className="-rotate-0">
        {/* Track */}
        <path
          d={ARC}
          fill="none"
          stroke="var(--border-strong)"
          strokeWidth={9}
          strokeLinecap="round"
          pathLength={100}
          className={scanning ? 'animate-pulse' : undefined}
          opacity={0.5}
        />
        {/* Value */}
        {hasValue && (
          <path
            d={ARC}
            fill="none"
            stroke={stroke}
            strokeWidth={9}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="100"
            strokeDashoffset={100 - display}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}
