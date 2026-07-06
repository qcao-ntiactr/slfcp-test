import { z } from 'zod';

type ReceiverType = {
  transmission_start: string;
  transmission_end: string;
  antenna_type: string;
  antenna_gain: number;
  antenna_beamwidth: number;
  antenna_altitude: number;
  antenna_altitude_unit: 'ft' | 'm' | 'km';
  location_of_receiving_ground_station:
    | 'first_stage'
    | 'second_stage'
    | 'ground';
  longitude_of_receiving_antenna: number;
  latitude_of_receiving_antenna: number;
};

export const isoDateSchema = z
  .string()
  .regex(
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z)$/,
    'Invalid ISO 8601 date format.'
  )
  .refine((value) => {
    const inputDate = new Date(value);
    if (!(inputDate instanceof Date) || isNaN(inputDate.getTime()))
      return false;

    const today = new Date();
    const todayUTC = new Date(
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
    );

    return inputDate >= todayUTC;
  }, 'Date must be in the future.');

export const fccFilingDateSchema = z
  .string()
  .regex(
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z)$/,
    'Invalid ISO 8601 date format.'
  );

export const frequencyTxDateSchema = z
  .object({
    tx_transmission_start: isoDateSchema,
    tx_transmission_end: isoDateSchema,
  })
  .superRefine((data, ctx) => {
    if (!data.tx_transmission_start || !data.tx_transmission_end) {
      return true; // "required" validation handled by base schema
    }
    if (data.tx_transmission_start > data.tx_transmission_end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Transmission Start Date must be earlier than Transmission End Date.',
        path: ['tx_transmission_start'],
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Transmission End Date must be later than Transmission Start Date.',
        path: ['tx_transmission_end'],
      });
    }
  });

// Schema for receiver date validation within the receivers array
export const frequencyReceiversDateSchema = z
  .object({
    tx_transmission_start: isoDateSchema,
    tx_transmission_end: isoDateSchema,
    receivers: z.array(z.any()).min(1),
  })
  .superRefine((data, ctx) => {
    if (!data.receivers || data.receivers.length === 0) return;

    // Validate each receiver's dates
    data.receivers.forEach((receiver: ReceiverType, index: number) => {
      if (!receiver) return;

      // Validate receiver internal date consistency
      if (receiver.transmission_start && receiver.transmission_end) {
        if (receiver.transmission_start > receiver.transmission_end) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'Transmission Start Date must be earlier than Transmission End Date.',
            path: ['receivers', index, 'transmission_start'],
          });
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'Transmission End Date must be later than Transmission Start Date.',
            path: ['receivers', index, 'transmission_end'],
          });
        }
      }

      // Validate receiver dates against transmitter dates
      if (
        data.tx_transmission_start &&
        data.tx_transmission_end &&
        receiver.transmission_start &&
        receiver.transmission_end
      ) {
        if (receiver.transmission_start < data.tx_transmission_start) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'Receiver Start Date cannot be before Transmission Start Date.',
            path: ['receivers', index, 'transmission_start'],
          });
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'Transmission Start Date cannot be after Receiver Start Date.',
            path: ['tx_transmission_start'],
          });
        }

        if (receiver.transmission_end < data.tx_transmission_start) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'Receiver End Date cannot be before Transmission Start Date.',
            path: ['receivers', index, 'transmission_end'],
          });
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'Transmission Start Date cannot be after Receiver End Date.',
            path: ['tx_transmission_start'],
          });
        }

        if (receiver.transmission_end < data.tx_transmission_end) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'Receiver End Date cannot be before Transmission End Date.',
            path: ['receivers', index, 'transmission_end'],
          });
        }
      }
    });
  });

export const transmissionDateSchemas = z.intersection(
  frequencyTxDateSchema,
  frequencyReceiversDateSchema
);
