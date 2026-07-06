import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';

import { numberFieldBlurHandler } from './NumberInputHelpers';

const mockFieldControl: ControllerRenderProps<FieldValues, string> = {
  name: 'testField',
  ref: vi.fn(),
  value: '',
  onChange: vi.fn(),
  onBlur: vi.fn(),
};

describe('numberFieldBlurHandler', () => {
  describe('POSITIVE TESTS', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should call onChange with parsed number when valid numeric input is provided', () => {
      numberFieldBlurHandler('42.5', mockFieldControl);
      expect(mockFieldControl.onChange).toHaveBeenCalledWith(42.5);
    });

    it('should call onChange with parsed number when valid integer input is provided', () => {
      numberFieldBlurHandler('100', mockFieldControl);
      expect(mockFieldControl.onChange).toHaveBeenCalledWith(100);
    });

    it('should call onChange with undefined when input is empty string', () => {
      numberFieldBlurHandler('', mockFieldControl);
      expect(mockFieldControl.onChange).toHaveBeenCalledWith(undefined);
    });
  });

  describe('NEGATIVE TESTS', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should call onChange with undefined for non-numeric input', () => {
      numberFieldBlurHandler('abc', mockFieldControl);
      expect(mockFieldControl.onChange).toHaveBeenCalledWith(undefined);
    });

    it('should call onChange with undefined for whitespace input', () => {
      numberFieldBlurHandler('   ', mockFieldControl);
      expect(mockFieldControl.onChange).toHaveBeenCalledWith(undefined);
    });

    it('should call onChange with undefined for input like "-"', () => {
      numberFieldBlurHandler('-', mockFieldControl);
      expect(mockFieldControl.onChange).toHaveBeenCalledWith(undefined);
    });
  });
});
