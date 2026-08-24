import { useState } from 'react';

// DESIGN_SYSTEM.md §9: validation fires on blur, not on keystroke. Shared by
// every form built in Sprint 2.3 (Add/Edit Expense, Settle Up, Who Are You,
// Add Person) so a required field only shows its error once focus leaves it.
export function useBlurValidation() {
  const [blurred, setBlurred] = useState<Record<string, boolean>>({});

  function touch(field: string) {
    setBlurred((current) => ({ ...current, [field]: true }));
  }

  function isRequiredError(field: string, value: string) {
    return Boolean(blurred[field]) && value.trim().length === 0;
  }

  return { touch, isRequiredError };
}
