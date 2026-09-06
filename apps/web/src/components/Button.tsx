import { type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'tertiary';
type Size = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonShape {
  variant?: Variant;
  size?: Size;
  danger?: boolean;
  className?: string;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonShape {}

// Only what no caller ever overrides. px-*, rounded-* and min-h-* live in the
// maps below, not here: in BASE they beat a caller's className on source order
// and forced `!` at call sites.
const BASE =
  'focus-ring inline-flex items-center justify-center gap-2 font-sans font-semibold transition-transform duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45';

// Pill-shaped at every size. lg is the 52px primary for the landing page and sticky bars.
const SIZE_CLASSES: Record<Size, string> = {
  sm: 'min-h-9 rounded-full px-3.5 text-micro',
  md: 'min-h-11 rounded-full px-4 text-body',
  lg: 'min-h-13 rounded-full px-6 text-body',
  // Square target for a bare glyph.
  icon: 'size-11 min-h-11 rounded-full p-0 text-body',
};

const VARIANT_CLASSES: Record<Variant, string> = {
  // Reserved for one action per screen (DESIGN_SYSTEM.md §7).
  primary: 'bg-accent text-surface hover:bg-accent-hover',
  // line-strong, not line: this stroke bounds a control, so WCAG 1.4.11
  // needs 3:1 against both the white fill and the tinted page ground.
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-sunken',
  // Quiet-hover tint matching .segment; works for text or icon.
  tertiary: 'bg-transparent text-ink hover:bg-ink/8',
};

// Danger composes with each variant (outlined, text, solid destructive buttons
// all exist), so it is a flag, not a fourth variant.
const DANGER_CLASSES: Record<Variant, string> = {
  primary: 'bg-down text-surface hover:bg-[color-mix(in_srgb,var(--color-down)_88%,black)]',
  secondary: 'border border-down bg-surface text-down hover:bg-down/10',
  tertiary: 'bg-transparent text-down hover:bg-down/10',
};

// Exported so <Link> CTAs share the exact treatment.
export function buttonClass({
  variant = 'primary',
  size = 'md',
  danger = false,
  className = '',
}: ButtonShape = {}): string {
  const skin = danger ? DANGER_CLASSES[variant] : VARIANT_CLASSES[variant];
  return `${BASE} ${SIZE_CLASSES[size]} ${skin} ${className}`;
}

export function Button({
  variant = 'primary',
  size = 'md',
  danger = false,
  className = '',
  ...props
}: ButtonProps) {
  return <button type="button" className={buttonClass({ variant, size, danger, className })} {...props} />;
}
