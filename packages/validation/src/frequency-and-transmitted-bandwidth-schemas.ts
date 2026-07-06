import { z } from 'zod';

export const transmittedBandwidthSchema = z.object({
  transmitted_bandwidth: z.coerce
    .number({ message: 'Required' })
    .min(0.1, 'Required.')
    .max(99.99, 'Must be at most 99.99.'),
  transmitted_bandwidth_justification: z.string().optional(), // This field only shows if transmitted_bandwidth is more than 5
});

const frequencyOnlySchema = z.object({
  frequency: z.coerce
    .number({ message: 'Required' })
    .refine(
      (val) =>
        (val >= 2025 && val <= 2110) ||
        (val >= 2200 && val <= 2290) ||
        (val >= 2360 && val <= 2395),
      {
        message:
          'Frequency must be within the following ranges: 2025-2110, 2200-2290, 2360-2395',
      }
    ),
});

export const getFrequencyRangeError = (
  freq: number,
  bw: number
): string | null => {
  const ranges = [
    { min: 2025, max: 2110 },
    { min: 2200, max: 2290 },
    { min: 2360, max: 2395 },
  ];

  const allowedRangesText = '2025–2110 MHz, 2200–2290 MHz, or 2360–2395 MHz';

  const half = bw / 2;
  const low = freq - half;
  const high = freq + half;

  const fits = ranges.some(
    (r) => freq >= r.min && freq <= r.max && low >= r.min && high <= r.max
  );
  if (fits) return null;

  const lowOk = ranges.some((r) => low >= r.min && low <= r.max);
  const highOk = ranges.some((r) => high >= r.min && high <= r.max);

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

export const frequencyBandwidthCrossCheckSchema = frequencyOnlySchema
  .merge(transmittedBandwidthSchema)
  .superRefine((data, ctx) => {
    const freq = data.frequency;
    const bw = data.transmitted_bandwidth;

    if (typeof freq !== 'number' || typeof bw !== 'number') return;

    const errorDetail = getFrequencyRangeError(freq, bw);
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
