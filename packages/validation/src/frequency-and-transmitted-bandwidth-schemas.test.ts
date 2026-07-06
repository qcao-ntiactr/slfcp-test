import { describe, it, expect } from 'vitest';

import { getFrequencyRangeError } from './frequency-and-transmitted-bandwidth-schemas';

describe('getFrequencyRangeError - positive cases (returns null)', () => {
  it('returns null when range is fully within 2025–2110 MHz', () => {
    const freq = 2060;
    const bw = 40;
    expect(getFrequencyRangeError(freq, bw)).toBeNull();
  });

  it('returns null when range is fully within 2200–2290 MHz', () => {
    const freq = 2250;
    const bw = 60;
    expect(getFrequencyRangeError(freq, bw)).toBeNull();
  });

  it('returns null when range is fully within 2360–2395 MHz', () => {
    const freq = 2375;
    const bw = 30;
    expect(getFrequencyRangeError(freq, bw)).toBeNull();
  });
});

describe('getFrequencyRangeError - negative cases (returns error string)', () => {
  it('returns error when both low and high are outside allowed bands', () => {
    const freq = 1900;
    const bw = 100;
    expect(getFrequencyRangeError(freq, bw)).toMatch(
      'Frequency minus half the bandwidth (1850.00 MHz) and frequency plus half the bandwidth (1950.00 MHz) both fall outside the allowed bands: 2025–2110 MHz, 2200–2290 MHz, or 2360–2395 MHz.'
    );
  });

  it('returns error when only low is outside allowed bands', () => {
    const freq = 2030;
    const bw = 20;
    expect(getFrequencyRangeError(freq, bw)).toMatch(
      'Frequency minus half the bandwidth (2020.00 MHz) falls outside the allowed bands: 2025–2110 MHz, 2200–2290 MHz, or 2360–2395 MHz.'
    );
  });

  it('returns error when only high is outside allowed bands', () => {
    const freq = 2105;
    const bw = 20;
    expect(getFrequencyRangeError(freq, bw)).toMatch(
      'Frequency plus half the bandwidth (2115.00 MHz) falls outside the allowed bands: 2025–2110 MHz, 2200–2290 MHz, or 2360–2395 MHz.'
    );
  });

  it('returns error when range spans multiple bands without fitting within one', () => {
    const freq = 2155;
    const bw = 200;
    expect(getFrequencyRangeError(freq, bw)).toMatch(
      'The frequency range is not fully within one of the allowed bands: 2025–2110 MHz, 2200–2290 MHz, or 2360–2395 MHz.'
    );
  });
});
