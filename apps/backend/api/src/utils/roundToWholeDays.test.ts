import { describe, it, expect } from 'vitest';

import { roundToWholeDays } from './roundToWholeDays.js';

describe('roundToWholeDays – positive values', () => {
  it('returns 1 for values greater than 0 and less than 1', () => {
    expect(roundToWholeDays(0.000028)).toBe(1);
    expect(roundToWholeDays(0.1)).toBe(1);
    expect(roundToWholeDays(0.5)).toBe(1);
    expect(roundToWholeDays(0.99)).toBe(1);
  });

  it('rounds values of 1 day or more using Math.round', () => {
    expect(roundToWholeDays(1)).toBe(1);
    expect(roundToWholeDays(1.4)).toBe(1);
    expect(roundToWholeDays(1.5)).toBe(2);
    expect(roundToWholeDays(2.49)).toBe(2);
    expect(roundToWholeDays(2.5)).toBe(3);
    expect(roundToWholeDays(8)).toBe(8);
  });
});

describe('roundToWholeDays – zero and negative values', () => {
  it('returns 0 when the value is exactly 0', () => {
    expect(roundToWholeDays(0)).toBe(0);
  });

  it('returns 0 for negative values defensively', () => {
    expect(roundToWholeDays(-0.1)).toBe(0);
    expect(roundToWholeDays(-0.5)).toBe(0);
    expect(roundToWholeDays(-1)).toBe(0);
    expect(roundToWholeDays(-10.75)).toBe(0);
  });
});
