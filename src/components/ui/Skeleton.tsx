import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Round the element fully (avatars, dots). */
  circle?: boolean;
}

/**
 * Skeleton — shimmer placeholder (shimmer defined in index.css, transform-only,
 * neutralised under reduced-motion). Size it to match final content so data arrival
 * causes zero layout shift. Consumers should gate mounting behind ~200ms to avoid a
 * flash on fast responses. Decorative by default (aria-hidden); wrap the region in a
 * container with `aria-busy` + a visually-hidden "Loading…" for screen readers.
 */
export function Skeleton({ circle, className, ...rest }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('skeleton', circle ? 'rounded-full' : 'rounded-sm', className)}
      {...rest}
    />
  );
}
