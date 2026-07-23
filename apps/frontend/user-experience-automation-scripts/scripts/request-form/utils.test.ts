import { describe, expect, it } from 'vitest';

import { getValidFrequencyAndBandwidth } from './utils';

describe('deterministic valid frequency fixture', () => {
  it('stays wholly inside an allowed frequency range', () => {
    const { frequency, transmittedBandwidth } = getValidFrequencyAndBandwidth();
    const halfBandwidth = transmittedBandwidth / 2;

    expect({ frequency, transmittedBandwidth }).toEqual({
      frequency: 2050,
      transmittedBandwidth: 6,
    });
    expect(frequency - halfBandwidth).toBeGreaterThanOrEqual(2025);
    expect(frequency + halfBandwidth).toBeLessThanOrEqual(2110);
  });
});
