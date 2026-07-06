import { describe, expect, it } from 'vitest';

import { normalizeNullableDateTime } from './normalizeNullableDateTime.js';

describe('normalizeNullableDateTime', () => {
  describe('positive cases', () => {
    it('returns null for empty string values', () => {
      expect(normalizeNullableDateTime('')).toBeNull();
      expect(normalizeNullableDateTime('   ')).toBeNull();
    });

    it("returns null for 'null' string values", () => {
      expect(normalizeNullableDateTime('null')).toBeNull();
      expect(normalizeNullableDateTime(' NULL ')).toBeNull();
    });

    it('preserves valid ISO datetime strings', () => {
      const iso = '2026-02-21T05:46:00.000Z';
      expect(normalizeNullableDateTime(iso)).toBe(iso);
    });
  });

  describe('negative cases', () => {
    it('returns null for null', () => {
      expect(normalizeNullableDateTime(null)).toBeNull();
    });

    it('preserves undefined for omitted fields', () => {
      expect(normalizeNullableDateTime(undefined)).toBeUndefined();
    });
  });
});
