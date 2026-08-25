import { type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'tertiary';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  // Reserved for one action per screen (DESIGN_SYSTEM.md §7) — e.g. Add
  // Expense on Group View.
  primary:
    'bg-ink-forest text-paper-white hover:bg-[color-mix(in_srgb,var(--color-ink-forest)_92%,black)] active:scale-[0.97]',
  secondary:
    'border border-ink-forest text-ink-forest bg-transparent hover:bg-ledger-paper active:scale-[0.97]',
  tertiary: 'text-ink-forest bg-transparent hover:underline',
};

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={`focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 font-sans font-semibold transition-transform duration-150 disabled:cursor-not-allowed disabled:opacity-45 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
