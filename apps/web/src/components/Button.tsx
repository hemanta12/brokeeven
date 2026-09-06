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

// Only what no caller and no size ever needs to override. px-*, rounded-* and
// min-h-* deliberately do NOT live here: while they did, a caller's own
// className lost the utility-vs-utility source-order fight and six call sites
// had reached for `!` to win it. Everything overridable belongs to a map.
const BASE =
  'focus-ring inline-flex items-center justify-center gap-2 font-sans font-semibold transition-transform duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45';

// Pill shaped at every size (sketch 007 house rule). lg is the 52px primary
// the landing page and the sticky bars use; h-13 comes from --spacing, so no
// control-height token is needed.
const SIZE_CLASSES: Record<Size, string> = {
  sm: 'min-h-9 rounded-full px-3.5 text-micro',
  md: 'min-h-11 rounded-full px-4 text-body',
  lg: 'min-h-13 rounded-full px-6 text-body',
  // A square target for a bare glyph, with no inline padding to fight.
  icon: 'size-11 min-h-11 rounded-full p-0 text-body',
};

const VARIANT_CLASSES: Record<Variant, string> = {
  // Reserved for one action per screen (DESIGN_SYSTEM.md §7).
  primary: 'bg-accent text-surface hover:bg-accent-hover',
  // line-strong, not line: this stroke bounds a control, so WCAG 1.4.11
  // needs 3:1 against both the white fill and the tinted page ground.
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-sunken',
  // The bg tint matches the app's other quiet-hover convention (.segment's
  // 6% mix) and works whether the button holds text or just an icon.
  tertiary: 'bg-transparent text-ink hover:bg-ink/8',
};

// Danger is a flag, not a fourth variant, because the app's three destructive
// buttons are one per variant: outlined (sign out), text (discard changes),
// solid (remove a person). It has to compose, not replace.
const DANGER_CLASSES: Record<Variant, string> = {
  primary: 'bg-down text-surface hover:bg-[color-mix(in_srgb,var(--color-down)_88%,black)]',
  secondary: 'border border-down bg-surface text-down hover:bg-down/10',
  tertiary: 'bg-transparent text-down hover:bg-down/10',
};

// Exported so the <Link> CTAs get the identical treatment instead of
// re-deriving it from a copied class string.
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
