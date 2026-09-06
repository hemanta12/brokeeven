import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useBlurValidation } from './useBlurValidation';

describe('useBlurValidation', () => {
  it('does not flag an untouched empty field', () => {
    const { result } = renderHook(() => useBlurValidation());
    expect(result.current.isRequiredError('name', '')).toBe(false);
  });

  it('flags an empty field only after it has been blurred', () => {
    const { result } = renderHook(() => useBlurValidation());
    act(() => result.current.touch('name'));
    expect(result.current.isRequiredError('name', '')).toBe(true);
  });

  it('does not flag a blurred field that has a value', () => {
    const { result } = renderHook(() => useBlurValidation());
    act(() => result.current.touch('name'));
    expect(result.current.isRequiredError('name', 'Alice')).toBe(false);
  });

  // A form that clears its own value post-submit shouldn't have that reset read
  // as a validation failure.
  it('untouch clears a stale touched flag so a since-cleared value stops erroring', () => {
    const { result } = renderHook(() => useBlurValidation());
    act(() => result.current.touch('name'));
    expect(result.current.isRequiredError('name', '')).toBe(true);

    act(() => result.current.untouch('name'));
    expect(result.current.isRequiredError('name', '')).toBe(false);
  });
});
