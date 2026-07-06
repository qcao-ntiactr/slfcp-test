import { Box } from '@chakra-ui/react';

import { CoordinateField } from '../Fields';
import { TextInput, DateInput, SelectInput } from '../Inputs';
import { STATE_OPTIONS } from '../utils/StateOptions';
import { FieldControlWrapper } from '../FieldControlWrapper/FieldControlWrapper';

export interface TabContentsProps {
  isReadOnly?: boolean;
  isTabContainer?: boolean;
}

export const LaunchSiteTab = ({
  isReadOnly = false,
  isTabContainer = true,
}: TabContentsProps) => {
  return (
    <Box className={isTabContainer ? 'tab-container' : ''}>
      <FieldControlWrapper
        fieldName="mission_name"
        label="Mission Name"
        isReadOnly={isReadOnly}
        renderInputChildFn={(field) => (
          <TextInput field={field} isReadOnly={isReadOnly} />
        )}
      />
      <FieldControlWrapper
        fieldName="name_of_licensee"
        label="Name Of Licensee"
        isReadOnly={isReadOnly}
        renderInputChildFn={(field) => (
          <TextInput field={field} isReadOnly={isReadOnly} />
        )}
      />
      <FieldControlWrapper
        fieldName="call_sign"
        label="Call Sign"
        isReadOnly={isReadOnly}
        renderInputChildFn={(field) => (
          <TextInput field={field} isReadOnly={isReadOnly} />
        )}
      />
      <FieldControlWrapper
        fieldName="name_of_launch_vehicle"
        label="Name Of Launch Vehicle"
        isReadOnly={isReadOnly}
        renderInputChildFn={(field) => (
          <TextInput field={field} isReadOnly={isReadOnly} />
        )}
      />

      <FieldControlWrapper
        label="City"
        fieldName="city"
        isReadOnly={isReadOnly}
        renderInputChildFn={(field) => (
          <TextInput field={field} isReadOnly={isReadOnly} />
        )}
      />

      <FieldControlWrapper
        fieldName="state"
        label="State"
        isReadOnly={isReadOnly}
        renderInputChildFn={(field) => (
          <SelectInput
            field={field}
            selectOptions={STATE_OPTIONS}
            placeholder={'Please Select State'}
            isReadOnly={isReadOnly}
          />
        )}
      />

      <CoordinateField
        label="Latitude Coordinates"
        fieldName="latitude"
        mode="latitude"
        isReadOnly={isReadOnly}
      />
      <CoordinateField
        label="Longitude Coordinates"
        fieldName="longitude"
        mode="longitude"
        isReadOnly={isReadOnly}
      />

      <FieldControlWrapper
        label="Launch Date and Time (Primary)"
        fieldName="launch_datetime_primary"
        isReadOnly={isReadOnly}
        renderInputChildFn={(field) => (
          <DateInput field={field} isReadOnly={isReadOnly} />
        )}
      />

      <FieldControlWrapper
        label="Launch Date and Time (Backup)"
        fieldName="launch_datetime_backup"
        isReadOnly={isReadOnly}
        renderInputChildFn={(field) => (
          <DateInput field={field} isReadOnly={isReadOnly} />
        )}
      />

      <FieldControlWrapper
        label="Orbital Location (Optional)"
        fieldName="orbital_location"
        isReadOnly={isReadOnly}
        renderInputChildFn={(field) => (
          <TextInput field={field} isTextArea={true} isReadOnly={isReadOnly} />
        )}
      />
    </Box>
  );
};
