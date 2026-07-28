import { z } from 'zod';

export const transmittedBandwidthSchema = z.object({
  transmitted_bandwidth: z.coerce
    .number({ message: 'Required' })
    .min(0.1, 'Required.')
    .max(99.99, 'Must be at most 99.99.'),
  transmitted_bandwidth_justification: z.string().optional(), // This field only shows if transmitted_bandwidth is more than 5
});

export interface FrequencyRange {
  low: number;
  high: number;
}

export const DEFAULT_FREQUENCY_RANGES: readonly FrequencyRange[] = [
  { low: 2025, high: 2110 },
  { low: 2200, high: 2290 },
  { low: 2360, high: 2395 },
];

const formatFrequencyRanges = (ranges: readonly FrequencyRange[]) => {
  const labels = ranges.map(({ low, high }) => `${low}–${high} MHz`);
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} or ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, or ${labels[labels.length - 1]}`;
};

const createFrequencyOnlySchema = (ranges: readonly FrequencyRange[]) =>
  z.object({
    frequency: z.coerce
      .number({ message: 'Required' })
      .refine(
        (value) =>
          ranges.some(({ low, high }) => value >= low && value <= high),
        {
          message: `Frequency must be within the following ranges: ${formatFrequencyRanges(
            ranges
          )}`,
        }
      ),
  });

export const getFrequencyRangeError = (
  centerFrequency: number,
  bandwidth: number,
  ranges: readonly FrequencyRange[] = DEFAULT_FREQUENCY_RANGES
): string | null => {
  const allowedRangesText = formatFrequencyRanges(ranges);

  const halfBandwidth = bandwidth / 2;
  const lowerBound = centerFrequency - halfBandwidth;
  const upperBound = centerFrequency + halfBandwidth;

  const fitsWithinOneRange = ranges.some(
    (range) =>
      centerFrequency >= range.low &&
      centerFrequency <= range.high &&
      lowerBound >= range.low &&
      upperBound <= range.high
  );
  if (fitsWithinOneRange) return null;

  const lowerBoundIsAllowed = ranges.some(
    (range) => lowerBound >= range.low && lowerBound <= range.high
  );
  const upperBoundIsAllowed = ranges.some(
    (range) => upperBound >= range.low && upperBound <= range.high
  );

  if (!lowerBoundIsAllowed && !upperBoundIsAllowed) {
    return `Frequency minus half the bandwidth (${lowerBound.toFixed(
      2
    )} MHz) and frequency plus half the bandwidth (${upperBound.toFixed(
      2
    )} MHz) both fall outside the allowed bands: ${allowedRangesText}.`;
  }
  if (!lowerBoundIsAllowed) {
    return `Frequency minus half the bandwidth (${lowerBound.toFixed(
      2
    )} MHz) falls outside the allowed bands: ${allowedRangesText}.`;
  }
  if (!upperBoundIsAllowed) {
    return `Frequency plus half the bandwidth (${upperBound.toFixed(
      2
    )} MHz) falls outside the allowed bands: ${allowedRangesText}.`;
  }

  return `The frequency range is not fully within one of the allowed bands: ${allowedRangesText}.`;
};

export const createFrequencyBandwidthCrossCheckSchema = (
  ranges: readonly FrequencyRange[] = DEFAULT_FREQUENCY_RANGES
) =>
  createFrequencyOnlySchema(ranges)
    .merge(transmittedBandwidthSchema)
    .superRefine((data, ctx) => {
      const centerFrequency = data.frequency;
      const bandwidth = data.transmitted_bandwidth;

      if (
        typeof centerFrequency !== 'number' ||
        typeof bandwidth !== 'number'
      ) {
        return;
      }

      const errorDetail = getFrequencyRangeError(
        centerFrequency,
        bandwidth,
        ranges
      );
      if (errorDetail) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: errorDetail,
          path: ['frequency'],
        });
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: errorDetail,
          path: ['transmitted_bandwidth'],
        });
      }

      if (bandwidth > 5 && !data.transmitted_bandwidth_justification) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Justification required when transmitted bandwidth is more than 5.',
          path: ['transmitted_bandwidth_justification'],
        });
      }
    });
