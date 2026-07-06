import { z } from 'zod';

import {
  launchSiteSchema,
  frequencySchema,
  additionalInfoSchema,
} from './zod-schema.js';
import { getFrequencyRangeError } from './frequency-and-transmitted-bandwidth-schemas.js';

/**
 * Creates a modified version of the full portal form schema with validation
 * based on provided frequency ranges. The returned schema combines the launch
 * site schema, a customized frequency schema, and additional info schema.
 *
 * @param {Array} frequencyRanges - An array of frequency range objects, each containing
 *                                   'low' and 'high' properties defining the allowed ranges.
 * @throws {Error} Throws an error if `frequencyRanges` is not a non-empty array.
 *
 * @returns {z.ZodObject} A combined Zod schema that validates the portal form data
 *                        including the launch site, frequency-related data, and additional information.
 */

export const portalFormSchemaExtended = (frequencyRanges: unknown) => {
  if (!Array.isArray(frequencyRanges) || frequencyRanges.length === 0) {
    throw new Error('Invalid frequency ranges received from the service.');
  }

  const frequencyFormSchemaExtended = frequencySchema
    .extend({
      frequency: z.coerce.number({ message: 'Required' }),
      transmitted_bandwidth: z.coerce.number({ message: 'Required' }),
      transmitted_bandwidth_justification: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      const { frequency, transmitted_bandwidth } = data;

      if (
        typeof frequency !== 'number' ||
        typeof transmitted_bandwidth !== 'number'
      ) {
        return;
      }

      // Use the same error generation logic as the frontend
      const errorDetail = getFrequencyRangeError(
        frequency,
        transmitted_bandwidth
      );
      if (errorDetail) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['frequency'],
          message: errorDetail,
        });
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['transmitted_bandwidth'],
          message: errorDetail,
        });
      }

      if (
        transmitted_bandwidth > 5 &&
        !data.transmitted_bandwidth_justification
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['transmitted_bandwidth_justification'],
          message:
            'Justification is required when transmitted bandwidth exceeds 5 MHz.',
        });
      }
    });

  const frequenciesTabSchemaExtended = z
    .object({
      number_of_frequencies: z.coerce
        .number({ message: 'Required' })
        .int('This field must be a whole number.')
        .min(1, 'At least 1 frequency is required.')
        .max(50, 'Maximum number of allowed frequencies is 50.'),
      frequencies: z.array(frequencyFormSchemaExtended).min(1).max(50),
    })
    .superRefine((data, ctx) => {
      const noFrequenciesMessage = 'No frequencies have been added.';
      const insufficientFrequenciesMessage = `Only ${data.frequencies.length} out of ${data.number_of_frequencies} frequencies entered.`;

      if (data.number_of_frequencies !== data.frequencies.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            data.frequencies.length > 0
              ? insufficientFrequenciesMessage
              : noFrequenciesMessage,
          path: ['number_of_frequencies'],
        });
      }
    });

  return launchSiteSchema
    .and(frequenciesTabSchemaExtended)
    .and(additionalInfoSchema);
};
