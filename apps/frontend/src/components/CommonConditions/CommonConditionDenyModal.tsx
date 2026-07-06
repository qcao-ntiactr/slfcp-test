import { useEffect, useState } from 'react';
import {
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  Textarea,
} from '@chakra-ui/react';

interface CommonConditionDenyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (_rejectionReason: string) => Promise<void>;
  isSubmitting?: boolean;
  conditionTitle?: string;
}

export const CommonConditionDenyModal = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  conditionTitle,
}: CommonConditionDenyModalProps) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setRejectionReason('');
    setError('');
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!rejectionReason.trim()) {
      setError('Rejection reason is required.');
      return;
    }

    await onConfirm(rejectionReason.trim());
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnOverlayClick={false}>
      <ModalOverlay backdropFilter="blur(5px)" />
      <ModalContent
        maxW="600px"
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
          Deny Common Condition
        </ModalHeader>
        <ModalCloseButton top={2} right={2} />
        <ModalBody p={0} pb={6}>
          {conditionTitle ? (
            <Text
              fontSize="18px"
              lineHeight="28px"
              fontWeight="semibold"
              color="gray.800"
              mb={4}
            >
              Condition Title: {conditionTitle}
            </Text>
          ) : null}
          <FormControl isInvalid={Boolean(error)}>
            <FormLabel
              htmlFor="common-condition-rejection-reason"
              fontWeight="bold"
            >
              Rejection Reason
            </FormLabel>
            <Textarea
              id="common-condition-rejection-reason"
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              bg="white"
              minH="140px"
            />
            <FormErrorMessage>{error}</FormErrorMessage>
          </FormControl>
          <Text color="#8B1E1E" fontWeight="semibold">
            This action cannot be undone
          </Text>
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
          <Button
            w="auto"
            px="16px"
            py="12px"
            bg="#004a82"
            color="white"
            onClick={handleConfirm}
            isLoading={isSubmitting}
            fontWeight="normal"
            fontSize="16px"
            lineHeight="normal"
            height="auto"
            borderRadius="6px"
            flexShrink={0}
            _hover={{ bg: '#003a5a' }}
          >
            Deny
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
