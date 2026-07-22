import { createPortalFormSchema } from './zod-schema.js';
import { FrequencyRange } from './frequency-and-transmitted-bandwidth-schemas.js';

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
  if (
    !Array.isArray(frequencyRanges) ||
    frequencyRanges.length === 0 ||
    !frequencyRanges.every(
      (range): range is FrequencyRange =>
        typeof range === 'object' &&
        range !== null &&
        typeof range.low === 'number' &&
        typeof range.high === 'number' &&
        range.low <= range.high
    )
  ) {
    throw new Error('Invalid frequency ranges received from the service.');
  }

  return createPortalFormSchema(frequencyRanges);
};
