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
});
