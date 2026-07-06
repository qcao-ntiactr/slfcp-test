import { FrequencyFormDefaults, PortalFormDefaults } from '@slfcp/validation';
export type KeySubset<T> = (keyof T)[];

export const tabNames: string[] = [
  'Launch Site',
  'Frequencies',
  'Additional Information',
  'Summary',
];

export const launchSiteFields: KeySubset<PortalFormDefaults> = [
  'mission_name',
  'name_of_licensee',
  'call_sign',
  'name_of_launch_vehicle',
  'city',
  'state',
  'latitude',
  'longitude',
  'launch_datetime_primary',
  'launch_datetime_backup',
  'orbital_location',
];

export const frequenciesTabFields: KeySubset<PortalFormDefaults> = [
  'number_of_frequencies',
  'frequencies', // this refers to an array of subfields based on frequencyFormSchema
];

export const additionalInfoFields: KeySubset<PortalFormDefaults> = [
  'ground_track_from_liftoff_until_payload_separation',
  'ecf_cartesian_vectors_format_file_desc',
  'ecf_cartesian_vectors_format_file',
  'ground_track_of_launch_vehicle_2d_img_file_desc',
  'ground_track_of_launch_vehicle_2d_img_file',
  'fcc_filing_date',
  'primary_poc_name',
  'primary_poc_email',
  'primary_poc_phone',
  'alternate_poc_name',
  'alternate_poc_email',
  'alternate_poc_phone',
];

export const frequencyFields: KeySubset<FrequencyFormDefaults> = [
  'frequency',
  'location_of_transmitter_on_vehicle_or_platform',
  'eirp',
  'eirp_unit',
  'transmitted_bandwidth',
  'transmitted_bandwidth_justification',
  'minus_3db_bandwidth',
  'minus_3db_bandwidth_before_or_after_filtering',
  'minus_20db_bandwidth',
  'minus_20db_bandwidth_before_or_after_filtering',
  'minus_60db_bandwidth',
  'minus_60db_bandwidth_before_or_after_filtering',
  'nature_of_modulating_signals',
  'emission_designator',
  'tx_transmission_start',
  'tx_transmission_end',
  'tx_antenna_type',
  'tx_antenna_gain',
  'tx_antenna_beamwidth',
  'tx_antenna_altitude',
  'tx_antenna_altitude_unit',
  'receivers',
];
