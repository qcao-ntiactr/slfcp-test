import { createPortalFormSchema } from './zod-schema.js';
import type { FrequencyRange } from './frequency-and-transmitted-bandwidth-schemas.js';

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
