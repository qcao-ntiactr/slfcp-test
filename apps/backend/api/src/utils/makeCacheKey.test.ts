import { describe, it, expect } from 'vitest';

import { makeCacheKey, Timeframe } from './makeCacheKey.js';

describe('makeCacheKey (positive tests)', () => {
  const baseDate = new Date('2025-01-08T00:00:00Z'); // deterministic test date

  it('should create a week key ending on last ISO Sunday', () => {
    const result = makeCacheKey('fetchData', 'week', baseDate);
    expect(result).toBe('fetchData:week:1-5-2025');
  });

  it('should create a month key ending on last day of previous month', () => {
    const result = makeCacheKey('fetchData', 'month', baseDate);
    expect(result).toBe('fetchData:month:12-31-2024');
  });

  it('should create a quarter key ending on last day of previous quarter', () => {
    const result = makeCacheKey('fetchData', 'quarter', baseDate);
    expect(result).toBe('fetchData:quarter:12-31-2024');
  });

  it('should return just the operation when timeframe is undefined', () => {
    const result = makeCacheKey('syncItems');
    expect(result).toBe('syncItems');
  });

  it('should treat empty string timeframe as falsy', () => {
    const result = makeCacheKey('getUser', '' as Timeframe);
    expect(result).toBe('getUser');
  });
});

describe('makeCacheKey (negative tests)', () => {
  const baseDate = new Date('2025-01-08T00:00:00Z');

  it('should not append "undefined" when timeframe is not provided', () => {
    const result = makeCacheKey('loadData');
    expect(result).not.toBe('loadData:undefined');
  });

  it('should not include colon when timeframe is falsy', () => {
    const result = makeCacheKey('fetch', null);
    expect(result).toBe('fetch');
  });

  it('should not modify the operation string if timeframe is missing', () => {
    const result = makeCacheKey('rebuildCache');
    expect(result.startsWith('rebuildCache:')).toBe(false);
  });

  it('should produce distinct results for different timeframes', () => {
    const weekKey = makeCacheKey('fetchData', 'week', baseDate);
    const monthKey = makeCacheKey('fetchData', 'month', baseDate);
    const quarterKey = makeCacheKey('fetchData', 'quarter', baseDate);
    expect(new Set([weekKey, monthKey, quarterKey]).size).toBe(3);
  });
});
