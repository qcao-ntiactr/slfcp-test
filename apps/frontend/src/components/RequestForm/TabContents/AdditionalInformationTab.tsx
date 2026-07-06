import { Box, Link } from '@chakra-ui/react';

import { TextInput } from '../Inputs/TextInput/TextInput';
import { FieldControlWrapper } from '../FieldControlWrapper/FieldControlWrapper';
import { PhoneNumberInput } from '../Inputs/PhoneNumberInput/PhoneNumberInput';
import { DateInput } from '../Inputs';
import { FileUploadInput } from '../Inputs/FileUploadInput/FileUploadInput';

import { TabContentsProps } from './LaunchSiteTab';

export const AdditionalInformationTab = ({
  isReadOnly = false,
  isTabContainer = true,
}: TabContentsProps) => {
  return (
    <Box className={isTabContainer ? 'tab-container' : ''}>
      <FieldControlWrapper
        label="Ground Track From Liftoff Until Payload Separation"
        fieldName="ground_track_from_liftoff_until_payload_separation"
        isReadOnly={isReadOnly}
        renderInputChildFn={(field) => (
          <TextInput field={field} isTextArea={true} isReadOnly={isReadOnly} />
        )}
      />

      <FieldControlWrapper
        label="ECF Cartesian Vectors Format (Description)"
        fieldName="ecf_cartesian_vectors_format_file_desc"
        isReadOnly={isReadOnly}
        renderInputChildFn={(field) => (
          <>
            <TextInput
              field={field}
              isTextArea={true}
              isReadOnly={isReadOnly}
            />
          </>
        )}
      />

      <FieldControlWrapper
        label="ECF Cartesian Vectors Format (File Path)"
        fieldName="ecf_cartesian_vectors_format_file"
        isReadOnly={isReadOnly}
        renderInputChildFn={(field) => (
          <Box>
            <FileUploadInput field={field} isReadOnly={isReadOnly} />
            <Link
              href="/ECFTemplate.xlsx"
              download
              color="blue.600"
              aria-label="Download ECF termplate"
            >
              Download ECF Template
            </Link>
          </Box>
        )}
      />

      <FieldControlWrapper
        label="2d Ground Track of the Launch Vehicle (Description)"
        fieldName="ground_track_of_launch_vehicle_2d_img_file_desc"
        isReadOnly={isReadOnly}
        renderInputChildFn={(field) => (
          <TextInput field={field} isTextArea={true} isReadOnly={isReadOnly} />
        )}
      />

      <FieldControlWrapper
        label="2d Ground Track of the Launch Vehicle (File Path)"
        fieldName="ground_track_of_launch_vehicle_2d_img_file"
        isReadOnly={isReadOnly}
        renderInputChildFn={(field) => (
          <FileUploadInput field={field} isReadOnly={isReadOnly} />
        )}
      />

      <FieldControlWrapper
        label="FCC Filing Date (Optional)"
        fieldName="fcc_filing_date"
        isReadOnly={isReadOnly}
        renderInputChildFn={(field) => (
          <DateInput field={field} isReadOnly={isReadOnly} />
        )}
      />

      <FieldControlWrapper
        label="Name (Primary POC)"
        fieldName="primary_poc_name"
        isReadOnly={isReadOnly}
        renderInputChildFn={(field) => (
          <TextInput field={field} isReadOnly={isReadOnly} />
        )}
      />

      <FieldControlWrapper
        label="Email (Primary POC)"
        fieldName="primary_poc_email"
        isReadOnly={isReadOnly}
        renderInputChildFn={(field) => (
          <TextInput field={field} type="email" isReadOnly={isReadOnly} />
        )}
      />

      <FieldControlWrapper
        label="Phone (Primary POC)"
        fieldName="primary_poc_phone"
        isReadOnly={isReadOnly}
        renderInputChildFn={(field) => (
          <PhoneNumberInput field={field} isReadOnly={isReadOnly} />
        )}
      />

      <FieldControlWrapper
        label="Name (Alternate POC)"
        fieldName="alternate_poc_name"
        isReadOnly={isReadOnly}
        renderInputChildFn={(field) => (
          <TextInput field={field} isReadOnly={isReadOnly} />
        )}
      />

      <FieldControlWrapper
        label="Email (Alternate POC)"
        fieldName="alternate_poc_email"
        isReadOnly={isReadOnly}
        renderInputChildFn={(field) => (
          <TextInput field={field} type="email" isReadOnly={isReadOnly} />
        )}
      />

      <FieldControlWrapper
        label="Phone (Alternate POC)"
        fieldName="alternate_poc_phone"
        isReadOnly={isReadOnly}
        renderInputChildFn={(field) => (
          <PhoneNumberInput field={field} isReadOnly={isReadOnly} />
        )}
      />
    </Box>
  );
};
