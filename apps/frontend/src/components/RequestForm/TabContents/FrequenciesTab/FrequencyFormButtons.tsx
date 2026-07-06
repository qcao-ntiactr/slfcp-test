import { Button, Flex } from '@chakra-ui/react';
import { useFormContext } from 'react-hook-form';
import { isEmpty } from 'lodash';

export interface FrequencyFormButtonsProps {
  isEditingFrequency: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}
export const FrequencyFormButtons = ({
  isEditingFrequency,
  onSubmit,
  onCancel,
}: FrequencyFormButtonsProps) => {
  const { formState } = useFormContext();

  if (!isEditingFrequency) {
    return (
      <Button
        aria-label="Add frequency"
        width="full"
        backgroundColor="gray.600"
        color="white"
        className="add-frequency-btn"
        _hover={{}}
        onClick={(e) => {
          e.stopPropagation();
          onSubmit();
        }}
        isDisabled={!isEmpty(formState.errors)}
      >
        Add Frequency
      </Button>
    );
  }

  // When isEditingFrequency is true
  return (
    <Flex flexDir="row" justifyContent="flex-end">
      <Button
        aria-label="Save changes"
        mx={5}
        type="submit"
        onClick={(e) => {
          e.stopPropagation();
          onSubmit();
        }}
        isDisabled={!isEmpty(formState.errors)}
      >
        Save Changes
      </Button>
      <Button onClick={onCancel}>Cancel</Button>
    </Flex>
  );
};
