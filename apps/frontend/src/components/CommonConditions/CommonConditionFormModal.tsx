import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  VStack,
} from '@chakra-ui/react';

import { CommonConditionsEditor } from '../ViewDetails/Feedback/FeedbackTable/CommonConditions/CommonConditionsEditor';

type CommonConditionFormValues = {
  title: string;
  content: string;
};

interface CommonConditionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initialValues?: CommonConditionFormValues;
  onSaveDraft: (_values: CommonConditionFormValues) => Promise<void>;
  onSubmitCondition: (_values: CommonConditionFormValues) => Promise<void>;
  showSaveDraftButton?: boolean;
  submitButtonLabel?: string;
  isSavingDraft?: boolean;
  isSubmitting?: boolean;
}

export const CommonConditionFormModal = ({
  isOpen,
  onClose,
  mode,
  initialValues,
  onSaveDraft,
  onSubmitCondition,
  showSaveDraftButton = true,
  submitButtonLabel = 'Submit',
  isSavingDraft = false,
  isSubmitting = false,
}: CommonConditionFormModalProps) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState<{ title?: string; content?: string }>(
    {}
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setTitle(initialValues?.title ?? '');
    setContent(initialValues?.content ?? '');
    setErrors({});
  }, [initialValues, isOpen]);

  const modalTitle = useMemo(
    () =>
      mode === 'create' ? 'New Common Condition' : 'Edit Common Condition',
    [mode]
  );

  const validate = () => {
    const nextErrors: { title?: string; content?: string } = {};

    if (!title.trim()) {
      nextErrors.title = 'Name is required.';
    }

    if (!content.trim()) {
      nextErrors.content = 'Condition details are required.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildPayload = () => ({
    title: title.trim(),
    content: content.trim(),
  });

  const handleSaveDraft = async () => {
    if (!validate()) {
      return;
    }

    await onSaveDraft(buildPayload());
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    await onSubmitCondition(buildPayload());
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      closeOnOverlayClick={false}
    >
      <ModalOverlay backdropFilter="blur(5px)" />
      <ModalContent
        maxW="1000px"
        bg="#F2F2F2"
        borderRadius="6px"
        boxShadow="0px 1px 5px 0px rgba(0,0,0,0.1), 0px 3.6px 13px 0px rgba(0,0,0,0.07), 0px 8.4px 23px 0px rgba(0,0,0,0.06), 0px 23px 35px 0px rgba(0,0,0,0.05)"
        p={4}
      >
        <ModalHeader
          p={0}
          mb={4}
          fontWeight="bold"
          fontSize="24px"
          lineHeight="32px"
        >
          {modalTitle}
        </ModalHeader>
        <ModalCloseButton top={2} right={2} />
        <ModalBody p={0} pb={6}>
          <VStack spacing={5} align="stretch">
            <FormControl isInvalid={Boolean(errors.title)}>
              <FormLabel htmlFor="common-condition-title" fontWeight="bold">
                Name
              </FormLabel>
              <Input
                id="common-condition-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                bg="white"
                borderColor="gray.200"
              />
              <FormErrorMessage>{errors.title}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={Boolean(errors.content)} mb={4}>
              <CommonConditionsEditor
                value={content}
                onChange={setContent}
                descriptionText="Enter the condition details below."
              />
              <FormErrorMessage>{errors.content}</FormErrorMessage>
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter p={0} pt={8} borderTop="none" gap={4}>
          <Button
            variant="outline"
            w="112px"
            color="#004a82"
            borderColor="#004a82"
            borderWidth="1px"
            bg="white"
            onClick={onClose}
            fontWeight="normal"
            fontSize="16px"
            height="40px"
            lineHeight="32px"
            borderRadius="6px"
            flexShrink={0}
            _hover={{ bg: 'white', opacity: 0.85 }}
          >
            Cancel
          </Button>
          {showSaveDraftButton ? (
            <Button
              w="auto"
              px="16px"
              py="12px"
              color="white"
              backgroundColor="#004a82"
              onClick={handleSaveDraft}
              isLoading={isSavingDraft}
              isDisabled={isSubmitting}
              fontWeight="normal"
              fontSize="16px"
              lineHeight="normal"
              height="auto"
              borderRadius="6px"
              flexShrink={0}
              _hover={{ backgroundColor: '#003a5a' }}
            >
              Save Draft
            </Button>
          ) : null}
          <Button
            w="auto"
            px="16px"
            py="12px"
            color="white"
            backgroundColor="#004a82"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            isDisabled={isSavingDraft}
            fontWeight="normal"
            fontSize="16px"
            lineHeight="normal"
            height="auto"
            borderRadius="6px"
            flexShrink={0}
            _hover={{ backgroundColor: '#003a5a' }}
          >
            {submitButtonLabel}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
