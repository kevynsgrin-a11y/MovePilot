import { useEffect, useRef, type ReactNode } from 'react';
import { useSpring } from 'framer-motion';
import { cn } from '@/lib/cn';
import { springOptions, usePrefersReducedMotion } from '@/lib/motion';
import { Skeleton } from './Skeleton';

interface StatTileProps {
  /** Overline label above the figure (e.g. "CUBIC VOLUME"). */
  label: ReactNode;
  /** The numeric value to display. `null`/`undefined` renders an em-dash. */
  value: number | null | undefined;
  /** Format the settled number to a string (default: locale integer). */
  format?: (n: number) => string;
  unit?: ReactNode;
  prefix?: ReactNode;
  /** Secondary line under the figure (e.g. a converted unit). */
  sublabel?: ReactNode;
  /** Show the skeleton state instead of a value. */
  loading?: boolean;
  /** Quiet note shown when value is null and not loading (e.g. "estimate unavailable"). */
  emptyNote?: ReactNode;
  size?: 'md' | 'lg';
  /** Full accessible label for abbreviated figures (e.g. "5,900 pounds"). */
  ariaLabel?: string;
  className?: string;
}

const defaultFormat = (n: number) => Math.round(n).toLocaleString('en-US');

/**
 * StatTile — a fixed-dimension calculator readout with a tabular count-up. The
 * figure springs monotonically to target (springNumber); under reduced-motion it
 * snaps to the final value (never animates the meaningful number). Fixed height =
 * zero CLS when data arrives.
 */
export function StatTile({
  label,
  value,
  format = defaultFormat,
  unit,
  prefix,
  sublabel,
  loading,
  emptyNote,
  size = 'md',
  ariaLabel,
  className,
}: StatTileProps) {
  const reduced = usePrefersReducedMotion();
  const numRef = useRef<HTMLSpanElement>(null);
  const mv = useSpring(0, springOptions.number);

  const hasValue = typeof value === 'number' && Number.isFinite(value);

  useEffect(() => {
    if (!hasValue) return;
    const target = value as number;
    if (reduced) {
      mv.jump(target);
      if (numRef.current) numRef.current.textContent = format(target);
      return;
    }
    mv.set(target);
  }, [value, hasValue, reduced, mv, format]);

  useEffect(() => {
    const unsub = mv.on('change', (latest) => {
      if (numRef.current) numRef.current.textContent = format(latest);
    });
    return () => unsub();
  }, [mv, format]);

  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-md bg-surface-sunk px-4 py-3',
        'border border-[color:var(--border)]',
        className,
      )}
    >
      <span className="text-caption font-semibold uppercase tracking-[0.08em] text-text-faint">
        {label}
      </span>
      {loading ? (
        <Skeleton className={cn('mt-1', size === 'lg' ? 'h-10 w-28' : 'h-8 w-20')} />
      ) : hasValue ? (
        <p
          className={cn(
            'data-hero flex items-baseline gap-1 font-semibold text-text',
            size === 'lg' ? 'text-data-hero' : 'text-h3',
          )}
          aria-label={ariaLabel}
        >
          {prefix && <span className="text-text-muted">{prefix}</span>}
          <span ref={numRef} className="tabular">
            {reduced && hasValue ? format(value as number) : '0'}
          </span>
          {unit && <span className="text-h5 font-medium text-text-muted">{unit}</span>}
        </p>
      ) : (
        <p className={cn('data-hero font-semibold text-text-faint', size === 'lg' ? 'text-data-hero' : 'text-h3')}>
          —
        </p>
      )}
      {sublabel && !loading && <span className="text-body-sm text-text-muted tabular">{sublabel}</span>}
      {!hasValue && !loading && emptyNote && (
        <span className="text-body-sm text-text-faint">{emptyNote}</span>
      )}
    </div>
  );
}
