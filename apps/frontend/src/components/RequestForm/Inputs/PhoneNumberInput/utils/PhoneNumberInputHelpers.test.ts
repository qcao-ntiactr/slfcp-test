import { describe, expect, it } from 'vitest';

import {
  applyPhoneNumberMask,
  unformatPhoneNumber,
} from './PhoneNumberInputHelpers';

describe('applyPhoneNumberMask', () => {
  describe('POSITIVE TESTS', () => {
    it('should format a string of numbers to parenthetical area code format', () => {
      expect(applyPhoneNumberMask('1234567890')).toBe('(123) 456-7890');
    });
    it('should gracefully handle a partial phone number value', () => {
      expect(applyPhoneNumberMask('12345')).toBe('(123) 45');
    });
  });

  describe('NEGATIVE TESTS', () => {
    it('should return an empty string if formatting is impossible', () => {
      expect(applyPhoneNumberMask('invalid_string')).toBe('');
    });
  });
  it('should return the original string if it contains 3 or less digits', () => {
    expect(applyPhoneNumberMask('1')).toBe('1');
    expect(applyPhoneNumberMask('11')).toBe('11');
    expect(applyPhoneNumberMask('111')).toBe('111');
  });
});

describe('unformatPhoneNumber', () => {
  describe('positive tests', () => {
    it('should format a 10-digit number as xxx-xxx-xxxx', () => {
      expect(unformatPhoneNumber('1234567890')).toBe('123-456-7890');
    });

    it('should handle number with formatting characters', () => {
      expect(unformatPhoneNumber('(123) 456-7890')).toBe('123-456-7890');
      expect(unformatPhoneNumber('123.456.7890')).toBe('123-456-7890');
      expect(unformatPhoneNumber('123 456 7890')).toBe('123-456-7890');
    });

    it('should format a 7-digit number as xxx-xxxx', () => {
      expect(unformatPhoneNumber('1234567')).toBe('123-456-7');
    });

    it('should allow partial input (less than 7 digits)', () => {
      expect(unformatPhoneNumber('123')).toBe('123');
      expect(unformatPhoneNumber('1234')).toBe('123-4');
      expect(unformatPhoneNumber('12345')).toBe('123-45');
    });
  });

  describe('negative tests', () => {
    it('should return an empty string for empty input', () => {
      expect(unformatPhoneNumber('')).toBe('');
    });

    it('should return an empty string for input with no digits', () => {
      expect(unformatPhoneNumber('()- ')).toBe('');
    });

    it('should trim extra digits beyond 10 characters', () => {
      expect(unformatPhoneNumber('1234567890123')).toBe('123-456-7890');
    });

    it('should return only dashes if digits are fewer than positions', () => {
      expect(unformatPhoneNumber('1-2-3')).toBe('123');
    });
  });
});
