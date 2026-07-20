import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SegmentOption<T extends string = string> {
  value: T;
  label: ReactNode;
  /** Optional accessible label when `label` is an icon/short glyph. */
  ariaLabel?: string;
}

interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible group label (radiogroup). */
  ariaLabel: string;
  size?: 'sm' | 'md';
  block?: boolean;
  className?: string;
}

/**
 * SegmentedControl — a radiogroup with a sliding active pill (CSS transform,
 * transitioned; neutralised under reduced-motion by the global backstop). Keyboard:
 * arrow keys move selection, matching native radio semantics via roving tabindex.
 */
export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
  block,
  className,
}: SegmentedControlProps<T>) {
  const groupId = useId();
  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const n = options.length;

  const move = (dir: 1 | -1) => {
    const next = (activeIndex + dir + n) % n;
    onChange(options[next].value);
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'relative inline-grid rounded-pill bg-surface-sunk p-1',
        'border border-[color:var(--border)]',
        block && 'w-full',
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          move(1);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          move(-1);
        }
      }}
    >
      {/* Sliding active pill */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1 bottom-1 left-1 rounded-pill bg-accent shadow-e1 transition-transform duration-base ease-out-quart"
        style={{
          width: `calc((100% - 0.5rem) / ${n})`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={opt.ariaLabel}
            id={`${groupId}-${opt.value}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(opt.value)}
            className={cn(
              'relative z-10 inline-flex items-center justify-center rounded-pill font-medium',
              'transition-colors duration-fast whitespace-nowrap',
              size === 'sm' ? 'h-8 px-3 text-body-sm' : 'h-10 px-4 text-body-sm min-w-[44px]',
              selected ? 'text-[#04241f]' : 'text-text-muted hover:text-text',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
