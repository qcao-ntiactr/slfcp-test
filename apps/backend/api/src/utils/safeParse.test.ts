import { describe, it, expect } from 'vitest';

import { safeParseInt, safeParseJSON } from './safeParse.js';

describe('safeParseJSON', () => {
  describe('positive cases', () => {
    it('parses a valid JSON string into an object', () => {
      const input = '{"foo":"bar","baz":123}';
      const result = safeParseJSON<{ foo: string; baz: number }>(input);
      expect(result).toEqual({ foo: 'bar', baz: 123 });
    });

    it('parses a valid JSON string into an array', () => {
      const input = '[1, 2, 3]';
      const result = safeParseJSON<number[]>(input);
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('negative cases', () => {
    it('returns undefined for non-string input', () => {
      expect(safeParseJSON({})).toBeUndefined();
      expect(safeParseJSON(null)).toBeUndefined();
      expect(safeParseJSON(undefined)).toBeUndefined();
      expect(safeParseJSON(123)).toBeUndefined();
    });

    it('returns undefined for malformed JSON string', () => {
      const input = '{"foo": "bar"'; // Missing closing brace
      expect(safeParseJSON(input)).toBeUndefined();
    });
  });
});

describe('safeParseInt', () => {
  describe('positive cases', () => {
    it('parses a valid integer string', () => {
      expect(safeParseInt('42')).toBe(42);
      expect(safeParseInt('0')).toBe(0);
    });

    it('parses a valid integer string with leading/trailing spaces', () => {
      expect(safeParseInt('   123  ')).toBe(123);
    });

    it('parses only the leading integer part of a string', () => {
      expect(safeParseInt('99abc')).toBe(99);
    });
  });

  describe('negative cases', () => {
    it('returns undefined for non-string input', () => {
      expect(safeParseInt(42)).toBeUndefined();
      expect(safeParseInt(null)).toBeUndefined();
      expect(safeParseInt(undefined)).toBeUndefined();
    });

    it('returns undefined for non-numeric strings', () => {
      expect(safeParseInt('abc')).toBeUndefined();
      expect(safeParseInt('')).toBeUndefined();
    });
  });
});
