import { type InputHTMLAttributes } from 'react';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  error?: string;
  helpText?: string;
  // Keeps the label as the accessible name but drops it from the layout, for
  // a field whose placeholder already states its purpose.
  hideLabel?: boolean;
}

// Shared form-field shape: persistent label, on-blur error, help text (DESIGN_SYSTEM.md §9).
export function Field({ label, id, error, helpText, hideLabel = false, className = '', ...inputProps }: FieldProps) {
  const describedBy = error ? `${id}-error` : helpText ? `${id}-help` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'font-sans text-label font-medium text-ink'}>
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        // Placeholder one step down the type scale from typed content (text-body → text-label).
        className={`focus-ring min-h-12 rounded-inner border border-line-strong bg-[var(--field-bg,var(--color-surface))] px-3 font-sans text-body text-ink placeholder:text-label ${className}`}
        {...inputProps}
      />
      {error ? (
        <p id={`${id}-error`} className="inline-in text-label text-down">
          {error}
        </p>
      ) : helpText ? (
        <p id={`${id}-help`} className="text-micro text-dim">
          {helpText}
        </p>
      ) : null}
    </div>
  );
}
