import { useId } from 'react';
import { cn } from '@/lib/cn';

interface RouteLineProps {
  /** Solid = default; dashed = "in progress". */
  variant?: 'solid' | 'dashed';
  /** Draw the endpoint markers (origin ● filled, destination ◎ hollow). */
  endpoints?: boolean;
  /** Animate the stroke drawing in on mount (respects reduced-motion via CSS backstop). */
  animate?: boolean;
  strokeWidth?: number;
  className?: string;
  /** Decorative by default; pass a title to expose it to AT. */
  title?: string;
  style?: React.CSSProperties;
}

/**
 * RouteLine — the signature teal→copper arced great-circle stroke (§2.7.1). Used as
 * the hero motif, section dividers, the timeline spine, and a low-opacity watermark.
 * Decorative (aria-hidden) unless a `title` is provided. Scales to its container.
 */
export function RouteLine({
  variant = 'solid',
  endpoints = true,
  animate = false,
  strokeWidth = 2,
  className,
  title,
  style,
}: RouteLineProps) {
  const id = useId().replace(/:/g, '');
  const gradId = `rl-grad-${id}`;
  // Arced path from lower-left origin up over to lower-right destination.
  const d = 'M 16 96 C 120 24, 280 24, 384 96';

  return (
    <svg
      viewBox="0 0 400 112"
      className={cn('w-full h-auto overflow-visible', className)}
      style={style}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      preserveAspectRatio="none"
    >
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--copper)" />
        </linearGradient>
      </defs>
      <path
        d={d}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={variant === 'dashed' ? '2 8' : undefined}
        pathLength={100}
        className={animate && variant === 'solid' ? 'mp-route-draw' : undefined}
      />
      {endpoints && (
        <>
          <circle cx={16} cy={96} r={5} fill="var(--accent)" />
          <circle cx={384} cy={96} r={5.5} fill="none" stroke="var(--copper)" strokeWidth={2.5} />
        </>
      )}
    </svg>
  );
}
