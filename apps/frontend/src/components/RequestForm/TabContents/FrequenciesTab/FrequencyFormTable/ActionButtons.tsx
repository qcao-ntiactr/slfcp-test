import { Button, Flex } from '@chakra-ui/react';
import { FrequencyFormDefaults } from 'packages/validation';
import { useFormContext } from 'react-hook-form';
import { IoTrashOutline } from 'react-icons/io5';
import { TiPencil } from 'react-icons/ti';

interface ActionButtonsProps {
  editCallback: () => void;
  deleteCallback: () => void;
  isEditingFrequency: boolean;
}

export const ActionButtons = ({
  editCallback,
  deleteCallback,
  isEditingFrequency,
}: ActionButtonsProps) => {
  const { watch } = useFormContext();
  const createdFrequencyForms: FrequencyFormDefaults[] = watch('frequencies');
  return (
    <Flex flexDir="row">
      <Button
        aria-label="Edit frequency"
        onClick={editCallback}
        variant="unstyled"
        isDisabled={isEditingFrequency}
      >
        <TiPencil size="1.2em" />
      </Button>

      <Button
        aria-label="Delete frequency"
        onClick={deleteCallback}
        variant="unstyled"
        isDisabled={createdFrequencyForms.length <= 1 || isEditingFrequency}
      >
        <IoTrashOutline size="1.2em" />
      </Button>
    </Flex>
  );
};
