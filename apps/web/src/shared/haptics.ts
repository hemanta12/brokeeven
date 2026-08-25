// Multimodal confirmation (DESIGN_SYSTEM.md §10): a short vibrate paired
// with the Settle-Up stamp and expense-save confirmation. Feature-detected,
// silently a no-op where unsupported (desktop, iOS Safari, permissions off).
export function vibrateConfirm(): void {
  navigator.vibrate?.(15);
}
