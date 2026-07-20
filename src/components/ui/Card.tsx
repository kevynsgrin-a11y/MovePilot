import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type CardVariant = 'default' | 'raised' | 'frosted' | 'copper';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  /** Adds hover lift (translateY + elevation) — for interactive/linked cards. */
  interactive?: boolean;
  /** Interior padding preset. */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  as?: 'div' | 'article' | 'section' | 'li';
}

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-6', // 24px — blueprint card interior
  lg: 'p-8', // 32px
};

const variants: Record<CardVariant, string> = {
  default: 'bg-surface border border-[color:var(--border)] shadow-e2',
  raised: 'bg-surface-raised border border-[color:var(--border)] shadow-e3',
  // Frosted glass hero card (§3.1). Sits on the dark cockpit canvas.
  frosted:
    'bg-[rgba(11,18,32,0.72)] backdrop-blur-[16px] backdrop-saturate-[1.2] ' +
    'border border-white/[0.12] shadow-e4 text-[#EAF1F7]',
  // Vault / premium — copper gradient border via masked layers.
  copper: 'bg-surface shadow-e2 border border-[color:var(--copper)]/60',
};

/**
 * Card — themed surface container. Use `frosted` for the hero mini-calculator and
 * `copper` only for premium/Vault surfaces.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = 'default', interactive, padding = 'md', as = 'div', className, children, ...rest },
  ref,
) {
  const Comp = as as 'div';
  return (
    <Comp
      ref={ref as never}
      className={cn(
        'rounded-lg',
        variants[variant],
        paddings[padding],
        interactive &&
          'transition-[transform,box-shadow] duration-base ease-out-quart hover:-translate-y-1 hover:shadow-e3',
        className,
      )}
      {...rest}
    >
      {children}
    </Comp>
  );
});
