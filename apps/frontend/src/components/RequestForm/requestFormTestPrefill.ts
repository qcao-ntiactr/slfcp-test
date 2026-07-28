import type {
  FrequencyFormDefaults,
  PortalFormDefaults,
} from '@slfcp/validation';

const futureDate = (daysFromNow: number, hour: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

const createLaunchSiteValues = (): Partial<PortalFormDefaults> => ({
  mission_name: 'Test Launch Mission',
  name_of_licensee: 'Test Launch Provider',
  call_sign: 'TEST001',
  name_of_launch_vehicle: 'Test Launch Vehicle',
  city: 'Cape Canaveral',
  state: 'FL',
  latitude: 28.3922,
  longitude: -80.6077,
  launch_datetime_primary: futureDate(30, 8),
  launch_datetime_backup: futureDate(31, 8),
  orbital_location: 'Test orbital location',
});

const createFrequencyValues = (): FrequencyFormDefaults => ({
  frequency: 2050,
  location_of_transmitter_on_vehicle_or_platform: 'first_stage',
  eirp: 100,
  eirp_unit: 'dBW',
  transmitted_bandwidth: 6,
  transmitted_bandwidth_is_signal_filtered: 'filtered',
  transmitted_bandwidth_justification: 'Test bandwidth justification',
  minus_3db_bandwidth: 3,
  minus_3db_bandwidth_before_or_after_filtering: 'before_filtering',
  minus_20db_bandwidth: 10,
  minus_20db_bandwidth_before_or_after_filtering: 'after_filtering',
  minus_60db_bandwidth: 20,
  minus_60db_bandwidth_before_or_after_filtering: 'after_filtering',
  nature_of_modulating_signals: 'Digital',
  emission_designator: '16K0F3E',
  tx_transmission_start: futureDate(20, 8),
  tx_transmission_end: futureDate(20, 9),
  tx_antenna_type: 'Patch Antenna',
  tx_antenna_gain: 12.5,
  tx_antenna_beamwidth: 45,
  tx_antenna_altitude: 100,
  tx_antenna_altitude_unit: 'm',
  receivers: [
    {
      transmission_start: futureDate(20, 8),
      transmission_end: futureDate(20, 9),
      antenna_type: 'Dish Antenna',
      antenna_gain: 12.5,
      antenna_beamwidth: 45,
      antenna_altitude: 100,
      antenna_altitude_unit: 'ft',
      location_of_receiving_ground_station: 'ground',
      latitude_of_receiving_antenna: 10.1234,
      longitude_of_receiving_antenna: -70.5678,
    },
  ],
});

const createAdditionalInformationValues =
  (): Partial<PortalFormDefaults> => ({
    ground_track_from_liftoff_until_payload_separation:
      'Test ground track description',
    ecf_cartesian_vectors_format_file_desc:
      'Test ECF Cartesian vectors file',
    ground_track_of_launch_vehicle_2d_img_file_desc:
      'Test launch vehicle ground track image',
    fcc_filing_date: '',
    primary_poc_name: 'Test Contact',
    primary_poc_email: 'test.contact@example.com',
    primary_poc_phone: '202-555-0100',
    alternate_poc_name: 'Backup Contact',
    alternate_poc_email: 'backup.contact@example.com',
    alternate_poc_phone: '202-555-0101',
  });

export const createRequestFormTestPrefill = (activeStep: number) => {
  if (activeStep === 0) {
    return { requestValues: createLaunchSiteValues() };
  }

  if (activeStep === 1) {
    return {
      requestValues: {
        number_of_frequencies: 1,
        frequencies: [],
      } satisfies Partial<PortalFormDefaults>,
      frequencyValues: createFrequencyValues(),
    };
  }

  if (activeStep === 2) {
    return { requestValues: createAdditionalInformationValues() };
  }

  return {};
};
