import { describe, expect, it } from 'vitest';

import { normalizeFrequencyFormData } from './utils';

describe('normalizeFrequencyFormData', () => {
  it('removes receiver 2 when it should not be persisted', () => {
    const result = normalizeFrequencyFormData(
      {
        frequency: 123,
        receivers: [
          {
            antenna_type: 'Primary receiver',
            antenna_altitude_unit: 'ft',
          },
          {
            antenna_type: 'Transient second receiver',
            antenna_altitude_unit: 'ft',
          },
        ],
      },
      false
    );

    expect(result.receivers).toHaveLength(1);
    expect(result.receivers?.[0]?.antenna_type).toBe('Primary receiver');
  });

  it('preserves receiver 2 when it remains active', () => {
    const result = normalizeFrequencyFormData(
      {
        frequency: 123,
        receivers: [
          {
            antenna_type: 'Primary receiver',
            antenna_altitude_unit: 'ft',
          },
          {
            antenna_type: 'Second receiver',
            antenna_altitude_unit: 'ft',
          },
        ],
      },
      true
    );

    expect(result.receivers).toHaveLength(2);
    expect(result.receivers?.[1]?.antenna_type).toBe('Second receiver');
  });

  it('ensures at least one receiver exists after normalization', () => {
    const result = normalizeFrequencyFormData({
      frequency: 123,
      receivers: [],
    });

    expect(result.receivers).toHaveLength(1);
    expect(result.receivers?.[0]?.antenna_altitude_unit).toBe('ft');
  });
});
