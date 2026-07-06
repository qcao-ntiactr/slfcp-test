import { useEffect, useState } from 'react';
import { Box, Divider, Flex, Heading, Text } from '@chakra-ui/react';
import { FieldValues, useFormContext, useFieldArray } from 'react-hook-form';
import { FrequencyFormDefaults } from '@slfcp/validation';
import { FaRegEye, FaRegEyeSlash } from 'react-icons/fa';

import {
  AntennaGainField,
  AntennaBeamwidthField,
  BandwidthField,
  CoordinateField,
  EirpFields,
  AntennaAltitudeFields,
  TransmittedBandwidthField,
  FrequencyField,
} from '../../Fields';
import { DateInput, SelectInput, TextInput } from '../../Inputs';
import { FieldControlWrapper } from '../../FieldControlWrapper/FieldControlWrapper';
import { ConfirmationModal } from '../../ConfirmationModal';
import {
  validateOptionalReceiverField,
  receiverHasValues,
} from '../utils/ReceiverValidationHelpers';

import { FrequencyFormButtons } from './FrequencyFormButtons';
import {
  createEmptyReceiver,
  normalizeFrequencyFormData,
  receiver2FieldNames,
} from './utils';

interface FrequencyFormProps {
  // eslint-disable-next-line no-unused-vars
  onSubmit: (data: FieldValues, index?: number) => void;
  initialValues: FrequencyFormDefaults;
  onCancel: () => void;
  isEditingFrequency: boolean;
  index?: number;
  isReadOnly?: boolean;
}

export const FrequencyForm = ({
  onSubmit,
  onCancel,
  isEditingFrequency,
  initialValues,
  isReadOnly = false,
}: FrequencyFormProps) => {
  const { watch, trigger, reset, control, formState, clearErrors, getValues } =
    useFormContext<FrequencyFormDefaults>();
  const [showReceiver2, setShowReceiver2] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const {
    fields: receiverFields,
    append: appendReceiver,
    remove: removeReceiver,
  } = useFieldArray({
    control,
    name: 'receivers',
  });

  const transmittedBandwidth = watch('transmitted_bandwidth');
  const receivers = watch('receivers');

  const receiversIsDirty = formState.dirtyFields?.receivers;

  useEffect(() => {
    trigger();
  }, [transmittedBandwidth]);

  useEffect(() => {
    if (receiversIsDirty) {
      void trigger('receivers');
    }
  }, [receiversIsDirty, trigger]);

  useEffect(() => {
    reset(initialValues);
    setShowReceiver2(initialValues?.receivers?.length > 1);
    void trigger();
  }, [initialValues]);

  const clearReceiver2ValidationState = () => {
    clearErrors([...receiver2FieldNames, 'receivers']);
  };

  const removeReceiver2 = async () => {
    if (receiverFields.length > 1) {
      removeReceiver(1);
    } else {
      reset({
        ...getValues(),
        receivers: normalizeFrequencyFormData(getValues(), false).receivers,
      });
    }

    clearReceiver2ValidationState();
    setShowReceiver2(false);
    await trigger('receivers');
  };

  const handleToggleReceiver2 = async () => {
    if (showReceiver2) {
      // Check if receiver 2 has values before showing confirmation modal
      if (receivers && receivers[1] && receiverHasValues(receivers[1])) {
        setIsConfirmModalOpen(true);
      } else {
        await removeReceiver2();
      }
    } else {
      appendReceiver({
        ...createEmptyReceiver(),
      });
      setShowReceiver2(true);
      clearReceiver2ValidationState();
      await trigger('receivers');
    }
  };

  const handleSubmitFrequency = () => {
    const currentValues = getValues();
    const normalizedValues = normalizeFrequencyFormData(
      currentValues,
      showReceiver2
    );

    onSubmit(normalizedValues);
  };

  return (
    <Box p="5">
      <Heading size="md" mb="10">
        {!isEditingFrequency && 'Create Frequency'}
        {isEditingFrequency && 'Edit Frequency'}
      </Heading>
      <FieldControlWrapper
        label="Frequency Value"
        fieldName="frequency"
        isReadOnly={isReadOnly}
        renderInputChildFn={(field) => (
          <FrequencyField field={field} isReadOnly={isReadOnly} />
        )}
      />

      <FieldControlWrapper
        label="Location of Transmitter on Launch Vehicle or Platform"
        fieldName="location_of_transmitter_on_vehicle_or_platform"
        isReadOnly={isReadOnly}
        renderInputChildFn={(field) => (
          <SelectInput
            field={field}
            selectOptions={[
              { label: 'First Stage', value: 'first_stage' },
              { label: 'Second Stage', value: 'second_stage' },
              { label: 'Ground', value: 'ground' },
            ]}
            placeholder="Please select an option"
            isReadOnly={isReadOnly}
          />
        )}
      />
      <EirpFields
        valueFieldName="eirp"
        unitFieldName="eirp_unit"
        isReadOnly={isReadOnly}
      />
      <TransmittedBandwidthField isReadOnly={isReadOnly} />

      {(transmittedBandwidth || 0) > 5 && (
        <FieldControlWrapper
          fieldName="transmitted_bandwidth_justification"
          label="Bandwidth Justification"
          isReadOnly={isReadOnly}
          renderInputChildFn={(field) => (
            <TextInput
              field={field}
              placeholder="Please state why bandwidth is more than 5 MHz"
              isTextArea={true}
              isReadOnly={isReadOnly}
            />
          )}
        />
      )}

      <BandwidthField
        fieldName="minus_3db_bandwidth"
        label="-3 dB Bandwidth"
        isReadOnly={isReadOnly}
      />
      <BandwidthField
        fieldName="minus_20db_bandwidth"
        label="-20 dB Bandwidth"
        isReadOnly={isReadOnly}
      />
      <BandwidthField
        fieldName="minus_60db_bandwidth"
        label="-60 dB Bandwidth"
        isReadOnly={isReadOnly}
      />
      <FieldControlWrapper
        fieldName="nature_of_modulating_signals"
        label="Nature of Modulating Signals"
        isReadOnly={isReadOnly}
        renderInputChildFn={(field) => (
          <TextInput field={field} isReadOnly={isReadOnly} />
        )}
      />
      <FieldControlWrapper
        label="Emission Designator"
        fieldName="emission_designator"
        isReadOnly={isReadOnly}
        renderInputChildFn={(field) => (
          <TextInput field={field} isReadOnly={isReadOnly} />
        )}
      />

      <Divider />

      <Heading size="md" mt="20px" mb="20px">
        Transmitter
      </Heading>
      <FieldControlWrapper
        label="Transmission Start"
        fieldName="tx_transmission_start"
        isReadOnly={isReadOnly}
        renderInputChildFn={(field) => (
          <DateInput field={field} isReadOnly={isReadOnly} />
        )}
      />
      <FieldControlWrapper
        label="Transmission End"
        fieldName="tx_transmission_end"
        isReadOnly={isReadOnly}
        renderInputChildFn={(field) => (
          <DateInput field={field} isReadOnly={isReadOnly} />
        )}
      />

      <FieldControlWrapper
        label="Antenna Type"
        fieldName="tx_antenna_type"
        isReadOnly={isReadOnly}
        renderInputChildFn={(field) => (
          <TextInput field={field} isReadOnly={isReadOnly} />
        )}
      />
      <AntennaGainField
        label="Antenna Gain"
        fieldName="tx_antenna_gain"
        isReadOnly={isReadOnly}
      />
      <AntennaBeamwidthField
        label="Antenna Beamwidth"
        fieldName="tx_antenna_beamwidth"
        isReadOnly={isReadOnly}
      />

      <AntennaAltitudeFields
        valueFieldName="tx_antenna_altitude"
        unitFieldName="tx_antenna_altitude_unit"
        isReadOnly={isReadOnly}
      />

      <Divider />

      <Heading size="md" mt="20px" mb="20px">
        Receiver 1
      </Heading>
      <FieldControlWrapper
        label="Transmission Start"
        fieldName="receivers.0.transmission_start"
        isReadOnly={isReadOnly}
        renderInputChildFn={(field) => (
          <DateInput field={field} isReadOnly={isReadOnly} />
        )}
      />
      <FieldControlWrapper
        label="Transmission End"
        fieldName="receivers.0.transmission_end"
        isReadOnly={isReadOnly}
        renderInputChildFn={(field) => (
          <DateInput field={field} isReadOnly={isReadOnly} />
        )}
      />
      <FieldControlWrapper
        label="Antenna Type"
        fieldName="receivers.0.antenna_type"
        isReadOnly={isReadOnly}
        renderInputChildFn={(field) => (
          <TextInput field={field} isReadOnly={isReadOnly} />
        )}
      />
      <AntennaGainField
        label="Antenna Gain"
        fieldName="receivers.0.antenna_gain"
        isReadOnly={isReadOnly}
      />
      <AntennaBeamwidthField
        label="Antenna Beamwidth"
        fieldName="receivers.0.antenna_beamwidth"
        isReadOnly={isReadOnly}
      />
      <AntennaAltitudeFields
        valueFieldName="receivers.0.antenna_altitude"
        unitFieldName="receivers.0.antenna_altitude_unit"
        isReadOnly={isReadOnly}
      />
      <FieldControlWrapper
        label="Location of Receiving Ground Station"
        fieldName="receivers.0.location_of_receiving_ground_station"
        isReadOnly={isReadOnly}
        renderInputChildFn={(field) => (
          <SelectInput
            field={field}
            selectOptions={[
              { label: 'First Stage', value: 'first_stage' },
              { label: 'Second Stage', value: 'second_stage' },
              { label: 'Ground', value: 'ground' },
            ]}
            placeholder="Please select an option"
            isReadOnly={isReadOnly}
          />
        )}
      />
      <CoordinateField
        label="Latitude of Receiving Antenna"
        fieldName="receivers.0.latitude_of_receiving_antenna"
        mode="latitude"
        isReadOnly={isReadOnly}
      />
      <CoordinateField
        label="Longitude of Receiving Antenna"
        fieldName="receivers.0.longitude_of_receiving_antenna"
        mode="longitude"
        isReadOnly={isReadOnly}
      />

      <Divider mt="20px" />

      <Flex
        mt="20px"
        mb="20px"
        pr={3}
        tabIndex={0}
        justifyContent="space-between"
        aria-label={
          showReceiver2
            ? 'Hide second receiver section'
            : 'Show second receiver section'
        }
        onClick={isReadOnly ? undefined : handleToggleReceiver2}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (!isReadOnly) handleToggleReceiver2();
          }
        }}
        cursor={isReadOnly ? 'default' : 'pointer'}
      >
        <Heading size="md">Receiver 2 (Optional)</Heading>
        {!isReadOnly && (
          <>
            {showReceiver2 ? (
              <FaRegEyeSlash aria-label={'Hide Receiver 2'} size="16px" />
            ) : (
              <FaRegEye aria-label={'Show Receiver 2'} size="16px" />
            )}
          </>
        )}
      </Flex>

      {showReceiver2 && (
        <Box>
          <FieldControlWrapper
            label="Transmission Start"
            fieldName="receivers.1.transmission_start"
            isReadOnly={isReadOnly}
            validate={validateOptionalReceiverField(
              'receivers.1.transmission_start'
            )}
            renderInputChildFn={(field) => (
              <DateInput field={field} isReadOnly={isReadOnly} />
            )}
          />
          <FieldControlWrapper
            label="Transmission End"
            fieldName="receivers.1.transmission_end"
            isReadOnly={isReadOnly}
            validate={validateOptionalReceiverField(
              'receivers.1.transmission_end'
            )}
            renderInputChildFn={(field) => (
              <DateInput field={field} isReadOnly={isReadOnly} />
            )}
          />
          <FieldControlWrapper
            label="Antenna Type"
            fieldName="receivers.1.antenna_type"
            isReadOnly={isReadOnly}
            validate={validateOptionalReceiverField('receivers.1.antenna_type')}
            renderInputChildFn={(field) => (
              <TextInput field={field} isReadOnly={isReadOnly} />
            )}
          />
          <AntennaGainField
            label="Antenna Gain"
            fieldName="receivers.1.antenna_gain"
            isReadOnly={isReadOnly}
            validate={validateOptionalReceiverField('receivers.1.antenna_gain')}
          />
          <AntennaBeamwidthField
            label="Antenna Beamwidth"
            fieldName="receivers.1.antenna_beamwidth"
            isReadOnly={isReadOnly}
            validate={validateOptionalReceiverField(
              'receivers.1.antenna_beamwidth'
            )}
          />
          <AntennaAltitudeFields
            valueFieldName="receivers.1.antenna_altitude"
            unitFieldName="receivers.1.antenna_altitude_unit"
            isReadOnly={isReadOnly}
            validate={validateOptionalReceiverField(
              'receivers.1.antenna_altitude'
            )}
          />
          <FieldControlWrapper
            label="Location of Receiving Ground Station"
            fieldName="receivers.1.location_of_receiving_ground_station"
            isReadOnly={isReadOnly}
            validate={validateOptionalReceiverField(
              'receivers.1.location_of_receiving_ground_station'
            )}
            renderInputChildFn={(field) => (
              <SelectInput
                field={field}
                selectOptions={[
                  { label: 'First Stage', value: 'first_stage' },
                  { label: 'Second Stage', value: 'second_stage' },
                  { label: 'Ground', value: 'ground' },
                ]}
                placeholder="Please select an option"
                isReadOnly={isReadOnly}
              />
            )}
          />
          <CoordinateField
            label="Latitude of Receiving Antenna"
            fieldName="receivers.1.latitude_of_receiving_antenna"
            mode="latitude"
            isReadOnly={isReadOnly}
            validate={validateOptionalReceiverField(
              'receivers.1.latitude_of_receiving_antenna'
            )}
          />
          <CoordinateField
            label="Longitude of Receiving Antenna"
            fieldName="receivers.1.longitude_of_receiving_antenna"
            mode="longitude"
            isReadOnly={isReadOnly}
            validate={validateOptionalReceiverField(
              'receivers.1.longitude_of_receiving_antenna'
            )}
          />
        </Box>
      )}
      <FrequencyFormButtons
        onSubmit={handleSubmitFrequency}
        onCancel={onCancel}
        isEditingFrequency={isEditingFrequency}
      />

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        handleContinueClick={async () => {
          await removeReceiver2();
          setIsConfirmModalOpen(false);
        }}
        title="Remove this receiver?"
        bodyContent={
          <Text>
            Collapsing this section will remove the receiver from the form and
            clear any existing values. This action cannot be undone.
          </Text>
        }
        continueBtnText="Remove receiver"
        includeCancel={true}
      />
    </Box>
  );
};
