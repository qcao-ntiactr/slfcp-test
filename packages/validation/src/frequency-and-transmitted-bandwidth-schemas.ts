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
  freq: number,
  bw: number,
  ranges: readonly FrequencyRange[] = DEFAULT_FREQUENCY_RANGES
): string | null => {
  const allowedRangesText = formatFrequencyRanges(ranges);

  const half = bw / 2;
  const low = freq - half;
  const high = freq + half;

  const fits = ranges.some(
    (range) =>
      freq >= range.low &&
      freq <= range.high &&
      low >= range.low &&
      high <= range.high
  );
  if (fits) return null;

  const lowOk = ranges.some((range) => low >= range.low && low <= range.high);
  const highOk = ranges.some(
    (range) => high >= range.low && high <= range.high
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
};

export const createFrequencyBandwidthCrossCheckSchema = (
  ranges: readonly FrequencyRange[] = DEFAULT_FREQUENCY_RANGES
) =>
  createFrequencyOnlySchema(ranges)
    .merge(transmittedBandwidthSchema)
    .superRefine((data, ctx) => {
      const freq = data.frequency;
      const bw = data.transmitted_bandwidth;

      if (typeof freq !== 'number' || typeof bw !== 'number') return;

      const errorDetail = getFrequencyRangeError(freq, bw, ranges);
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

      if (bw > 5 && !data.transmitted_bandwidth_justification) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Justification required when transmitted bandwidth is more than 5.',
          path: ['transmitted_bandwidth_justification'],
        });
      }
    });

