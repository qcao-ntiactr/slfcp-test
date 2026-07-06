import { describe, it, expect } from 'vitest';

import { formatRequestId } from './formatters.js';

describe('formatRequestId', () => {
  describe('Positive Tests', () => {
    it('should format a numeric ID with a Date object', () => {
      const requestId = 123;
      const createdAt = new Date('2023-05-20');
      const result = formatRequestId(requestId, createdAt);
      expect(result).toBe('SLFCP-00123-2023');
    });

    it('should format a string ID with a string date', () => {
      const requestId = '4567';
      const createdAt = '2024-01-01T00:00:00Z';
      const result = formatRequestId(requestId, createdAt);
      expect(result).toBe('SLFCP-04567-2024');
    });

    it('should pad IDs shorter than 5 digits', () => {
      const result = formatRequestId(1, '2022-12-31');
      expect(result).toBe('SLFCP-00001-2022');
    });

    it('should not truncate IDs longer than 5 digits', () => {
      const result = formatRequestId(123456, '2025-06-15');
      expect(result).toBe('SLFCP-123456-2025');
    });

    it('should use the current year if no date is provided', () => {
      const requestId = 789;
      const currentYear = new Date().getFullYear();
      const result = formatRequestId(requestId);
      expect(result).toBe(`SLFCP-00789-${currentYear}`);
    });

    it('should handle IDs that are already strings with leading zeros', () => {
      const result = formatRequestId('00123', '2023-01-01');
      expect(result).toBe('SLFCP-00123-2023');
    });
  });

  describe('Negative/Edge Case Tests', () => {
    it('should return NaN for year if an invalid date string is provided', () => {
      const result = formatRequestId(123, 'not-a-date');
      expect(result).toBe('SLFCP-00123-NaN');
    });

    it('should handle empty string as requestId by padding it', () => {
      const result = formatRequestId('', '2023-01-01');
      expect(result).toBe('SLFCP-00000-2023');
    });

    it('should handle special characters in requestId string', () => {
      const result = formatRequestId('abc#1', '2023-01-01');
      expect(result).toBe('SLFCP-abc#1-2023');
    });
  });
});
