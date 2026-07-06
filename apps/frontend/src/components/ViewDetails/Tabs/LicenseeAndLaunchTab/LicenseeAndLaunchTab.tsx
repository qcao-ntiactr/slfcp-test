import { Box, Heading } from '@chakra-ui/react';

import {
  ReadOnlyField,
  ReadOnlyTextOrNumber,
  ReadOnlyCoordinate,
  ReadOnlySelect,
  ReadOnlyDate,
} from '../../ReadOnlyInputs';
import { STATE_OPTIONS } from '../../../RequestForm/utils/StateOptions';

export interface LicenseeAndLaunchSiteFieldValues {
  mission_name: string;
  name_of_licensee: string;
  call_sign: string;
  name_of_launch_vehicle: string;
  city: string;
  state: (typeof STATE_OPTIONS)[number]['value'];
  longitude: number;
  latitude: number;
  launch_datetime_primary: string;
  launch_datetime_backup: string;
  orbital_location: string | null;
}
export const LicenseeAndLaunchTab = ({
  mission_name,
  name_of_licensee,
  call_sign,
  name_of_launch_vehicle,
  city,
  state,
  latitude,
  longitude,
  launch_datetime_primary,
  launch_datetime_backup,
  orbital_location,
}: LicenseeAndLaunchSiteFieldValues) => {
  return (
    <Box>
      <Heading size="md" mb={7}>
        Launch Site
      </Heading>

      <ReadOnlyField label="Mission Name" htmlFor="mission_name">
        <ReadOnlyTextOrNumber
          id="mission_name"
          inputType="text"
          value={mission_name}
        />
      </ReadOnlyField>

      <ReadOnlyField label="Name of Licensee" htmlFor="name_of_licensee">
        <ReadOnlyTextOrNumber
          id="name_of_licensee"
          inputType="text"
          value={name_of_licensee}
        />
      </ReadOnlyField>

      <ReadOnlyField label="Call Sign" htmlFor="call_sign">
        <ReadOnlyTextOrNumber
          id="call_sign"
          inputType="text"
          value={call_sign}
        />
      </ReadOnlyField>

      <ReadOnlyField
        label="Name of Launch Vehicle"
        htmlFor="name_of_launch_vehicle"
      >
        <ReadOnlyTextOrNumber
          id="name_of_launch_vehicle"
          inputType="text"
          value={name_of_launch_vehicle}
        />
      </ReadOnlyField>

      <ReadOnlyField label="City" htmlFor="city">
        <ReadOnlyTextOrNumber id="city" inputType="text" value={city} />
      </ReadOnlyField>

      <ReadOnlyField label="State" htmlFor="state">
        <ReadOnlySelect id="state" value={state} options={STATE_OPTIONS} />
      </ReadOnlyField>

      <ReadOnlyField label="Latitude Coordinates" htmlFor="latitude">
        <ReadOnlyCoordinate
          id="latitude"
          coordinateType="latitude"
          value={latitude}
        />
      </ReadOnlyField>

      <ReadOnlyField label="Longitude Coordinates" htmlFor="longitude">
        <ReadOnlyCoordinate
          id="longitude"
          coordinateType="longitude"
          value={longitude}
        />
      </ReadOnlyField>

      <ReadOnlyField
        label="Launch Date and Time (Primary)"
        htmlFor="launch_datetime_primary"
      >
        <ReadOnlyDate
          id="launch_datetime_primary"
          value={launch_datetime_primary}
        />
      </ReadOnlyField>

      <ReadOnlyField
        label="Launch Date and Time (Backup)"
        htmlFor="launch_datetime_backup"
      >
        <ReadOnlyDate
          id={'launch_datetime_backup'}
          value={launch_datetime_backup}
        />
      </ReadOnlyField>

      <ReadOnlyField
        label="Orbital Location (Optional)"
        htmlFor="orbital_location"
      >
        <ReadOnlyTextOrNumber
          id="orbital_location"
          inputType="text"
          value={orbital_location}
        />
      </ReadOnlyField>
    </Box>
  );
};
