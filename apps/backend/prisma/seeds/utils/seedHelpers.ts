import { faker } from '@faker-js/faker';

/**
 * Allowed frequency ranges for SLFCP applications
 */
export const FREQUENCY_RANGES = [
  { min: 2025, max: 2110 },
  { min: 2200, max: 2290 },
  { min: 2360, max: 2395 },
] as const;

/**
 * Interface for ordered date generation result
 */
export interface OrderedDates {
  txStart: Date;
  txEnd: Date;
  receiverStart: Date;
  receiverEnd: Date;
}

/**
 * Interface for frequency and bandwidth generation result
 */
export interface FrequencyBandwidthPair {
  frequency: number;
  transmittedBandwidth: number;
}

/**
 * Generates properly ordered dates for seeding that satisfy validation requirements:
 * - All dates are at least 1 day in the future
 * - TX transmission start < TX transmission end
 * - Receiver transmission start >= TX transmission start
 * - Receiver transmission end >= TX transmission end
 * - Receiver transmission start < Receiver transmission end
 *
 * @returns OrderedDates object with properly ordered dates
 */
export function generateOrderedDates(): OrderedDates {
  const now = new Date();
  const futureStart = new Date(now.getTime() + 1000 * 60 * 60 * 24); // 1 day from now

  // Generate tx transmission dates
  const txStart = faker.date.between({
    from: futureStart,
    to: new Date(futureStart.getTime() + 1000 * 60 * 60 * 24 * 30), // up to 30 days from start
  });

  const txEnd = faker.date.between({
    from: new Date(txStart.getTime() + 1000 * 60 * 60), // at least 1 hour after tx start
    to: new Date(txStart.getTime() + 1000 * 60 * 60 * 24 * 7), // up to 7 days after tx start
  });

  // Generate receiver dates (must be >= tx dates)
  const receiverStart = faker.date.between({
    from: txStart,
    to: new Date(txEnd.getTime() + 1000 * 60 * 60 * 24), // up to 1 day after tx end
  });

  const receiverEnd = faker.date.between({
    from: new Date(
      Math.max(txEnd.getTime(), receiverStart.getTime() + 1000 * 60 * 60)
    ), // at least 1 hour after receiver start and >= tx end
    to: new Date(
      Math.max(txEnd.getTime(), receiverStart.getTime()) +
        1000 * 60 * 60 * 24 * 3
    ), // up to 3 days after the later of tx end or receiver start
  });

  return {
    txStart,
    txEnd,
    receiverStart,
    receiverEnd,
  };
}

/**
 * Generates valid frequency and transmitted bandwidth combinations that satisfy validation requirements:
 * - Frequency is within one of the allowed ranges (2025-2110, 2200-2290, 2360-2395 MHz)
 * - Frequency ± (transmitted_bandwidth / 2) stays entirely within the same allowed range
 * - Transmitted bandwidth is between 0.1 and 99.99 MHz
 *
 * @returns FrequencyBandwidthPair object with valid frequency and bandwidth
 */
export function generateValidFrequencyAndBandwidth(): FrequencyBandwidthPair {
  // Pick a random range
  const range = faker.helpers.arrayElement(FREQUENCY_RANGES);
  const rangeWidth = range.max - range.min; // e.g., 85 for 2025-2110

  // Generate transmitted bandwidth first (0.1 to 99.99, but we need to ensure it fits in the range)
  // The maximum bandwidth that can fit in a range is the range width
  const maxBandwidth = Math.min(rangeWidth, 99.99);
  const transmittedBandwidth = faker.number.float({
    min: 0.1,
    max: maxBandwidth,
    fractionDigits: 2,
  });

  // Calculate the safe frequency range where frequency ± (bandwidth/2) stays within the allowed range
  const halfBandwidth = transmittedBandwidth / 2;
  const safeMin = range.min + halfBandwidth;
  const safeMax = range.max - halfBandwidth;

  // Generate frequency within the safe range
  const frequency = faker.number.float({
    min: safeMin,
    max: safeMax,
    fractionDigits: 4,
  });

  return {
    frequency,
    transmittedBandwidth,
  };
}

/**
 * Validates that a frequency and bandwidth combination meets the requirements.
 * This is primarily used for testing purposes.
 *
 * @param frequency - The frequency in MHz
 * @param transmittedBandwidth - The transmitted bandwidth in MHz
 * @returns null if valid, error string if invalid
 */
export function validateFrequencyBandwidthPair(
  frequency: number,
  transmittedBandwidth: number
): string | null {
  const halfBandwidth = transmittedBandwidth / 2;
  const low = frequency - halfBandwidth;
  const high = frequency + halfBandwidth;

  const fits = FREQUENCY_RANGES.some(
    (range) =>
      frequency >= range.min &&
      frequency <= range.max &&
      low >= range.min &&
      high <= range.max
  );

  if (fits) return null;

  const allowedRangesText = '2025–2110 MHz, 2200–2290 MHz, or 2360–2395 MHz';
  const lowOk = FREQUENCY_RANGES.some(
    (range) => low >= range.min && low <= range.max
  );
  const highOk = FREQUENCY_RANGES.some(
    (range) => high >= range.min && high <= range.max
  );

  if (!lowOk && !highOk) {
    return `Frequency minus half the bandwidth (${low.toFixed(
      2
    )} MHz) and frequency plus half the bandwidth (${high.toFixed(
      2
    )} MHz) both fall outside the allowed bands: ${allowedRangesText}.`;
  }
  if (!lowOk) {
    return `Frequency minus half the bandwidth (${low.toFixed(
      2
    )} MHz) falls outside the allowed bands: ${allowedRangesText}.`;
  }
  if (!highOk) {
    return `Frequency plus half the bandwidth (${high.toFixed(
      2
    )} MHz) falls outside the allowed bands: ${allowedRangesText}.`;
  }

  return `The frequency range is not fully within one of the allowed bands: ${allowedRangesText}.`;
}

/**
 * Validates that dates are properly ordered according to the requirements.
 * This is primarily used for testing purposes.
 *
 * @param dates - The OrderedDates object to validate
 * @returns null if valid, error string if invalid
 */
export function validateOrderedDates(dates: OrderedDates): string | null {
  const now = new Date();

  // Check all dates are in the future
  if (dates.txStart <= now) return 'TX start date must be in the future';
  if (dates.txEnd <= now) return 'TX end date must be in the future';
  if (dates.receiverStart <= now)
    return 'Receiver start date must be in the future';
  if (dates.receiverEnd <= now)
    return 'Receiver end date must be in the future';

  // Check TX date ordering
  if (dates.txStart >= dates.txEnd) return 'TX start must be before TX end';

  // Check receiver dates relative to TX dates
  if (dates.receiverStart < dates.txStart)
    return 'Receiver start must be >= TX start';
  if (dates.receiverEnd < dates.txEnd) return 'Receiver end must be >= TX end';

  // Check receiver date ordering
  if (dates.receiverStart >= dates.receiverEnd)
    return 'Receiver start must be before receiver end';

  return null;
}
