import { type ElementType, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface EyebrowProps {
  children: ReactNode;
  /** teal (accent) — the default for section overlines — or muted/faint. */
  tone?: 'accent' | 'muted' | 'faint';
  /** Render as a pill chip (used for the hero eyebrow). */
  chip?: boolean;
  as?: ElementType;
  className?: string;
}

const tones = {
  accent: 'text-accent-ink dark:text-accent',
  muted: 'text-text-muted',
  faint: 'text-text-faint',
};

/**
 * Eyebrow / Overline — uppercase +0.08em label ("VERIFIED CARRIER", "STEP 3 OF 8",
 * "8 WEEKS OUT"). Teal on both themes uses the AA-safe ink value on light.
 */
export function Eyebrow({ children, tone = 'accent', chip, as, className }: EyebrowProps) {
  const Comp = (as ?? (chip ? 'span' : 'p')) as ElementType;
  return (
    <Comp
      className={cn(
        'text-overline font-bold uppercase tracking-[0.08em]',
        tones[tone],
        chip &&
          'inline-flex items-center gap-1.5 rounded-pill border border-accent/30 bg-accent/10 px-3 py-1',
        className,
      )}
    >
      {children}
    </Comp>
  );
}

/** Alias — same component, for call-sites that prefer the "Overline" name. */
export const Overline = Eyebrow;
