import { FieldValues } from 'react-hook-form';
import { FrequencyFormDefaults } from '@slfcp/validation';

import { frequencyFormDefaultValues } from '../../utils/DefaultValues';

export const receiver2FieldNames = [
  'receivers.1.transmission_start',
  'receivers.1.transmission_end',
  'receivers.1.antenna_type',
  'receivers.1.antenna_gain',
  'receivers.1.antenna_beamwidth',
  'receivers.1.antenna_altitude',
  'receivers.1.location_of_receiving_ground_station',
  'receivers.1.longitude_of_receiving_antenna',
  'receivers.1.latitude_of_receiving_antenna',
] as const;

export const createEmptyReceiver = () => ({
  ...frequencyFormDefaultValues.receivers[0],
});

export const normalizeFrequencyFormData = (
  data: FieldValues | FrequencyFormDefaults,
  shouldIncludeReceiver2 = true
): FrequencyFormDefaults => {
  const nextData = { ...data } as FrequencyFormDefaults;
  const nextReceivers = Array.isArray(nextData.receivers)
    ? nextData.receivers.filter(Boolean)
    : [];

  const normalizedReceivers = shouldIncludeReceiver2
    ? nextReceivers.slice(0, 2)
    : nextReceivers.slice(0, 1);

  return {
    ...nextData,
    receivers:
      normalizedReceivers.length > 0
        ? normalizedReceivers
        : [createEmptyReceiver()],
  };
};
