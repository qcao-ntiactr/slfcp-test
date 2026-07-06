import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  generateOrderedDates,
  generateValidFrequencyAndBandwidth,
  validateFrequencyBandwidthPair,
  validateOrderedDates,
  FREQUENCY_RANGES,
  type OrderedDates,
} from './seedHelpers.js';

describe('FREQUENCY_RANGES', () => {
  describe('positive cases', () => {
    it('contains the correct frequency ranges', () => {
      expect(FREQUENCY_RANGES).toEqual([
        { min: 2025, max: 2110 },
        { min: 2200, max: 2290 },
        { min: 2360, max: 2395 },
      ]);
    });

    it('has ranges with correct widths', () => {
      expect(FREQUENCY_RANGES[0].max - FREQUENCY_RANGES[0].min).toBe(85); // 2025-2110
      expect(FREQUENCY_RANGES[1].max - FREQUENCY_RANGES[1].min).toBe(90); // 2200-2290
      expect(FREQUENCY_RANGES[2].max - FREQUENCY_RANGES[2].min).toBe(35); // 2360-2395
    });
  });
});

describe('generateOrderedDates', () => {
  let mockDate: Date;

  beforeEach(() => {
    // Mock current date to January 1, 2024
    mockDate = new Date('2024-01-01T00:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('positive cases', () => {
    it('generates dates that are all in the future', () => {
      const dates = generateOrderedDates();
      const now = new Date();

      expect(dates.txStart.getTime()).toBeGreaterThan(now.getTime());
      expect(dates.txEnd.getTime()).toBeGreaterThan(now.getTime());
      expect(dates.receiverStart.getTime()).toBeGreaterThan(now.getTime());
      expect(dates.receiverEnd.getTime()).toBeGreaterThan(now.getTime());
    });

    it('generates dates with proper TX ordering', () => {
      const dates = generateOrderedDates();

      expect(dates.txStart.getTime()).toBeLessThan(dates.txEnd.getTime());
    });

    it('generates dates with proper receiver ordering', () => {
      const dates = generateOrderedDates();

      expect(dates.receiverStart.getTime()).toBeLessThan(
        dates.receiverEnd.getTime()
      );
    });

    it('generates receiver dates that respect TX date constraints', () => {
      const dates = generateOrderedDates();

      expect(dates.receiverStart.getTime()).toBeGreaterThanOrEqual(
        dates.txStart.getTime()
      );
      expect(dates.receiverEnd.getTime()).toBeGreaterThanOrEqual(
        dates.txEnd.getTime()
      );
    });

    it('generates dates that pass validation', () => {
      const dates = generateOrderedDates();
      const validationError = validateOrderedDates(dates);

      expect(validationError).toBeNull();
    });

    it('generates consistent results across multiple calls', () => {
      // Test that the function consistently produces valid dates
      for (let i = 0; i < 10; i++) {
        const dates = generateOrderedDates();
        const validationError = validateOrderedDates(dates);
        expect(validationError).toBeNull();
      }
    });
  });
});

describe('generateValidFrequencyAndBandwidth', () => {
  describe('positive cases', () => {
    it('generates frequency within allowed ranges', () => {
      const { frequency } = generateValidFrequencyAndBandwidth();

      const isInAllowedRange = FREQUENCY_RANGES.some(
        (range) => frequency >= range.min && frequency <= range.max
      );

      expect(isInAllowedRange).toBe(true);
    });

    it('generates transmitted bandwidth between 0.1 and 99.99', () => {
      const { transmittedBandwidth } = generateValidFrequencyAndBandwidth();

      expect(transmittedBandwidth).toBeGreaterThanOrEqual(0.1);
      expect(transmittedBandwidth).toBeLessThanOrEqual(99.99);
    });

    it('generates frequency with 4 decimal places', () => {
      const { frequency } = generateValidFrequencyAndBandwidth();
      const decimalPlaces = (frequency.toString().split('.')[1] || '').length;

      expect(decimalPlaces).toBeLessThanOrEqual(4);
    });

    it('generates transmitted bandwidth with 2 decimal places', () => {
      const { transmittedBandwidth } = generateValidFrequencyAndBandwidth();
      const decimalPlaces = (
        transmittedBandwidth.toString().split('.')[1] || ''
      ).length;

      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });

    it('generates combinations that pass validation', () => {
      const { frequency, transmittedBandwidth } =
        generateValidFrequencyAndBandwidth();
      const validationError = validateFrequencyBandwidthPair(
        frequency,
        transmittedBandwidth
      );

      expect(validationError).toBeNull();
    });

    it('generates valid combinations consistently across multiple calls', () => {
      // Test that the function consistently produces valid combinations
      for (let i = 0; i < 20; i++) {
        const { frequency, transmittedBandwidth } =
          generateValidFrequencyAndBandwidth();
        const validationError = validateFrequencyBandwidthPair(
          frequency,
          transmittedBandwidth
        );
        expect(validationError).toBeNull();
      }
    });

    it('generates bandwidth that fits within the selected range', () => {
      const { frequency, transmittedBandwidth } =
        generateValidFrequencyAndBandwidth();
      const halfBandwidth = transmittedBandwidth / 2;
      const low = frequency - halfBandwidth;
      const high = frequency + halfBandwidth;

      // Find which range the frequency belongs to
      const selectedRange = FREQUENCY_RANGES.find(
        (range) => frequency >= range.min && frequency <= range.max
      );

      expect(selectedRange).toBeDefined();
      expect(low).toBeGreaterThanOrEqual(selectedRange!.min);
      expect(high).toBeLessThanOrEqual(selectedRange!.max);
    });
  });
});

describe('validateFrequencyBandwidthPair', () => {
  describe('positive cases (returns null)', () => {
    it('returns null when range is fully within 2025–2110 MHz', () => {
      const frequency = 2060;
      const transmittedBandwidth = 40;

      expect(
        validateFrequencyBandwidthPair(frequency, transmittedBandwidth)
      ).toBeNull();
    });

    it('returns null when range is fully within 2200–2290 MHz', () => {
      const frequency = 2250;
      const transmittedBandwidth = 60;

      expect(
        validateFrequencyBandwidthPair(frequency, transmittedBandwidth)
      ).toBeNull();
    });

    it('returns null when range is fully within 2360–2395 MHz', () => {
      const frequency = 2375;
      const transmittedBandwidth = 30;

      expect(
        validateFrequencyBandwidthPair(frequency, transmittedBandwidth)
      ).toBeNull();
    });

    it('returns null for edge case at range boundaries', () => {
      // Test frequency at exact range boundaries with minimal bandwidth
      expect(validateFrequencyBandwidthPair(2025.05, 0.1)).toBeNull(); // 2025 range
      expect(validateFrequencyBandwidthPair(2109.95, 0.1)).toBeNull(); // 2025 range
      expect(validateFrequencyBandwidthPair(2200.05, 0.1)).toBeNull(); // 2200 range
      expect(validateFrequencyBandwidthPair(2289.95, 0.1)).toBeNull(); // 2200 range
      expect(validateFrequencyBandwidthPair(2360.05, 0.1)).toBeNull(); // 2360 range
      expect(validateFrequencyBandwidthPair(2394.95, 0.1)).toBeNull(); // 2360 range
    });
  });

  describe('negative cases (returns error string)', () => {
    it('returns error when both low and high are outside allowed bands', () => {
      const frequency = 1900;
      const transmittedBandwidth = 100;
      const error = validateFrequencyBandwidthPair(
        frequency,
        transmittedBandwidth
      );

      expect(error).toContain('both fall outside the allowed bands');
      expect(error).toContain('1850.00 MHz');
      expect(error).toContain('1950.00 MHz');
    });

    it('returns error when only low is outside allowed bands', () => {
      const frequency = 2030;
      const transmittedBandwidth = 20;
      const error = validateFrequencyBandwidthPair(
        frequency,
        transmittedBandwidth
      );

      expect(error).toContain('Frequency minus half the bandwidth');
      expect(error).toContain('2020.00 MHz');
      expect(error).toContain('falls outside the allowed bands');
    });

    it('returns error when only high is outside allowed bands', () => {
      const frequency = 2105;
      const transmittedBandwidth = 20;
      const error = validateFrequencyBandwidthPair(
        frequency,
        transmittedBandwidth
      );

      expect(error).toContain('Frequency plus half the bandwidth');
      expect(error).toContain('2115.00 MHz');
      expect(error).toContain('falls outside the allowed bands');
    });

    it('returns error when range spans multiple bands', () => {
      const frequency = 2155; // Between 2110 and 2200
      const transmittedBandwidth = 100;
      const error = validateFrequencyBandwidthPair(
        frequency,
        transmittedBandwidth
      );

      expect(error).toContain('not fully within one of the allowed bands');
    });

    it('returns error for frequency outside all ranges', () => {
      const frequency = 1500; // Way outside any range
      const transmittedBandwidth = 1;
      const error = validateFrequencyBandwidthPair(
        frequency,
        transmittedBandwidth
      );

      expect(error).toBeDefined();
      expect(error).toContain('allowed bands');
    });
  });
});

describe('validateOrderedDates', () => {
  let mockDate: Date;
  let validDates: OrderedDates;

  beforeEach(() => {
    mockDate = new Date('2024-01-01T00:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);

    validDates = {
      txStart: new Date('2024-01-02T10:00:00.000Z'),
      txEnd: new Date('2024-01-02T12:00:00.000Z'),
      receiverStart: new Date('2024-01-02T10:30:00.000Z'),
      receiverEnd: new Date('2024-01-02T13:00:00.000Z'),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('positive cases (returns null)', () => {
    it('returns null for properly ordered dates', () => {
      expect(validateOrderedDates(validDates)).toBeNull();
    });

    it('returns null when receiver dates equal TX dates', () => {
      const dates: OrderedDates = {
        txStart: new Date('2024-01-02T10:00:00.000Z'),
        txEnd: new Date('2024-01-02T12:00:00.000Z'),
        receiverStart: new Date('2024-01-02T10:00:00.000Z'), // Equal to txStart
        receiverEnd: new Date('2024-01-02T12:00:00.000Z'), // Equal to txEnd
      };

      expect(validateOrderedDates(dates)).toBeNull();
    });

    it('returns null for edge case with minimal time differences', () => {
      const dates: OrderedDates = {
        txStart: new Date('2024-01-02T10:00:00.000Z'),
        txEnd: new Date('2024-01-02T10:00:01.000Z'), // 1 second later
        receiverStart: new Date('2024-01-02T10:00:00.000Z'),
        receiverEnd: new Date('2024-01-02T10:00:02.000Z'), // 2 seconds later
      };

      expect(validateOrderedDates(dates)).toBeNull();
    });
  });

  describe('negative cases (returns error string)', () => {
    it('returns error when TX start is not in the future', () => {
      const dates = { ...validDates, txStart: mockDate };
      const error = validateOrderedDates(dates);

      expect(error).toBe('TX start date must be in the future');
    });

    it('returns error when TX end is not in the future', () => {
      const dates = { ...validDates, txEnd: mockDate };
      const error = validateOrderedDates(dates);

      expect(error).toBe('TX end date must be in the future');
    });

    it('returns error when receiver start is not in the future', () => {
      const dates = { ...validDates, receiverStart: mockDate };
      const error = validateOrderedDates(dates);

      expect(error).toBe('Receiver start date must be in the future');
    });

    it('returns error when receiver end is not in the future', () => {
      const dates = { ...validDates, receiverEnd: mockDate };
      const error = validateOrderedDates(dates);

      expect(error).toBe('Receiver end date must be in the future');
    });

    it('returns error when TX start is after TX end', () => {
      const dates = {
        ...validDates,
        txStart: new Date('2024-01-02T12:00:00.000Z'),
        txEnd: new Date('2024-01-02T10:00:00.000Z'),
      };
      const error = validateOrderedDates(dates);

      expect(error).toBe('TX start must be before TX end');
    });

    it('returns error when TX start equals TX end', () => {
      const sameTime = new Date('2024-01-02T10:00:00.000Z');
      const dates = { ...validDates, txStart: sameTime, txEnd: sameTime };
      const error = validateOrderedDates(dates);

      expect(error).toBe('TX start must be before TX end');
    });

    it('returns error when receiver start is before TX start', () => {
      const dates = {
        ...validDates,
        receiverStart: new Date('2024-01-02T09:00:00.000Z'), // Before txStart
      };
      const error = validateOrderedDates(dates);

      expect(error).toBe('Receiver start must be >= TX start');
    });

    it('returns error when receiver end is before TX end', () => {
      const dates = {
        ...validDates,
        receiverEnd: new Date('2024-01-02T11:00:00.000Z'), // Before txEnd
      };
      const error = validateOrderedDates(dates);

      expect(error).toBe('Receiver end must be >= TX end');
    });

    it('returns error when receiver start is after receiver end', () => {
      const dates = {
        ...validDates,
        receiverStart: new Date('2024-01-02T14:00:00.000Z'),
        receiverEnd: new Date('2024-01-02T13:00:00.000Z'),
      };
      const error = validateOrderedDates(dates);

      expect(error).toBe('Receiver start must be before receiver end');
    });

    it('returns error when receiver start equals receiver end', () => {
      const sameTime = new Date('2024-01-02T12:00:00.000Z');
      const dates = {
        ...validDates,
        receiverStart: sameTime,
        receiverEnd: sameTime,
      };
      const error = validateOrderedDates(dates);

      expect(error).toBe('Receiver start must be before receiver end');
    });
  });
});
