import {
  FieldValues,
  FormProvider,
  UseFormReturn,
  useFieldArray,
  useFormContext,
} from 'react-hook-form';
import { Box, Divider, useDisclosure, Text, Collapse } from '@chakra-ui/react';
import {
  ComponentProps,
  ComponentType,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { FrequencyFormDefaults } from '@slfcp/validation';

import { frequencyFormDefaultValues } from '../../utils/DefaultValues';
import { NumberInput } from '../../Inputs';
import { FieldControlWrapper } from '../../FieldControlWrapper/FieldControlWrapper';
import { ConfirmationModal } from '../../ConfirmationModal';

import { FrequencyForm } from './FrequencyForm';
import { FrequencyFormTable } from './FrequencyFormTable/FrequencyFormTable';
import { normalizeFrequencyFormData } from './utils';

// Chakra UI 2's Collapse types predate React 19 and omit the children prop.
const CollapseWithChildren = Collapse as unknown as ComponentType<
  PropsWithChildren<ComponentProps<typeof Collapse>>
>;

interface FrequenciesTabProps {
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
    control,
    setValue,
    watch,
    trigger,
    clearErrors,
    formState: { errors },
  } = useFormContext();
  const { fields, append, update, remove } = useFieldArray({
    control,
    name: 'frequencies',
  });

  const [indexOfSelectedFreqForm, setIndexOfSelectedFreqForm] = useState<
    number | undefined
  >(undefined);

  const numberOfFrequencies = watch('number_of_frequencies');
  const createdFrequencyForms: FrequencyFormDefaults[] =
    watch('frequencies') ?? [];

  const { isOpen, onClose, onOpen } = useDisclosure();

  const numOfFrequenciesIsValid = useMemo(() => {
    if (numberOfFrequencies === undefined || numberOfFrequencies === '') {
      return false;
    }

    return (
      (!isNaN(Number(numberOfFrequencies)) &&
        (!errors.number_of_frequencies ||
          errors?.number_of_frequencies?.message ===
            'No frequencies have been added.')) ||
      Boolean(
        errors?.number_of_frequencies?.message?.toString().includes('Only')
      )
    );
  }, [numberOfFrequencies, errors?.number_of_frequencies]);

  const moreFormsThanSpecified = useMemo(() => {
    const requestedCount = Number(numberOfFrequencies) || 0;
    return {
      isMore: requestedCount < createdFrequencyForms.length,
      difference: createdFrequencyForms.length - requestedCount,
    };
  }, [numberOfFrequencies, createdFrequencyForms.length]);

  useEffect(() => {
    if (!isOpen && numOfFrequenciesIsValid && moreFormsThanSpecified.isMore) {
      onOpen();
    }
  }, [isOpen, moreFormsThanSpecified.isMore, numOfFrequenciesIsValid, onOpen]);

  const showFrequencyForm =
    numOfFrequenciesIsValid &&
    Number(numberOfFrequencies) > 0 &&
    (isEditingFrequency ||
      createdFrequencyForms.length !== Number(numberOfFrequencies));

  const selectedFrequency =
    indexOfSelectedFreqForm === undefined
      ? undefined
      : createdFrequencyForms[indexOfSelectedFreqForm];
  const editorInitialValues = useMemo(
    () => selectedFrequency ?? frequencyFormMethods.getValues(),
    [frequencyFormMethods, indexOfSelectedFreqForm, selectedFrequency]
  );

  /**
   * Resets the frequency form to its default values and triggers validation.
   * @async
   * @returns {Promise<void>}
   */
  const resetForm = async () => {
    frequencyFormMethods.reset(frequencyFormDefaultValues);
    await frequencyFormMethods.trigger();
  };

  /**
   * Adds a new frequency form entry and resets the form.
   * @param {FieldValues} newFrequencyForm - The new frequency form data to be added.
   */
  const handleAddFrequency = (newFrequencyForm: FieldValues) => {
    const normalizedFrequencyForm =
      normalizeFrequencyFormData(newFrequencyForm);

    clearErrors('frequencies');
    append(normalizedFrequencyForm);
    void trigger('frequencies');
    void trigger('number_of_frequencies');
    void resetForm();
  };

  /**
   * Edits an existing frequency form entry at a specified index.
   * @param {FieldValues} newValues - The updated form values.
   * @param {number} index - The index of the form entry to be updated.
   */
  const handleEditFrequency = (newValues: FieldValues, index: number) => {
    const normalizedFrequencyForm = normalizeFrequencyFormData(newValues);

    if (frequencyFormMethods.formState.isValid) {
      clearErrors(`frequencies.${index}`);
      update(index, normalizedFrequencyForm);

      setIsEditingFrequency(false);
      setIndexOfSelectedFreqForm(undefined);
      void trigger(`frequencies.${index}`);
      void trigger('frequencies');
      void resetForm();
    }
  };

  /**
   * Handles form submission for adding or editing a frequency form entry.
   * @async
   * @param {FieldValues} data - The submitted form data.
   * @returns {Promise<void>}
   */
  const onSubmit = async (data: FieldValues) => {
    if (!isEditingFrequency) {
      handleAddFrequency(data);
    }

    if (isEditingFrequency && indexOfSelectedFreqForm !== undefined) {
      handleEditFrequency(data, indexOfSelectedFreqForm);
    }

    await trigger('number_of_frequencies');
  };

  /**
   * Enables edit mode for a selected frequency form entry.
   * @param {FrequencyFormDefaults} formToEdit - The form values to populate for editing.
   * @param {number} index - The index of the form entry being edited.
   */
  const handleEditMode = (formToEdit: FrequencyFormDefaults, index: number) => {
    setIsEditingFrequency(true);
    frequencyFormMethods.reset(formToEdit);
    setIndexOfSelectedFreqForm(index);
  };

  /**
   * Cancels the editing mode and resets the form.
   * The editor is reset immediately so UI animation timing cannot affect data.
   */
  const handleCancelEdit = () => {
    setIsEditingFrequency(false);
    setIndexOfSelectedFreqForm(undefined);

    void resetForm();
  };

  /**
   * Removes a frequency form entry at a specified index.
   * @param {number} index - The index of the form entry to remove.
   */
  const handleRemoveFreqForm = (index: number) => {
    remove(index);
    clearErrors(`frequencies.${index}`);

    trigger('number_of_frequencies');
  };

  /**
   * Finalizes editing the selected frequency and updates the form state before closing.
   */
  const handleContinueClick = () => {
    const updatedFrequencies = fields.slice(0, numberOfFrequencies);
    setValue('frequencies', updatedFrequencies);
    trigger('number_of_frequencies');
    onClose();
  };

  /**
   * Cancels the edit of the selected frequency, restores previous values, and triggers validation.
   */
  const handleCancelClick = () => {
    onClose();
    setValue('number_of_frequencies', createdFrequencyForms.length);
    trigger('number_of_frequencies');
  };

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
        in={showFrequencyForm}
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
              onSubmit={onSubmit}
              onCancel={handleCancelEdit}
            />
          </FormProvider>
          <Divider mb="5" />
        </Box>
      </CollapseWithChildren>
      <FrequencyFormTable
        indexOfSelectedFreqForm={indexOfSelectedFreqForm}
        editFreqFormCallback={handleEditMode}
        deleteFreqFormCallback={handleRemoveFreqForm}
        isEditingFrequency={isEditingFrequency}
      />
      <ConfirmationModal
        onClose={onClose}
        isOpen={isOpen}
        handleContinueClick={handleContinueClick}
        continueBtnText="Continue"
        cancelBtnText="Cancel"
        includeCancel={true}
        handleCancelClick={handleCancelClick}
        bodyContent={
          <>
            <Text>
              {'This action will remove the last ' +
                (moreFormsThanSpecified?.difference === 1
                  ? 'frequency.'
                  : `${moreFormsThanSpecified?.difference} frequencies.`)}
            </Text>
            <Text>Continue?</Text>
          </>
        }
      />
    </Box>
  );
};
