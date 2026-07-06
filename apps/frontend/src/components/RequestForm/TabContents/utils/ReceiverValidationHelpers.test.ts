import { describe, expect, it } from 'vitest';

import {
  receiverHasValues,
  getReceiverIndexFromFieldName,
  validateOptionalReceiverField,
} from './ReceiverValidationHelpers';

describe('receiverHasValues', () => {
  describe('POSITIVE TESTS', () => {
    it('should return true when receiver has transmission_start', () => {
      const receiver = { transmission_start: '2023-01-01' };
      expect(receiverHasValues(receiver)).toBe(true);
    });

    it('should return true when receiver has transmission_end', () => {
      const receiver = { transmission_end: '2023-12-31' };
      expect(receiverHasValues(receiver)).toBe(true);
    });

    it('should return true when receiver has antenna_type', () => {
      const receiver = { antenna_type: 'Parabolic' };
      expect(receiverHasValues(receiver)).toBe(true);
    });

    it('should return true when receiver has antenna_gain', () => {
      const receiver = { antenna_gain: 15.5 };
      expect(receiverHasValues(receiver)).toBe(true);
    });

    it('should return true when receiver has antenna_beamwidth', () => {
      const receiver = { antenna_beamwidth: 30 };
      expect(receiverHasValues(receiver)).toBe(true);
    });

    it('should return true when receiver has antenna_altitude', () => {
      const receiver = { antenna_altitude: 1000 };
      expect(receiverHasValues(receiver)).toBe(true);
    });

    it('should return true when receiver has location_of_receiving_ground_station', () => {
      const receiver = { location_of_receiving_ground_station: 'ground' };
      expect(receiverHasValues(receiver)).toBe(true);
    });

    it('should return true when receiver has longitude_of_receiving_antenna', () => {
      const receiver = { longitude_of_receiving_antenna: -122.4194 };
      expect(receiverHasValues(receiver)).toBe(true);
    });

    it('should return true when receiver has latitude_of_receiving_antenna', () => {
      const receiver = { latitude_of_receiving_antenna: 37.7749 };
      expect(receiverHasValues(receiver)).toBe(true);
    });

    it('should return true when receiver has multiple values', () => {
      const receiver = {
        transmission_start: '2023-01-01',
        antenna_type: 'Parabolic',
        antenna_gain: 15.5,
      };
      expect(receiverHasValues(receiver)).toBe(true);
    });
  });

  describe('NEGATIVE TESTS', () => {
    it('should return false when receiver is undefined', () => {
      expect(receiverHasValues(undefined)).toBe(false);
    });

    it('should return false when receiver is empty object', () => {
      expect(receiverHasValues({})).toBe(false);
    });

    it('should return false when receiver only has antenna_altitude_unit', () => {
      const receiver = { antenna_altitude_unit: 'ft' };
      expect(receiverHasValues(receiver)).toBe(false);
    });

    it('should return false when all values are undefined', () => {
      const receiver = {
        transmission_start: undefined,
        transmission_end: undefined,
        antenna_type: undefined,
      };
      expect(receiverHasValues(receiver)).toBe(false);
    });

    it('should return false when all values are undefined', () => {
      const receiver = {
        transmission_start: undefined,
        transmission_end: undefined,
        antenna_type: undefined,
      };
      expect(receiverHasValues(receiver)).toBe(false);
    });

    it('should return false when all values are empty strings', () => {
      const receiver = {
        transmission_start: '',
        transmission_end: '',
        antenna_type: '',
      };
      expect(receiverHasValues(receiver)).toBe(false);
    });

    it('should return false when all string values are whitespace only', () => {
      const receiver = {
        transmission_start: '   ',
        transmission_end: '\t',
        antenna_type: '\n',
      };
      expect(receiverHasValues(receiver)).toBe(false);
    });

    it('should return false when receiver has only antenna_altitude_unit and empty values', () => {
      const receiver = {
        antenna_altitude_unit: 'ft',
        transmission_start: '',
        antenna_type: undefined,
      };
      expect(receiverHasValues(receiver)).toBe(false);
    });
  });
});

describe('getReceiverIndexFromFieldName', () => {
  describe('POSITIVE TESTS', () => {
    it('should extract index 0 from receivers.0.antenna_type', () => {
      expect(getReceiverIndexFromFieldName('receivers.0.antenna_type')).toBe(0);
    });

    it('should extract index 1 from receivers.1.transmission_start', () => {
      expect(
        getReceiverIndexFromFieldName('receivers.1.transmission_start')
      ).toBe(1);
    });

    it('should extract index 2 from receivers.2.antenna_gain', () => {
      expect(getReceiverIndexFromFieldName('receivers.2.antenna_gain')).toBe(2);
    });

    it('should extract index 10 from receivers.10.location', () => {
      expect(getReceiverIndexFromFieldName('receivers.10.location')).toBe(10);
    });
  });

  describe('NEGATIVE TESTS', () => {
    it('should return null for non-receiver field', () => {
      expect(getReceiverIndexFromFieldName('antenna_type')).toBe(null);
    });

    it('should return null for malformed receiver field', () => {
      expect(getReceiverIndexFromFieldName('receivers.antenna_type')).toBe(
        null
      );
    });

    it('should return null for field without dot after index', () => {
      expect(getReceiverIndexFromFieldName('receivers.1')).toBe(null);
    });

    it('should return null for empty string', () => {
      expect(getReceiverIndexFromFieldName('')).toBe(null);
    });

    it('should return null for field with non-numeric index', () => {
      expect(getReceiverIndexFromFieldName('receivers.abc.antenna_type')).toBe(
        null
      );
    });
  });
});

describe('validateOptionalReceiverField', () => {
  describe('POSITIVE TESTS', () => {
    it('should return true for receiver 0 (first receiver) regardless of value', () => {
      const validator = validateOptionalReceiverField(
        'receivers.0.antenna_type'
      );
      const formValues = { receivers: [{}] };

      expect(validator('', formValues)).toBe(true);
      expect(validator(undefined, formValues)).toBe(true);
      expect(validator(null, formValues)).toBe(true);
    });

    it('should return true for non-receiver field', () => {
      const validator = validateOptionalReceiverField('antenna_type');
      const formValues = {};

      expect(validator('', formValues)).toBe(true);
    });

    it('should return true when receiver has no values and field is empty', () => {
      const validator = validateOptionalReceiverField(
        'receivers.1.antenna_type'
      );
      const formValues = {
        receivers: [
          { antenna_type: 'Required receiver' },
          { antenna_altitude_unit: 'ft' }, // Only default unit, no meaningful values
        ],
      };

      expect(validator('', formValues)).toBe(true);
      expect(validator(undefined, formValues)).toBe(true);
      expect(validator(null, formValues)).toBe(true);
    });

    it('should return true when receiver has values and field has valid value', () => {
      const validator = validateOptionalReceiverField(
        'receivers.1.antenna_type'
      );
      const formValues = {
        receivers: [
          { antenna_type: 'Required receiver' },
          { transmission_start: '2023-01-01' }, // Has meaningful values
        ],
      };

      expect(validator('Parabolic', formValues)).toBe(true);
      expect(validator('Directional', formValues)).toBe(true);
    });

    it('should return true when receiver has values and field has non-empty string', () => {
      const validator = validateOptionalReceiverField(
        'receivers.1.antenna_type'
      );
      const formValues = {
        receivers: [
          { antenna_type: 'Required receiver' },
          { antenna_gain: 15.5 }, // Has meaningful values
        ],
      };

      expect(validator('Valid antenna type', formValues)).toBe(true);
    });
  });

  describe('NEGATIVE TESTS', () => {
    it('should return "Required." when receiver has values but field is empty string', () => {
      const validator = validateOptionalReceiverField(
        'receivers.1.antenna_type'
      );
      const formValues = {
        receivers: [
          { antenna_type: 'Required receiver' },
          { transmission_start: '2023-01-01' }, // Has meaningful values
        ],
      };

      expect(validator('', formValues)).toBe('Required.');
    });

    it('should return "Required." when receiver has values but field is undefined', () => {
      const validator = validateOptionalReceiverField(
        'receivers.1.antenna_type'
      );
      const formValues = {
        receivers: [
          { antenna_type: 'Required receiver' },
          { antenna_gain: 20 }, // Has meaningful values
        ],
      };

      expect(validator(undefined, formValues)).toBe('Required.');
    });

    it('should return "Required." when receiver has values but field is null', () => {
      const validator = validateOptionalReceiverField(
        'receivers.1.antenna_type'
      );
      const formValues = {
        receivers: [
          { antenna_type: 'Required receiver' },
          { antenna_beamwidth: 30 }, // Has meaningful values
        ],
      };

      expect(validator(null, formValues)).toBe('Required.');
    });

    it('should return "Required." when receiver has values but field is whitespace only', () => {
      const validator = validateOptionalReceiverField(
        'receivers.1.antenna_type'
      );
      const formValues = {
        receivers: [
          { antenna_type: 'Required receiver' },
          { location_of_receiving_ground_station: 'ground' }, // Has meaningful values
        ],
      };

      expect(validator('   ', formValues)).toBe('Required.');
      expect(validator('\t', formValues)).toBe('Required.');
      expect(validator('\n', formValues)).toBe('Required.');
    });

    it('should return "Required." when receiver has multiple values but field is empty', () => {
      const validator = validateOptionalReceiverField(
        'receivers.1.antenna_type'
      );
      const formValues = {
        receivers: [
          { antenna_type: 'Required receiver' },
          {
            transmission_start: '2023-01-01',
            transmission_end: '2023-12-31',
            antenna_gain: 15.5,
          }, // Has multiple meaningful values
        ],
      };

      expect(validator('', formValues)).toBe('Required.');
    });
  });
});
