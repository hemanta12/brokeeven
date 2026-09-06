// Short confirmation vibrate (DESIGN_SYSTEM.md §10); no-op where unsupported.
export function vibrateConfirm(): void {
  navigator.vibrate?.(15);
}
