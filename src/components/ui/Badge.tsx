import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone =
  | 'neutral'
  | 'accent'
  | 'success'
  | 'warn'
  | 'danger'
  | 'copper';

interface BadgeProps {
  tone?: BadgeTone;
  /** Leading icon — REQUIRED for semantic tones (WCAG 1.4.1: color never alone). */
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Subtle variant (tinted background) vs solid. */
  variant?: 'soft' | 'solid' | 'outline';
}

const soft: Record<BadgeTone, string> = {
  neutral: 'bg-surface-sunk text-text-muted border-[color:var(--border)]',
  accent: 'bg-accent/10 text-accent-ink dark:text-accent border-accent/30',
  success: 'bg-[color:var(--success)]/12 text-[color:var(--success)] border-[color:var(--success)]/35',
  warn: 'bg-[color:var(--warn)]/12 text-[color:var(--warn)] border-[color:var(--warn)]/35',
  danger: 'bg-[color:var(--danger)]/12 text-[color:var(--danger)] border-[color:var(--danger)]/35',
  copper: 'bg-copper/12 text-copper border-copper/35',
};

const solid: Record<BadgeTone, string> = {
  neutral: 'bg-text-muted text-bg border-transparent',
  accent: 'bg-accent text-[#04241f] border-transparent',
  success: 'bg-[color:var(--success)] text-white border-transparent',
  warn: 'bg-[color:var(--warn)] text-white border-transparent',
  danger: 'bg-[color:var(--danger)] text-white border-transparent',
  copper: 'bg-copper text-white border-transparent',
};

const outline: Record<BadgeTone, string> = {
  neutral: 'bg-transparent text-text-muted border-[color:var(--border-strong)]',
  accent: 'bg-transparent text-accent-ink dark:text-accent border-accent/50',
  success: 'bg-transparent text-[color:var(--success)] border-[color:var(--success)]/50',
  warn: 'bg-transparent text-[color:var(--warn)] border-[color:var(--warn)]/50',
  danger: 'bg-transparent text-[color:var(--danger)] border-[color:var(--danger)]/50',
  copper: 'bg-transparent text-copper border-copper/50',
};

/**
 * Badge / chip. For any semantic tone (success/warn/danger) you MUST pass an `icon`
 * and a text label so meaning never travels by color alone (WCAG 1.4.1).
 */
export function Badge({ tone = 'neutral', icon, children, className, variant = 'soft' }: BadgeProps) {
  const map = variant === 'solid' ? solid : variant === 'outline' ? outline : soft;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill border px-3 py-1',
        'text-caption font-semibold [&_svg]:h-3.5 [&_svg]:w-3.5',
        map[tone],
        className,
      )}
    >
      {icon && (
        <span aria-hidden="true" className="inline-flex shrink-0">
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}
