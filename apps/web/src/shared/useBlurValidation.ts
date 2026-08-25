import { useState } from 'react';

// DESIGN_SYSTEM.md §9: validation fires on blur, not on keystroke. Shared by
// every form built in Sprint 2.3 (Add/Edit Expense, Settle Up, Who Are You,
// Add Person) so a required field only shows its error once focus leaves it.
export function useBlurValidation() {
  const [blurred, setBlurred] = useState<Record<string, boolean>>({});

  function touch(field: string) {
    setBlurred((current) => ({ ...current, [field]: true }));
  }

  // For a form that clears its own value programmatically (e.g. after a
  // successful submit, ready for the next entry) without the field actually
  // being re-touched — without this, the stale touched flag makes the fresh
  // empty value immediately read as a validation error.
  function untouch(field: string) {
    setBlurred((current) => ({ ...current, [field]: false }));
  }

  function isRequiredError(field: string, value: string) {
    return Boolean(blurred[field]) && value.trim().length === 0;
  }

  return { touch, untouch, isRequiredError };
}
