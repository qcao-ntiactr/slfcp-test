import { z } from 'zod';

import {
  additionalInfoSchema,
  createFrequenciesTabSchema,
  launchSiteSchema,
} from './zod-schema.js';
import {
  DEFAULT_FREQUENCY_RANGES,
  FrequencyRange,
} from './frequency-and-transmitted-bandwidth-schemas.js';

function schemaKeys<T extends z.ZodRawShape>(
  schema: z.ZodObject<T> | z.ZodEffects<z.ZodObject<T>>
) {
  const objectSchema =
    schema instanceof z.ZodEffects ? schema.sourceType() : schema;
  return Object.keys(objectSchema.shape) as Array<keyof T & string>;
}

/**
 * Shared validation metadata for the request wizard. UI labels and components
 * deliberately remain in the frontend, while field ownership and validation
 * live beside the schemas that define them.
 */
export const requestWizardSteps = (
  ranges: readonly FrequencyRange[] = DEFAULT_FREQUENCY_RANGES
) => {
  const frequenciesSchema = createFrequenciesTabSchema(ranges);

  return {
    launchSite: {
      fields: schemaKeys(launchSiteSchema),
      schema: launchSiteSchema,
    },
    frequencies: {
      fields: schemaKeys(frequenciesSchema),
      schema: frequenciesSchema,
    },
    additionalInformation: {
      fields: schemaKeys(additionalInfoSchema),
      schema: additionalInfoSchema,
    },
  } as const;
};
