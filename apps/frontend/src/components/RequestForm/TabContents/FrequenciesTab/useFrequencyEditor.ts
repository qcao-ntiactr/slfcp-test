import { useDisclosure } from '@chakra-ui/react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import { useFieldArray, useFormContext } from 'react-hook-form';
import type {
  FrequencyFormDefaults,
  PortalFormDefaults,
} from '@slfcp/validation';
import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { frequencyFormDefaultValues } from '../../utils/DefaultValues';

import { normalizeFrequencyFormData } from './utils';

interface UseFrequencyEditorOptions {
  frequencyFormMethods: UseFormReturn<FrequencyFormDefaults>;
  isEditingFrequency: boolean;
  setIsEditingFrequency: Dispatch<SetStateAction<boolean>>;
}

const MINIMUM_FREQUENCY_COUNT = 1;
const MAXIMUM_FREQUENCY_COUNT = 50;

export const useFrequencyEditor = ({
  frequencyFormMethods,
  isEditingFrequency,
  setIsEditingFrequency,
}: UseFrequencyEditorOptions) => {
  const { control, setValue, watch, trigger, clearErrors } =
    useFormContext<PortalFormDefaults>();
  const { fields, append, update, remove } = useFieldArray({
    control,
    name: 'frequencies',
  });
  const {
    isOpen: removalConfirmationIsOpen,
    onClose: closeRemovalConfirmation,
    onOpen: openRemovalConfirmation,
  } = useDisclosure();
  const [selectedFrequencyIndex, setSelectedFrequencyIndex] = useState<
    number | undefined
  >();

  const numberOfFrequencies = watch('number_of_frequencies');
  const savedFrequencies = watch('frequencies') ?? [];
  const requestedFrequencyCount = Number(numberOfFrequencies);
  const frequencyCountIsAllowed =
    Number.isInteger(requestedFrequencyCount) &&
    requestedFrequencyCount >= MINIMUM_FREQUENCY_COUNT &&
    requestedFrequencyCount <= MAXIMUM_FREQUENCY_COUNT;
  const excessFrequencyCount = Math.max(
    savedFrequencies.length - (requestedFrequencyCount || 0),
    0
  );

  useEffect(() => {
    if (
      !removalConfirmationIsOpen &&
      frequencyCountIsAllowed &&
      excessFrequencyCount > 0
    ) {
      openRemovalConfirmation();
    }
  }, [
    excessFrequencyCount,
    frequencyCountIsAllowed,
    openRemovalConfirmation,
    removalConfirmationIsOpen,
  ]);

  const selectedFrequency =
    selectedFrequencyIndex === undefined
      ? undefined
      : savedFrequencies[selectedFrequencyIndex];
  const editorInitialValues = useMemo(
    () => selectedFrequency ?? frequencyFormMethods.getValues(),
    [frequencyFormMethods, selectedFrequency]
  );
  const editorIsVisible =
    frequencyCountIsAllowed &&
    (isEditingFrequency || savedFrequencies.length !== requestedFrequencyCount);

  const resetFrequencyEditor = async () => {
    frequencyFormMethods.reset(frequencyFormDefaultValues);
    await frequencyFormMethods.trigger();
  };

  const addFrequency = (values: FieldValues) => {
    clearErrors('frequencies');
    append(normalizeFrequencyFormData(values));
    void trigger('frequencies');
    void trigger('number_of_frequencies');
    void resetFrequencyEditor();
  };

  const updateFrequency = (values: FieldValues, index: number) => {
    if (!frequencyFormMethods.formState.isValid) {
      return;
    }

    clearErrors(`frequencies.${index}`);
    update(index, normalizeFrequencyFormData(values));
    setIsEditingFrequency(false);
    setSelectedFrequencyIndex(undefined);
    void trigger(`frequencies.${index}`);
    void trigger('frequencies');
    void resetFrequencyEditor();
  };

  const saveFrequency = async (values: FieldValues) => {
    if (isEditingFrequency && selectedFrequencyIndex !== undefined) {
      updateFrequency(values, selectedFrequencyIndex);
    } else {
      addFrequency(values);
    }

    await trigger('number_of_frequencies');
  };

  const startEditingFrequency = (
    frequency: FrequencyFormDefaults,
    index: number
  ) => {
    setIsEditingFrequency(true);
    frequencyFormMethods.reset(frequency);
    setSelectedFrequencyIndex(index);
  };

  const cancelFrequencyEdit = () => {
    setIsEditingFrequency(false);
    setSelectedFrequencyIndex(undefined);
    void resetFrequencyEditor();
  };

  const removeFrequency = (index: number) => {
    remove(index);
    clearErrors(`frequencies.${index}`);
    void trigger('number_of_frequencies');
  };

  const confirmFrequencyRemoval = () => {
    setValue('frequencies', fields.slice(0, requestedFrequencyCount));
    void trigger('number_of_frequencies');
    closeRemovalConfirmation();
  };

  const cancelFrequencyRemoval = () => {
    setValue('number_of_frequencies', savedFrequencies.length);
    void trigger('number_of_frequencies');
    closeRemovalConfirmation();
  };

  return {
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
  };
};
