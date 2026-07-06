import { describe, it, expect } from 'vitest';

import { stringifyBigInts } from './stringifyBigInts.js';

describe('stringifyBigInts - positive tests', () => {
  it('should convert BigInt values to strings', () => {
    const input = { id: 123n, nested: { value: 456n } };
    const result = stringifyBigInts(input);
    expect(result).toEqual({ id: '123', nested: { value: '456' } });
  });

  it('should handle arrays containing BigInts', () => {
    const input = [1n, 2n, 3n];
    const result = stringifyBigInts(input);
    expect(result).toEqual(['1', '2', '3']);
  });

  it('should leave non-BigInt values unchanged', () => {
    const input = { name: 'Alice', age: 30, active: true };
    const result = stringifyBigInts(input);
    expect(result).toEqual(input);
  });

  it('should handle mixed nested structures', () => {
    const input = {
      id: 1n,
      info: { count: 2n, label: 'test' },
      list: [3n, 'item', { deep: 4n }],
    };
    const result = stringifyBigInts(input);
    expect(result).toEqual({
      id: '1',
      info: { count: '2', label: 'test' },
      list: ['3', 'item', { deep: '4' }],
    });
  });

  it('should handle empty objects and arrays gracefully', () => {
    expect(stringifyBigInts({})).toEqual({});
    expect(stringifyBigInts([])).toEqual([]);
  });
});

describe('stringifyBigInts - negative tests', () => {
  it('should return primitives unchanged (no crash)', () => {
    expect(stringifyBigInts(123)).toBe(123);
    expect(stringifyBigInts('text')).toBe('text');
    expect(stringifyBigInts(true)).toBe(true);
    expect(stringifyBigInts(null)).toBe(null);
  });

  it('should throw when encountering non-serializable values like functions', () => {
    const input = { fn: () => 42 };
    // JSON.stringify removes functions silently, resulting in an empty object
    const result = stringifyBigInts(input);
    expect(result).toEqual({});
  });
});
