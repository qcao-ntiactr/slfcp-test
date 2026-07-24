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

function getSchemaFieldNames<T extends z.ZodRawShape>(
  schema: z.ZodObject<T> | z.ZodEffects<z.ZodObject<T>>
) {
  const objectSchema =
    schema instanceof z.ZodEffects ? schema.sourceType() : schema;
  return Object.keys(objectSchema.shape) as Array<keyof T & string>;
}

export const requestWizardSteps = (
  ranges: readonly FrequencyRange[] = DEFAULT_FREQUENCY_RANGES
) => {
  const frequenciesSchema = createFrequenciesTabSchema(ranges);

  return {
    launchSite: {
      fields: getSchemaFieldNames(launchSiteSchema),
      schema: launchSiteSchema,
    },
    frequencies: {
      fields: getSchemaFieldNames(frequenciesSchema),
      schema: frequenciesSchema,
    },
    additionalInformation: {
      fields: getSchemaFieldNames(additionalInfoSchema),
      schema: additionalInfoSchema,
    },
  } as const;
};
