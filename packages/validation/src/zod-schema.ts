import { z } from 'zod';
import { STATE_ABBREVIATIONS } from '@slfcp/utils';

import {
  fccFilingDateSchema,
  isoDateSchema,
  transmissionDateSchemas,
} from './transmission-date-schemas.js';
import { frequencyBandwidthCrossCheckSchema } from './frequency-and-transmitted-bandwidth-schemas.js';

const cityNameRegex = /^[A-Za-z]+(?:[ .'-][A-Za-z]+)*$/;
const nameRegex = /^[A-Za-z]+(?:[ '-][\p{L}]+)*$/u;

export const phoneSchema = z
  .string()
  .trim()
  .min(1, 'Required')
  .length(12, { message: 'Must be a valid US phone number (xxx-xxx-xxxx).' })
  .refine(
    (val) => {
      const phoneRegex = /^\d{3}-\d{3}-\d{4}$/;
      if (val.length === 12) return phoneRegex.test(val);
    },
    {
      message: 'Must be a valid US phone number (xxx-xxx-xxxx).',
    }
  );

export const antennaUnitSchema = z.enum(['ft', 'm', 'km']);

// Base receiver schema with consistent field definitions
const baseReceiverSchema = z.object({
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
  antenna_altitude: z.coerce
    .number({ message: 'Required' })
    .min(-300, 'Must be at least -300.')
    .max(99999, 'Must be at most 99999.'),
  antenna_altitude_unit: antennaUnitSchema,
  location_of_receiving_ground_station: z.enum(
    ['first_stage', 'second_stage', 'ground'],
    { errorMap: () => ({ message: 'Required' }) }
  ),
  longitude_of_receiving_antenna: z.coerce
    .number({ message: 'Required' })
    .min(-180, 'Must be at least -180.')
    .max(180, 'Must be at most 180.'),
  latitude_of_receiving_antenna: z.coerce
    .number({ message: 'Required' })
    .min(-90, 'Must be at least -90.')
    .max(90, 'Must be at most 90.'),
});

export const receiverSchema = baseReceiverSchema;

export const optionalReceiverSchema = baseReceiverSchema.partial();

export const receiversSchema = z
  .array(optionalReceiverSchema)
  .min(1, 'At least 1 receiver is required.')
  .superRefine((receivers, ctx) => {
    if (receivers.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least 1 receiver is required.',
        path: [],
      });
      return;
    }

    // Validate that the first receiver has all required fields
    const firstReceiver = receivers[0];
    const requiredFields = [
      'transmission_start',
      'transmission_end',
      'antenna_type',
      'antenna_gain',
      'antenna_beamwidth',
      'antenna_altitude',
      'antenna_altitude_unit',
      'location_of_receiving_ground_station',
      'longitude_of_receiving_antenna',
      'latitude_of_receiving_antenna',
    ] as const;

    requiredFields.forEach((field) => {
      const value = firstReceiver[field];
      if (value === undefined || value === null || value === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Required',
          path: [0, field],
        });
      }
    });

    // Validate optional receivers conditionally (any receiver after the first one)
    for (let i = 1; i < receivers.length; i++) {
      const receiver = receivers[i];

      // Check if any field in this receiver has a value (isDirty)
      const hasAnyValue = Object.entries(receiver).some(([key, value]) => {
        if (key === 'antenna_altitude_unit') return false; // Skip default unit value
        // More robust check for meaningful values
        if (value === undefined || value === null || value === '') return false;
        // For strings, check if it's not just whitespace
        if (typeof value === 'string' && value.trim() === '') return false;
        return true;
      });

      if (hasAnyValue) {
        // If any field has a value, all fields become required
        requiredFields.forEach((field) => {
          const value = receiver[field];
          if (value === undefined || value === null || value === '') {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Required',
              path: [i, field],
            });
          }
        });
      }
    }
  });

export const frequencySchema = z.object({
  location_of_transmitter_on_vehicle_or_platform: z.enum(
    ['first_stage', 'second_stage', 'ground'],
    /* errorMap is how to set a custom error message on z.enum
      see github issue: https://github.com/colinhacks/zod/issues/580
      */
    { errorMap: () => ({ message: 'Required' }) }
  ),
  eirp: z.coerce
    .number({ message: 'Required' })
    .min(0.1, 'Required')
    .max(999.99, 'Must be at most 999.99.'),
  eirp_unit: z.enum(['Watts', 'dBW', 'milliWatts', 'dBm']),
  transmitted_bandwidth_is_signal_filtered: z.enum([
    'filtered',
    'not_filtered',
  ]),
  minus_3db_bandwidth: z.coerce
    .number({ message: 'Required' })
    .min(-99.99, 'Must be at least -99.99.')
    .max(99.99, 'Must be at most 99.99.'),
  minus_3db_bandwidth_before_or_after_filtering: z.enum([
    'before_filtering',
    'after_filtering',
  ]),
  minus_20db_bandwidth: z.coerce
    .number({ message: 'Required' })
    .min(-99.99, 'Must be at least -99.99.')
    .max(99.99, 'Must be at most 99.99.'),
  minus_20db_bandwidth_before_or_after_filtering: z.enum([
    'before_filtering',
    'after_filtering',
  ]),
  minus_60db_bandwidth: z.coerce
    .number({ message: 'Required' })
    .min(-99.99, 'Must be at least -99.99')
    .max(99.99, 'Must be at most 99.99.'),
  minus_60db_bandwidth_before_or_after_filtering: z.enum([
    'before_filtering',
    'after_filtering',
  ]),
  nature_of_modulating_signals: z
    .string()
    .trim()
    .min(1, 'Required')
    .max(14, 'Must be 14 characters or fewer.'),
  emission_designator: z
    .string()
    .trim()
    .min(1, 'Required')
    .max(14, 'Must be 14 characters or fewer.'),
  tx_antenna_type: z
    .string()
    .trim()
    .min(1, 'Required')
    .max(50, 'Must be 50 characters or fewer.'),
  tx_antenna_gain: z.coerce
    .number({ message: 'Required' })
    .min(0.1, 'Required')
    .max(99, 'Must be at most 99.'),
  tx_antenna_beamwidth: z.coerce
    .number({ message: 'Required' })
    .min(0.1, 'Required')
    .max(360, 'Must be at most 360.'),
  tx_antenna_altitude: z.coerce
    .number({ message: 'Required' })
    .min(-300, 'Must be at least -300.')
    .max(99999, 'Must be at most 99999.'),
  tx_antenna_altitude_unit: antennaUnitSchema,
  receivers: receiversSchema,
});

/*
  Using z.intersection to add the date field & transmitted-bandwidth-justification
  validation allows the refine logic to run while the user is filling out the form
  (zod's default behavior is to run superRefine AFTER the rest of the form is valid)
  */
export const frequencyFormSchema = z.intersection(
  frequencySchema,
  z.intersection(transmissionDateSchemas, frequencyBandwidthCrossCheckSchema)
);

//LAUNCH SITE TAB
export const launchSiteSchema = z.object({
  mission_name: z
    .string()
    .trim()
    .min(1, 'Required')
    .max(50, 'Must be 50 characters or fewer.'),
  name_of_licensee: z.string().trim().min(1, 'Required'),
  call_sign: z
    .string()
    .trim()
    .min(1, 'Required')
    .max(8, 'Must be 8 characters or fewer.'),
  name_of_launch_vehicle: z
    .string()
    .trim()
    .min(1, 'Required')
    .max(50, 'Must be 50 characters or fewer.'),
  city: z
    .string()
    .trim()
    .min(1, 'Required')
    .max(25, 'Must be 25 characters or fewer.')
    .regex(cityNameRegex, 'Must be a valid city name.'),
  state: z.enum(STATE_ABBREVIATIONS),
  latitude: z.coerce
    .number({ message: 'Required' })
    .min(-90, 'Must be at least -90.')
    .max(90, 'Must be at most 90.'),
  longitude: z.coerce
    .number({ message: 'Required' })
    .min(-180, 'Must be at least -180.')
    .max(180, 'Must be at most 180.'),

  launch_datetime_primary: isoDateSchema,
  launch_datetime_backup: isoDateSchema,
  orbital_location: z.string().trim().nullable().optional(),
});

// FREQUENCIES TAB
export const frequenciesTabSchema = z
  .object({
    number_of_frequencies: z.coerce
      .number({ message: 'Required' })
      .min(1, 'At least 1 frequency is required.')
      .max(50, 'Maximum number of allowed frequencies is 50.'),
    frequencies: z.array(frequencyFormSchema).min(1).max(50),
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

const ACCEPTED_FILE_TYPES = {
  image: ['image/jpeg', 'image/jpg', 'image/png'],
  excel: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
};

const imageFileSchema = z
  .any()
  .refine((file) => file !== undefined, 'Required')
  .refine(
    (file) => ACCEPTED_FILE_TYPES.image.includes(file?.type),
    'File must be .jpg, .jpeg, or .png format.'
  );

const excelFileSchema = z
  .any()
  .refine((file) => file !== undefined, 'Required')
  .refine(
    (file) => ACCEPTED_FILE_TYPES.excel.includes(file?.type),
    'File must be .xls or .xlsx format.'
  );

//ADDITIONAL INFORMATION TAB
export const additionalInfoSchema = z.object({
  ground_track_from_liftoff_until_payload_separation: z
    .string()
    .trim()
    .min(1, 'Required'),
  ecf_cartesian_vectors_format_file_desc: z.string().min(1, 'Required'),
  ecf_cartesian_vectors_format_file: excelFileSchema,
  ground_track_of_launch_vehicle_2d_img_file_desc: z
    .string()
    .trim()
    .min(1, 'Required'),
  ground_track_of_launch_vehicle_2d_img_file: imageFileSchema,
  fcc_filing_date: z.union([fccFilingDateSchema, z.literal('')]).optional(),
  primary_poc_name: z
    .string()
    .trim()
    .min(1, 'Required')
    .max(50, 'Must be 50 characters or fewer.')
    .regex(nameRegex, 'Must be a valid name.'),
  primary_poc_email: z
    .string()
    .trim()
    .email('Must be a valid email address.')
    .min(1, 'Required')
    .max(50, 'Must be 50 characters or fewer.')
    .regex(/^[A-Za-z]/, 'Must be a valid email address.'),
  primary_poc_phone: phoneSchema,
  alternate_poc_name: z
    .string()
    .trim()
    .min(1, 'Required')
    .max(50, 'Must be 50 characters or fewer.')
    .regex(nameRegex, 'Must be a valid name.'),
  alternate_poc_email: z
    .string()
    .trim()
    .email('Must be a valid email address.')
    .min(1, 'Required')
    .max(50, 'Must be 50 characters or fewer.')
    .regex(/^[A-Za-z]/, 'Must be a valid email address.'),
  alternate_poc_phone: phoneSchema,
});

export const portalFormSchema = launchSiteSchema
  .and(frequenciesTabSchema)
  .and(additionalInfoSchema);

export type PortalFormData = z.infer<typeof portalFormSchema>;

export type FrequencyFormData = z.infer<typeof frequencyFormSchema>;

type RecursivePartial<T> = {
  [P in keyof T]: T[P] extends (infer U)[] // For each property P in T, make it optional // If T[P] is an array
    ? RecursivePartial<U>[] // Apply RecursivePartial to the items in the array
    : T[P] extends Date // Special case for Date
      ? T[P] | undefined // Allow Date or undefined
      : T[P] extends object | undefined // If T[P] is an object or undefined
        ? RecursivePartial<T[P]> // Apply RecursivePartial to the nested object
        : T[P] | undefined; // Otherwise, just use T[P] as is
};

export type PortalFormDefaults = RecursivePartial<PortalFormData>;
export type FrequencyFormDefaults = RecursivePartial<FrequencyFormData>;
