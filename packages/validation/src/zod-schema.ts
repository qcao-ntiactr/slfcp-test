import { z } from 'zod';
import { STATE_ABBREVIATIONS } from '@slfcp/utils';

import {
  fccFilingDateSchema,
  isoDateSchema,
  transmissionDateSchemas,
} from './transmission-date-schemas.js';
import {
  createFrequencyBandwidthCrossCheckSchema,
  DEFAULT_FREQUENCY_RANGES,
} from './frequency-and-transmitted-bandwidth-schemas.js';
import type { FrequencyRange } from './frequency-and-transmitted-bandwidth-schemas.js';
import { antennaUnitSchema, receiversSchema } from './receiver-schemas.js';

export {
  antennaUnitSchema,
  optionalReceiverSchema,
  receiverSchema,
  receiversSchema,
} from './receiver-schemas.js';

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
const createFrequencyFormSchema = (
  ranges: readonly FrequencyRange[] = DEFAULT_FREQUENCY_RANGES
) =>
  z.intersection(
    frequencySchema,
    z.intersection(
      transmissionDateSchemas,
      createFrequencyBandwidthCrossCheckSchema(ranges)
    )
  );

export const frequencyFormSchema = createFrequencyFormSchema();

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
const createFrequenciesTabBaseSchema = (itemSchema = frequencyFormSchema) =>
  z.object({
    number_of_frequencies: z.coerce
      .number({ message: 'Required' })
      .int('This field must be a whole number.')
      .min(1, 'At least 1 frequency is required.')
      .max(50, 'Maximum number of allowed frequencies is 50.'),
    frequencies: z.array(itemSchema).min(1).max(50),
  });

export const frequenciesTabBaseSchema = createFrequenciesTabBaseSchema();

const validateFrequencyCount = (
  data: { number_of_frequencies: number; frequencies: unknown[] },
  ctx: z.RefinementCtx
) => {
  if (data.number_of_frequencies !== data.frequencies.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        data.frequencies.length > 0
          ? `Only ${data.frequencies.length} out of ${data.number_of_frequencies} frequencies entered.`
          : 'No frequencies have been added.',
      path: ['number_of_frequencies'],
    });
  }
};

export const frequenciesTabSchema = frequenciesTabBaseSchema.superRefine(
  validateFrequencyCount
);

export const createFrequenciesTabSchema = (
  ranges: readonly FrequencyRange[] = DEFAULT_FREQUENCY_RANGES
) =>
  createFrequenciesTabBaseSchema(createFrequencyFormSchema(ranges)).superRefine(
    validateFrequencyCount
  );

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

export const createPortalFormSchema = (
  ranges: readonly FrequencyRange[] = DEFAULT_FREQUENCY_RANGES
) =>
  launchSiteSchema
    .and(createFrequenciesTabSchema(ranges))
    .and(additionalInfoSchema);

export const portalFormSchema = createPortalFormSchema();

export type PortalFormData = z.infer<typeof portalFormSchema>;

export type FrequencyFormData = z.infer<typeof frequencyFormSchema>;

type DeepPartial<T> = {
  [P in keyof T]: T[P] extends (infer U)[]
    ? DeepPartial<U>[]
    : T[P] extends Date
      ? T[P] | undefined
      : T[P] extends object | undefined
        ? DeepPartial<T[P]>
        : T[P] | undefined;
};

export type PortalFormDefaults = DeepPartial<PortalFormData>;
export type FrequencyFormDefaults = DeepPartial<FrequencyFormData>;
