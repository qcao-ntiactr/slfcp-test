import { FrequencyFormDefaults, PortalFormDefaults } from '@slfcp/validation';

export const frequencyFormDefaultValues: FrequencyFormDefaults = {
  frequency: undefined,
  location_of_transmitter_on_vehicle_or_platform: undefined,
  eirp: undefined,
  eirp_unit: 'Watts',
  transmitted_bandwidth: undefined,
  transmitted_bandwidth_is_signal_filtered: undefined,
  transmitted_bandwidth_justification: '',
  minus_3db_bandwidth: undefined,
  minus_3db_bandwidth_before_or_after_filtering: undefined,
  minus_20db_bandwidth: undefined,
  minus_20db_bandwidth_before_or_after_filtering: undefined,
  minus_60db_bandwidth: undefined,
  minus_60db_bandwidth_before_or_after_filtering: undefined,
  nature_of_modulating_signals: undefined,
  emission_designator: undefined,
  tx_transmission_start: undefined,
  tx_transmission_end: undefined,
  tx_antenna_type: undefined,
  tx_antenna_gain: undefined,
  tx_antenna_beamwidth: undefined,
  tx_antenna_altitude: undefined,
  tx_antenna_altitude_unit: 'ft',
  receivers: [
    {
      transmission_start: undefined,
      transmission_end: undefined,
      antenna_type: undefined,
      antenna_gain: undefined,
      antenna_beamwidth: undefined,
      antenna_altitude: undefined,
      antenna_altitude_unit: 'ft',
      location_of_receiving_ground_station: undefined,
      longitude_of_receiving_antenna: undefined,
      latitude_of_receiving_antenna: undefined,
    },
  ],
};

export const defaultValues: PortalFormDefaults = {
  // LAUNCH SITE TAB
  mission_name: undefined,
  name_of_licensee: undefined,
  call_sign: undefined,
  name_of_launch_vehicle: undefined,

  city: undefined,
  state: undefined,
  latitude: undefined,
  longitude: undefined,

  launch_datetime_primary: undefined,
  launch_datetime_backup: undefined,
  orbital_location: undefined,

  // FREQUENCIES TAB
  number_of_frequencies: undefined,
  frequencies: [],

  // ADDITIONAL INFO TAB
  ground_track_from_liftoff_until_payload_separation: undefined,
  ecf_cartesian_vectors_format_file_desc: undefined,
  ecf_cartesian_vectors_format_file: undefined,
  ground_track_of_launch_vehicle_2d_img_file_desc: undefined,
  ground_track_of_launch_vehicle_2d_img_file: undefined,
  fcc_filing_date: undefined,
  primary_poc_name: undefined,
  primary_poc_email: undefined,
  primary_poc_phone: undefined,
  alternate_poc_name: undefined,
  alternate_poc_email: undefined,
  alternate_poc_phone: undefined,
};
