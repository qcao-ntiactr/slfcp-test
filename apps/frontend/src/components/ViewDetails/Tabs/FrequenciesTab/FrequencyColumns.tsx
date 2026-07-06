import { ReactElement } from 'react';
import { format } from 'date-fns';
import { Frequency } from 'apps/frontend/src/types';

import {
  getDirection,
  normalizeCoordValue,
} from '../../../RequestForm/Fields/CoordinateField/utils/CoordinateHelpers';

export type frequencyColumnT = {
  header: string;
  key: string;
  //eslint-disable-next-line no-unused-vars
  render: (f: Frequency) => string | number | ReactElement;
};

const getBaseColumns = (): frequencyColumnT[] => [
  {
    header: 'Frequency Value',
    key: 'frequency',
    render: (f: Frequency) => f?.frequency,
  },
  {
    header: 'Location of Transmitter on Launch Vehicle or Platform',
    key: 'location_of_transmitter_on_vehicle_or_platform',
    render: (f: Frequency) =>
      f?.location_of_transmitter_on_vehicle_or_platform
        ?.split('_')
        ?.map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        ?.join(' '),
  },
  {
    header: 'Transmitted Bandwidth',
    key: 'transmitted_bandwidth',
    render: (f: Frequency) => f?.transmitted_bandwidth,
  },
  {
    header: 'Signal Filtered',
    key: 'transmitted_bandwidth_is_signal_filtered',
    render: (f: Frequency) =>
      f?.transmitted_bandwidth_is_signal_filtered === 'filtered' ? 'yes' : 'no',
  },
  {
    header: 'Bandwidth Justification',
    key: 'transmitted_bandwidth_justification',
    render: (f: Frequency) => f?.transmitted_bandwidth_justification,
  },
  {
    header: '-3dB Bandwidth',
    key: 'minus_3db_bandwidth',
    render: (f: Frequency) => f?.minus_3db_bandwidth,
  },
  {
    header: 'Before/After Filtering',
    key: 'minus_3db_bandwidth_before_or_after_filtering',
    render: (f: Frequency) =>
      f?.minus_3db_bandwidth_before_or_after_filtering.split('_')[0],
  },
  {
    header: '-20dB Bandwidth',
    key: 'minus_20db_bandwidth',
    render: (f: Frequency) => f?.minus_20db_bandwidth,
  },
  {
    header: 'Before/After Filtering',
    key: 'minus_20db_bandwidth_before_or_after_filtering',
    render: (f: Frequency) =>
      f?.minus_20db_bandwidth_before_or_after_filtering.split('_')[0],
  },
  {
    header: '-60dB Bandwidth',
    key: 'minus_60db_bandwidth',
    render: (f: Frequency) => f?.minus_60db_bandwidth,
  },
  {
    header: 'Before/After Filtering',
    key: 'minus_60db_bandwidth_before_or_after_filtering',
    render: (f: Frequency) =>
      f?.minus_60db_bandwidth_before_or_after_filtering.split('_')[0],
  },
  {
    header: 'Modulating Signals',
    key: 'nature_of_modulating_signals',
    render: (f: Frequency) => f?.nature_of_modulating_signals,
  },
  {
    header: 'Emission Designator',
    key: 'emission_designator',
    render: (f: Frequency) => f?.emission_designator,
  },
  {
    header: 'Tx Start',
    key: 'tx_transmission_start',
    render: (f: Frequency) =>
      format(new Date(f?.tx_transmission_start), 'MM-dd-yyyy hh:mm a'),
  },
  {
    header: 'Tx End',
    key: 'tx_transmission_end',
    render: (f: Frequency) =>
      format(new Date(f?.tx_transmission_end), 'MM-dd-yyyy hh:mm a'),
  },
  {
    header: 'Tx Antenna Type',
    key: 'tx_antenna_type',
    render: (f: Frequency) => f?.tx_antenna_type,
  },
  {
    header: 'Tx Antenna Gain',
    key: 'tx_antenna_gain',
    render: (f: Frequency) => `${f?.tx_antenna_gain} dBi`,
  },
  {
    header: 'Tx Antenna Beamwidth',
    key: 'tx_antenna_beamwidth',
    render: (f: Frequency) => f?.tx_antenna_beamwidth,
  },
  {
    header: 'Tx Antenna Altitude',
    key: 'tx_antenna_altitude',
    render: (f: Frequency) =>
      `${f.tx_antenna_altitude} ${f.tx_antenna_altitude_unit}`,
  },
  {
    header: 'EIRP',
    key: 'eirp',
    render: (f: Frequency) => `${f?.eirp} ${f?.eirp_unit}`,
  },
];

const getReceiverColumns = (receiverIndex: number): frequencyColumnT[] => {
  const rxPrefix = receiverIndex === 0 ? 'Rx 1' : `Rx ${receiverIndex + 1}`;

  return [
    {
      header: `${rxPrefix} Start`,
      key: `receiver_${receiverIndex}_transmission_start`,
      render: (f: Frequency) => {
        const receiver = f?.receivers?.[receiverIndex];
        return receiver?.transmission_start
          ? format(new Date(receiver.transmission_start), 'MM-dd-yyyy hh:mm a')
          : '';
      },
    },
    {
      header: `${rxPrefix} End`,
      key: `receiver_${receiverIndex}_transmission_end`,
      render: (f: Frequency) => {
        const receiver = f?.receivers?.[receiverIndex];
        return receiver?.transmission_end
          ? format(new Date(receiver.transmission_end), 'MM-dd-yyyy hh:mm a')
          : '';
      },
    },
    {
      header: `${rxPrefix} Antenna Type`,
      key: `receiver_${receiverIndex}_antenna_type`,
      render: (f: Frequency) => {
        const receiver = f?.receivers?.[receiverIndex];
        return receiver?.antenna_type || '';
      },
    },
    {
      header: `${rxPrefix} Antenna Gain`,
      key: `receiver_${receiverIndex}_antenna_gain`,
      render: (f: Frequency) => {
        const receiver = f?.receivers?.[receiverIndex];
        return receiver?.antenna_gain ? `${receiver.antenna_gain} dBi` : '';
      },
    },
    {
      header: `${rxPrefix} Antenna Beamwidth`,
      key: `receiver_${receiverIndex}_antenna_beamwidth`,
      render: (f: Frequency) => {
        const receiver = f?.receivers?.[receiverIndex];
        return receiver?.antenna_beamwidth || '';
      },
    },
    {
      header: `${rxPrefix} Antenna Altitude`,
      key: `receiver_${receiverIndex}_antenna_altitude`,
      render: (f: Frequency) => {
        const receiver = f?.receivers?.[receiverIndex];
        return receiver?.antenna_altitude && receiver?.antenna_altitude_unit
          ? `${receiver.antenna_altitude} ${receiver.antenna_altitude_unit}`
          : '';
      },
    },
    {
      header: `${rxPrefix} Location of Receiving Ground Station`,
      key: `receiver_${receiverIndex}_location_of_receiving_ground_station`,
      render: (f: Frequency) => {
        const receiver = f?.receivers?.[receiverIndex];
        return receiver?.location_of_receiving_ground_station
          ? receiver.location_of_receiving_ground_station
              .split('_')
              .map(
                (word) =>
                  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              )
              .join(' ')
          : '';
      },
    },
    {
      header: `${rxPrefix} Latitude`,
      key: `receiver_${receiverIndex}_latitude_of_receiving_antenna`,
      render: (f: Frequency) => {
        const receiver = f?.receivers?.[receiverIndex];
        if (!receiver?.latitude_of_receiving_antenna) return '';

        const value = receiver.latitude_of_receiving_antenna;
        const displayVal = normalizeCoordValue(value.toString());
        const direction = getDirection('latitude', value);

        return `${direction} ${displayVal}`;
      },
    },
    {
      header: `${rxPrefix} Longitude`,
      key: `receiver_${receiverIndex}_longitude_of_receiving_antenna`,
      render: (f: Frequency) => {
        const receiver = f?.receivers?.[receiverIndex];
        if (!receiver?.longitude_of_receiving_antenna) return '';

        const value = receiver.longitude_of_receiving_antenna;
        const displayVal = normalizeCoordValue(value.toString());
        const direction = getDirection('longitude', value);

        return `${direction} ${displayVal}`;
      },
    },
  ];
};

export const generateFrequencyColumns = (
  frequencies: Frequency[]
): frequencyColumnT[] => {
  const baseColumns = getBaseColumns();

  // Find the maximum number of receivers across all frequencies
  const maxReceivers = Math.max(
    ...frequencies.map((f) => f?.receivers?.length || 0),
    1 // Ensure at least 1 receiver column
  );

  // Generate receiver columns for each receiver index
  const receiverColumns: frequencyColumnT[] = [];
  for (let i = 0; i < maxReceivers; i++) {
    receiverColumns.push(...getReceiverColumns(i));
  }

  return [...baseColumns, ...receiverColumns];
};

// For backward compatibility, export a default set of columns
export const frequencyColumns = getBaseColumns();
