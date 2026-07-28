import { z } from 'zod';

import { isoDateSchema } from './transmission-date-schemas.js';

export const antennaUnitSchema = z.enum(['ft', 'm', 'km']);

const valueIsBlank = (value: unknown) =>
  value === undefined ||
  value === null ||
  value === '' ||
  (typeof value === 'string' && value.trim() === '');

const requiredNumber = (schema: z.ZodNumber) =>
  z.preprocess((value) => (valueIsBlank(value) ? undefined : value), schema);

const receiverFieldsSchema = z.object({
  transmission_start: isoDateSchema,
  transmission_end: isoDateSchema,
  antenna_type: z
    .string()
    .trim()
    .min(1, 'Required')
    .max(100, 'Must be 100 characters or fewer.'),
  antenna_gain: z.coerce
    .number({ message: 'Required' })
    .min(0.1, 'Must be at least 0.1')
    .max(99, 'Must be at most 99.'),
  antenna_beamwidth: z.coerce
    .number({ message: 'Required' })
    .min(0.1, 'Must be at least 0.1')
    .max(360, 'Must be at most 360.'),
  antenna_altitude: requiredNumber(
    z.coerce
      .number({ message: 'Required' })
      .min(-300, 'Must be at least -300.')
      .max(99999, 'Must be at most 99999.')
  ),
  antenna_altitude_unit: antennaUnitSchema,
  location_of_receiving_ground_station: z.enum(
    ['first_stage', 'second_stage', 'ground'],
    { errorMap: () => ({ message: 'Required' }) }
  ),
  longitude_of_receiving_antenna: requiredNumber(
    z.coerce
      .number({ message: 'Required' })
      .min(-180, 'Must be at least -180.')
      .max(180, 'Must be at most 180.')
  ),
  latitude_of_receiving_antenna: requiredNumber(
    z.coerce
      .number({ message: 'Required' })
      .min(-90, 'Must be at least -90.')
      .max(90, 'Must be at most 90.')
  ),
});

export const receiverSchema = receiverFieldsSchema;
export const optionalReceiverSchema = receiverFieldsSchema.partial();

const receiverDraftSchema = z.object(
  Object.fromEntries(
    Object.keys(receiverFieldsSchema.shape).map((fieldName) => [
      fieldName,
      z.unknown().optional(),
    ])
  ) as Record<
    keyof z.infer<typeof receiverFieldsSchema>,
    z.ZodOptional<z.ZodUnknown>
  >
);

const REQUIRED_RECEIVER_FIELDS = Object.keys(
  receiverFieldsSchema.shape
) as Array<keyof z.infer<typeof receiverFieldsSchema>>;

const receiverHasUserInput = (receiver: z.infer<typeof receiverDraftSchema>) =>
  Object.entries(receiver).some(
    ([fieldName, value]) =>
      fieldName !== 'antenna_altitude_unit' && !valueIsBlank(value)
  );

const addMissingFieldIssues = (
  receiver: z.infer<typeof receiverDraftSchema>,
  receiverIndex: number,
  context: z.RefinementCtx
) => {
  REQUIRED_RECEIVER_FIELDS.forEach((fieldName) => {
    if (valueIsBlank(receiver[fieldName])) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Required',
        path: [receiverIndex, fieldName],
      });
    }
  });
};

const removeBlankValues = (receiver: z.infer<typeof receiverDraftSchema>) =>
  Object.fromEntries(
    Object.entries(receiver).filter(([, value]) => !valueIsBlank(value))
  );

export const receiversSchema = z
  .array(receiverDraftSchema)
  .min(1, 'At least 1 receiver is required.')
  .superRefine((receivers, context) => {
    const firstReceiver = receivers[0];
    if (!firstReceiver) {
      return;
    }

    addMissingFieldIssues(firstReceiver, 0, context);

    receivers.slice(1).forEach((receiver, index) => {
      if (receiverHasUserInput(receiver)) {
        addMissingFieldIssues(receiver, index + 1, context);
      }
    });
  })
  .transform((receivers) => receivers.map(removeBlankValues))
  .pipe(z.array(optionalReceiverSchema));
