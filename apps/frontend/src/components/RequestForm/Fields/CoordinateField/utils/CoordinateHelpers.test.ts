import { describe, expect, it } from 'vitest';

import { getDirection, normalizeCoordValue } from './CoordinateHelpers';

describe('normalizeCoordValue', () => {
  describe('POSITIVE TESTS', () => {
    it('should return the same positive coordinate value as a string', () => {
      expect(normalizeCoordValue('10.5')).toBe('10.5');
    });

    it('should convert negative coordinate value to positive string', () => {
      expect(normalizeCoordValue('-12.3')).toBe('12.3');
    });

    it('should return zero as "0" when input is "0"', () => {
      expect(normalizeCoordValue('0')).toBe('0');
    });
  });

  describe('NEGATIVE TESTS', () => {
    it('should return an empty string for non-numeric input', () => {
      expect(normalizeCoordValue('abc')).toBe('');
    });

    it('should return an empty string for empty input', () => {
      expect(normalizeCoordValue('')).toBe('');
    });

    it('should return an empty string for whitespace input', () => {
      expect(normalizeCoordValue('   ')).toBe('');
    });
  });
});

describe('getDirection', () => {
  describe('positive tests', () => {
    it('returns "N" for positive latitude', () => {
      expect(getDirection('latitude', 45)).toBe('N');
    });

    it('returns "S" for negative latitude', () => {
      expect(getDirection('latitude', -23.5)).toBe('S');
    });

    it('returns "E" for positive longitude', () => {
      expect(getDirection('longitude', 120)).toBe('E');
    });

    it('returns "W" for negative longitude', () => {
      expect(getDirection('longitude', -80)).toBe('W');
    });

    it('returns "N" for 0 latitude', () => {
      expect(getDirection('latitude', 0)).toBe('N');
    });

    it('returns "E" for 0 longitude', () => {
      expect(getDirection('longitude', 0)).toBe('E');
    });
  });

  describe('negative tests', () => {
    it('returns "" for NaN value', () => {
      expect(getDirection('latitude', NaN)).toBe('');
    });
  });
});
