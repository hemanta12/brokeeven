import { useState } from 'react';

// DESIGN_SYSTEM.md §9: validation fires on blur, not on keystroke.
export function useBlurValidation() {
  const [blurred, setBlurred] = useState<Record<string, boolean>>({});

  function touch(field: string) {
    setBlurred((current) => ({ ...current, [field]: true }));
  }

  // Clears the touched flag after a programmatic value reset (e.g. post-submit),
  // so the fresh empty field doesn't immediately read as a validation error.
  function untouch(field: string) {
    setBlurred((current) => ({ ...current, [field]: false }));
  }

  function isRequiredError(field: string, value: string) {
    return Boolean(blurred[field]) && value.trim().length === 0;
  }

  return { touch, untouch, isRequiredError };
}
