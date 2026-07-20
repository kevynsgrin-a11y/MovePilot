import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: ReactNode;
  /** Small helper text below the field. */
  hint?: ReactNode;
  /** Inline error message; also sets aria-invalid + error styling. */
  error?: ReactNode;
  /** Optional adornment rendered inside the field on the leading edge. */
  prefix?: ReactNode;
  /** Optional adornment rendered inside the field on the trailing edge. */
  suffix?: ReactNode;
  /** Visually hide the label but keep it for screen readers. */
  hideLabel?: boolean;
  containerClassName?: string;
}

/**
 * Input — labelled text/number field with hint + error slots. Ships at 16px (no
 * iOS zoom). Pass `inputMode="numeric|decimal"` for calculator fields.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, prefix, suffix, hideLabel, className, containerClassName, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errId = error ? `${inputId}-err` : undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            'text-body-sm font-medium text-text',
            hideLabel && 'sr-only',
          )}
        >
          {label}
        </label>
      )}
      <div
        className={cn(
          'flex items-center gap-2 rounded-sm bg-surface px-3',
          'border-[1.5px] transition-colors duration-fast',
          error ? 'border-[color:var(--danger)]' : 'border-[color:var(--border-strong)]',
          'focus-within:border-[color:var(--accent)]',
        )}
      >
        {prefix && <span className="text-text-faint shrink-0">{prefix}</span>}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(errId, hintId) || undefined}
          className={cn(
            'w-full bg-transparent py-2.5 text-body text-text outline-none',
            'placeholder:text-text-faint',
            className,
          )}
          {...rest}
        />
        {suffix && <span className="text-text-faint shrink-0">{suffix}</span>}
      </div>
      {error ? (
        <p id={errId} className="text-body-sm text-[color:var(--danger)]">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-body-sm text-text-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
