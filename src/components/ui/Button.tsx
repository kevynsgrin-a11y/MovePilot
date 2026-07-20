import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'copper' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface BaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Renders as a react-router <Link> to this path. */
  to?: string;
  /** Renders as a plain <a href> (external / affiliate go links). */
  href?: string;
  /** Show a disabled + shimmer loading state. */
  loading?: boolean;
  /** Stretch to container width. */
  block?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export type ButtonProps = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps>;

const base =
  'inline-flex items-center justify-center gap-2 font-medium select-none ' +
  'transition-[transform,box-shadow,background-color,color] duration-fast ease-standard ' +
  'focus-visible:outline-none disabled:opacity-60 disabled:pointer-events-none ' +
  'active:scale-[0.97] [&_svg]:shrink-0';

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-body-sm rounded-md min-w-[44px]',
  md: 'h-11 px-5 text-body rounded-md',
  lg: 'h-13 px-7 text-body rounded-pill', // 52px primary CTA
};

const variants: Record<ButtonVariant, string> = {
  // Teal fill on dark, navy fill on light — resolved via the --accent/--navy tokens.
  primary:
    'bg-accent text-[#04241f] dark:text-[#04241f] shadow-e2 ' +
    'hover:-translate-y-0.5 hover:shadow-e3',
  secondary:
    'bg-transparent text-text border border-[color:var(--border-strong)] ' +
    'hover:bg-surface-sunk',
  ghost:
    'bg-transparent text-text border border-white/[0.28] hover:bg-white/[0.06]',
  // Premium / Vault only.
  copper:
    'bg-copper text-white shadow-e2 hover:-translate-y-0.5 hover:shadow-e3',
  link:
    'bg-transparent text-accent-ink dark:text-accent px-0 h-auto underline-offset-4 hover:underline',
};

/**
 * Button — polymorphic (button | Link | anchor). One primary per view.
 * Never use `primary` for generic affiliate CTAs; use `copper` only for premium.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', to, href, loading, block, className, children, ...rest },
  ref,
) {
  const classes = cn(
    base,
    variant !== 'link' && sizes[size],
    variants[variant],
    block && 'w-full',
    loading && 'relative overflow-hidden',
    className,
  );

  const content = (
    <>
      {loading && (
        <span
          aria-hidden="true"
          className="absolute inset-0 skeleton opacity-40 pointer-events-none"
        />
      )}
      {children}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} aria-busy={loading || undefined}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={classes} aria-busy={loading || undefined}>
        {content}
      </a>
    );
  }
  return (
    <button ref={ref} className={classes} aria-busy={loading || undefined} disabled={loading || rest.disabled} {...rest}>
      {content}
    </button>
  );
});
