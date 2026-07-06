import { describe, expect, it } from 'vitest';

import { getValidFrequencyAndBandwidth } from './utils';

const allowedRanges = [
  { min: 2025, max: 2110 },
  { min: 2200, max: 2290 },
  { min: 2360, max: 2395 },
];

function isWithinOneRange(freq: number, bw: number): boolean {
  const low = freq - bw / 2;
  const high = freq + bw / 2;

  return allowedRanges.some(
    (range) =>
      freq >= range.min &&
      freq <= range.max &&
      low >= range.min &&
      high <= range.max
  );
}

describe('getValidFrequencyAndBandwidth - positive tests', () => {
  it('returns frequency and bandwidth in expected format', () => {
    const { frequency, transmittedBandwidth } = getValidFrequencyAndBandwidth();
    expect(typeof frequency).toBe('number');
    expect(typeof transmittedBandwidth).toBe('number');
  });

  it('returns bandwidth within 0.1 to 10', () => {
    const { transmittedBandwidth } = getValidFrequencyAndBandwidth();
    expect(transmittedBandwidth).toBeGreaterThanOrEqual(0.1);
    expect(transmittedBandwidth).toBeLessThanOrEqual(10);
  });

  it('returns frequency such that full bandwidth range stays within a valid band', () => {
    const { frequency, transmittedBandwidth } = getValidFrequencyAndBandwidth();
    expect(isWithinOneRange(frequency, transmittedBandwidth)).toBe(true);
  });
});

describe('getValidFrequencyAndBandwidth - negative tests (fuzzed edge cases)', () => {
  it('does not produce a frequency that spans multiple ranges', () => {
    for (let i = 0; i < 1000; i++) {
      const { frequency, transmittedBandwidth } =
        getValidFrequencyAndBandwidth();
      const low = frequency - transmittedBandwidth / 2;
      const high = frequency + transmittedBandwidth / 2;

      const matchedRanges = allowedRanges.filter(
        (r) => low <= r.max && high >= r.min
      );
      // Should overlap with only one range
      expect(matchedRanges.length).toBe(1);
    }
  });

  it('does not produce out-of-band frequency even with small bandwidth', () => {
    for (let i = 0; i < 1000; i++) {
      const { frequency, transmittedBandwidth } =
        getValidFrequencyAndBandwidth();
      const half = transmittedBandwidth / 2;
      const low = frequency - half;
      const high = frequency + half;

      const valid = allowedRanges.some(
        (r) => freqInRange(frequency, r) && low >= r.min && high <= r.max
      );

      expect(valid).toBe(true);
    }
  });
});

function freqInRange(freq: number, range: { min: number; max: number }) {
  return freq >= range.min && freq <= range.max;
}
