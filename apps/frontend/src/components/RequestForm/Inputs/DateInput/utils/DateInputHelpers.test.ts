import { describe, expect, it } from 'vitest';

import {
  getDependentDateFieldName,
  toISO8601FromLocal,
  toLocalFromISO8601,
} from './DateInputHelpers';

describe('toLocalFromISO8601', () => {
  describe('POSITIVE TESTS', () => {
    it('should convert a valid ISO 8601 datetime string to local format', () => {
      const isoDateTime = '2023-02-05T12:34:56.000Z';
      const result = toLocalFromISO8601(isoDateTime, 'datetime-local');

      const expected = new Date(isoDateTime)
        .toLocaleString('en-CA', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
        .replace(',', '')
        .replace(/\//g, '-')
        .replace(' ', 'T');

      expect(result).toBe(expected);
    });

    it('should convert a valid ISO 8601 date-only string to local date format', () => {
      const isoDate = '2023-02-05T00:00:00.000Z';
      const result = toLocalFromISO8601(isoDate, 'date');

      expect(result).toBe('2023-02-05'); // Ensures it returns only YYYY-MM-DD
    });
  });

  describe('NEGATIVE TESTS', () => {
    it('should return an empty string for an invalid ISO date string', () => {
      expect(toLocalFromISO8601('invalid-date', 'date')).toBe('');
    });

    it('should return an empty string for an invalid ISO datetime string', () => {
      expect(toLocalFromISO8601('invalid-date', 'datetime-local')).toBe('');
    });
  });
});

describe('toISO8601FromLocal', () => {
  describe('POSITIVE TESTS', () => {
    it('should convert a valid local datetime string to ISO 8601 format', () => {
      const localDateTime = '2025-02-19T12:57';

      // Convert local date-time to UTC dynamically
      const date = new Date(localDateTime);
      const expectedISO = date.toISOString(); // Ensure consistent conversion

      expect(toISO8601FromLocal(localDateTime)).toBe(expectedISO);
    });

    it('should convert a valid local date string (YYYY-MM-DD) to ISO 8601 format with midnight UTC', () => {
      const localDate = '2025-02-19';
      const expectedISO = '2025-02-19T00:00:00.000Z'; // Ensures UTC midnight conversion

      expect(toISO8601FromLocal(localDate)).toBe(expectedISO);
    });
  });

  describe('NEGATIVE TESTS', () => {
    it('should return undefined for an empty input', () => {
      expect(toISO8601FromLocal('')).toBeUndefined();
    });

    it('should return undefined for an invalid date string', () => {
      expect(toISO8601FromLocal('invalid-date')).toBeUndefined();
    });
  });
});

describe('getDependentDateFieldName', () => {
  describe('POSITIVE TESTS', () => {
    it('should replace "_start" with "_end"', () => {
      expect(getDependentDateFieldName('event_start')).toEqual(['event_end']);
    });

    it('should replace "_end" with "_start"', () => {
      expect(getDependentDateFieldName('event_end')).toEqual(['event_start']);
    });

    it('should return dependent fields including corresponding receiver field and tx dependencies when field is receiver field', () => {
      expect(
        getDependentDateFieldName('receivers.0.transmission_start')
      ).toEqual([
        'receivers.0.transmission_end',
        'tx_transmission_start',
        'tx_transmission_end',
      ]);
    });

    it('should return ["receivers.0.transmission_start", "receivers.0.transmission_end"] when field starts with "tx"', () => {
      expect(getDependentDateFieldName('tx_something')).toEqual([
        'receivers.0.transmission_start',
        'receivers.0.transmission_end',
      ]);
    });

    it('should replace "_start" and include transmission dependencies for receiver fields', () => {
      expect(getDependentDateFieldName('receivers.1.event_start')).toEqual([
        'receivers.1.event_end',
        'tx_transmission_start',
        'tx_transmission_end',
      ]);
    });

    it('should replace "_end" and include transmission dependencies for "tx"', () => {
      expect(getDependentDateFieldName('tx_event_end')).toEqual([
        'tx_event_start',
        'receivers.0.transmission_start',
        'receivers.0.transmission_end',
      ]);
    });
  });

  describe('NEGATIVE TESTS', () => {
    it('should return an empty array if no match is found', () => {
      expect(getDependentDateFieldName('event_date')).toEqual([]);
    });

    it('should return an empty array for an unrelated field', () => {
      expect(getDependentDateFieldName('random_field')).toEqual([]);
    });
  });
});
