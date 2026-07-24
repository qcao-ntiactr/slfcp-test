import { describe, expect, it } from 'vitest';

import { receiversSchema } from './receiver-schemas.js';

const validReceiver = {
  transmission_start: '2099-01-01T00:00:00Z',
  transmission_end: '2099-01-02T00:00:00Z',
  antenna_type: 'Dish',
  antenna_gain: '1',
  antenna_beamwidth: '1',
  antenna_altitude: '0',
  antenna_altitude_unit: 'ft',
  location_of_receiving_ground_station: 'ground',
  longitude_of_receiving_antenna: '0',
  latitude_of_receiving_antenna: '0',
};

describe('receiversSchema', () => {
  it('reports blank zero-valid fields as required', () => {
    const result = receiversSchema.safeParse([
      {
        ...validReceiver,
        antenna_altitude: '',
        longitude_of_receiving_antenna: ' ',
        latitude_of_receiving_antenna: null,
      },
    ]);

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(
      result.error.issues.map(({ message, path }) => ({ message, path }))
    ).toEqual(
      expect.arrayContaining([
        { message: 'Required', path: [0, 'antenna_altitude'] },
        {
          message: 'Required',
          path: [0, 'longitude_of_receiving_antenna'],
        },
        {
          message: 'Required',
          path: [0, 'latitude_of_receiving_antenna'],
        },
      ])
    );
  });

  it('coerces nonblank numeric drafts and preserves zero', () => {
    const result = receiversSchema.parse([validReceiver]);

    expect(result[0]).toMatchObject({
      antenna_altitude: 0,
      longitude_of_receiving_antenna: 0,
      latitude_of_receiving_antenna: 0,
    });
  });

  it('does not coerce blank fields on an unstarted optional receiver', () => {
    const result = receiversSchema.parse([
      validReceiver,
      {
        antenna_altitude: '',
        antenna_altitude_unit: 'ft',
        longitude_of_receiving_antenna: '',
        latitude_of_receiving_antenna: '',
      },
    ]);

    expect(result[1]).toEqual({ antenna_altitude_unit: 'ft' });
  });

  it('preserves numeric range validation', () => {
    const result = receiversSchema.safeParse([
      { ...validReceiver, longitude_of_receiving_antenna: '181' },
    ]);

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Must be at most 180.',
          path: [0, 'longitude_of_receiving_antenna'],
        }),
      ])
    );
  });
});
