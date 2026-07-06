import { Box, Heading } from '@chakra-ui/react';

import {
  ReadOnlyField,
  ReadOnlyTextOrNumber,
  ReadOnlyPhoneNumber,
} from '../../ReadOnlyInputs/';

export interface PocFieldValues {
  primary_poc_name: string;
  primary_poc_email: string;
  primary_poc_phone: string;
  alternate_poc_name: string;
  alternate_poc_email: string;
  alternate_poc_phone: string;
}

export const PocTab = ({
  primary_poc_name,
  primary_poc_email,
  primary_poc_phone,
  alternate_poc_name,
  alternate_poc_email,
  alternate_poc_phone,
}: PocFieldValues) => {
  return (
    <Box>
      <Heading size="md" mb={7}>
        Point of Contact
      </Heading>

      <ReadOnlyField label="Name (Primary POC)" htmlFor="primary_poc_name">
        <ReadOnlyTextOrNumber
          id="primary_poc_name"
          inputType="text"
          value={primary_poc_name}
        />
      </ReadOnlyField>

      <ReadOnlyField label="Email (Primary POC)" htmlFor="primary_poc_email">
        <ReadOnlyTextOrNumber
          id="primary_poc_email"
          inputType="text"
          value={primary_poc_email}
        />
      </ReadOnlyField>

      <ReadOnlyField label="Phone (Primary POC)" htmlFor="primary_poc_phone">
        <ReadOnlyPhoneNumber id="primary_poc_phone" value={primary_poc_phone} />
      </ReadOnlyField>

      <ReadOnlyField label="Name (Alternate POC)" htmlFor="alternate_poc_name">
        <ReadOnlyTextOrNumber
          id="alternate_poc_name"
          inputType="text"
          value={alternate_poc_name}
        />
      </ReadOnlyField>

      <ReadOnlyField
        label="Email (Alternate POC)"
        htmlFor="alternate_poc_email"
      >
        <ReadOnlyTextOrNumber
          id="alternate_poc_email"
          inputType="text"
          value={alternate_poc_email}
        />
      </ReadOnlyField>

      <ReadOnlyField
        label="Phone (Alternate POC)"
        htmlFor="alternate_poc_phone"
      >
        <ReadOnlyPhoneNumber
          id="alternate_poc_phone"
          value={alternate_poc_phone}
        />
      </ReadOnlyField>
    </Box>
  );
};
