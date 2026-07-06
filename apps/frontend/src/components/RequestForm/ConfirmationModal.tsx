import {
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
} from '@chakra-ui/react';
import { ReactElement } from 'react';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;

  title?: string;
  subtitle?: string;
  bodyContent: ReactElement;

  handleContinueClick?: () => void;
  continueBtnText: string;
  continueDisabled?: boolean;

  includeCancel?: boolean;
  handleCancelClick?: () => void;
  cancelBtnText?: string;
}

export const ConfirmationModal = ({
  isOpen,
  onClose,
  title = '',
  subtitle,
  bodyContent,
  handleContinueClick = () => onClose(),
  continueBtnText,
  continueDisabled = false,
  includeCancel = false,
  handleCancelClick = () => onClose(),
  cancelBtnText = 'Cancel',
}: ConfirmationModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnOverlayClick={false}>
      <ModalOverlay backdropFilter="blur(5px)" />
      <ModalContent
        maxW="600px"
        bg="#f2f2f2"
        borderRadius="6px"
        boxShadow="0px 1px 5px 0px rgba(0,0,0,0.1), 0px 3.6px 13px 0px rgba(0,0,0,0.07), 0px 8.4px 23px 0px rgba(0,0,0,0.06), 0px 23px 35px 0px rgba(0,0,0,0.05)"
        p={4}
      >
        <ModalHeader
          fontWeight="bold"
          fontSize="24px"
          color="black"
          lineHeight="32px"
          p={0}
          mb={4}
        >
          {title}
        </ModalHeader>
        <ModalCloseButton top={2} right={2} />
        {subtitle ? (
          <Text
            fontSize="18px"
            lineHeight="28px"
            fontWeight="semibold"
            color="gray.800"
            mb={4}
          >
            {subtitle}
          </Text>
        ) : null}
        <ModalBody p={0} mb={6}>
          {bodyContent}
        </ModalBody>

        <ModalFooter
          display="flex"
          flexDirection="row"
          justifyContent="flex-end"
          gap={4}
          p={0}
          pt={6}
          borderTop="none"
        >
          {includeCancel && (
            <Button
              w="112px"
              variant="outline"
              onClick={handleCancelClick}
              color={'#004a82'}
              borderColor={'#004a82'}
              borderWidth="1px"
              bg="white"
              fontWeight="normal"
              fontSize="16px"
              height="40px"
              lineHeight="32px"
              borderRadius="6px"
              flexShrink={0}
              _hover={{
                bg: 'white',
                opacity: 0.8,
              }}
            >
              {cancelBtnText}
            </Button>
          )}

          <Button
            w="auto"
            px="16px"
            py="12px"
            color="white"
            bg="#004a82"
            onClick={handleContinueClick}
            disabled={continueDisabled}
            fontWeight="normal"
            fontSize="16px"
            lineHeight="normal"
            height="auto"
            borderRadius="6px"
            flexShrink={0}
            _hover={{
              bg: '#003a5a',
            }}
          >
            {continueBtnText}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
