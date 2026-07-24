import { FormProvider, UseFormReturn } from 'react-hook-form';
import { Box, Collapse, Divider, Text } from '@chakra-ui/react';
import {
  ComponentProps,
  ComponentType,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
} from 'react';
import { FrequencyFormDefaults } from '@slfcp/validation';

import { NumberInput } from '../../Inputs';
import { FieldControlWrapper } from '../../FieldControlWrapper/FieldControlWrapper';
import { ConfirmationModal } from '../../ConfirmationModal';

import { FrequencyForm } from './FrequencyForm';
import { FrequencyFormTable } from './FrequencyFormTable/FrequencyFormTable';
import { useFrequencyEditor } from './useFrequencyEditor';

// Chakra UI 2's Collapse types predate React 19 and omit the children prop.
const CollapseWithChildren = Collapse as unknown as ComponentType<
  PropsWithChildren<ComponentProps<typeof Collapse>>
>;

export interface FrequenciesTabProps {
  frequencyFormMethods: UseFormReturn<FrequencyFormDefaults>;
  isEditingFrequency: boolean;
  setIsEditingFrequency: Dispatch<SetStateAction<boolean>>;
}

export const FrequenciesTab = ({
  frequencyFormMethods,
  isEditingFrequency,
  setIsEditingFrequency,
}: FrequenciesTabProps) => {
  const {
    cancelFrequencyEdit,
    cancelFrequencyRemoval,
    closeRemovalConfirmation,
    confirmFrequencyRemoval,
    editorInitialValues,
    editorIsVisible,
    excessFrequencyCount,
    removalConfirmationIsOpen,
    removeFrequency,
    saveFrequency,
    selectedFrequencyIndex,
    startEditingFrequency,
  } = useFrequencyEditor({
    frequencyFormMethods,
    isEditingFrequency,
    setIsEditingFrequency,
  });

  return (
    <Box className="tab-container">
      <FieldControlWrapper
        fieldName="number_of_frequencies"
        label="Number Of Frequencies"
        renderInputChildFn={(field) => (
          <NumberInput
            field={field}
            isReadOnly={isEditingFrequency}
            isWholeNumber
          />
        )}
      />
      <CollapseWithChildren
        in={editorIsVisible}
        animateOpacity
        transition={{
          enter: { duration: 0.6 },
          exit: { duration: 0.6 },
        }}
      >
        <Box backgroundColor="gray.100" padding="5">
          <FormProvider {...frequencyFormMethods}>
            <FrequencyForm
              isEditingFrequency={isEditingFrequency}
              initialValues={editorInitialValues}
              onSubmit={saveFrequency}
              onCancel={cancelFrequencyEdit}
            />
          </FormProvider>
          <Divider mb="5" />
        </Box>
      </CollapseWithChildren>
      <FrequencyFormTable
        indexOfSelectedFreqForm={selectedFrequencyIndex}
        editFreqFormCallback={startEditingFrequency}
        deleteFreqFormCallback={removeFrequency}
        isEditingFrequency={isEditingFrequency}
      />
      <ConfirmationModal
        onClose={closeRemovalConfirmation}
        isOpen={removalConfirmationIsOpen}
        handleContinueClick={confirmFrequencyRemoval}
        continueBtnText="Continue"
        cancelBtnText="Cancel"
        includeCancel={true}
        handleCancelClick={cancelFrequencyRemoval}
        bodyContent={
          <>
            <Text>
              {'This action will remove the last ' +
                (excessFrequencyCount === 1
                  ? 'frequency.'
                  : `${excessFrequencyCount} frequencies.`)}
            </Text>
            <Text>Continue?</Text>
          </>
        }
      />
    </Box>
  );
};
