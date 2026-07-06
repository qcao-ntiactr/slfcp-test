import {
  Box,
  Text,
  Button,
  HStack,
  Icon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  VStack,
  ModalFooter,
  Heading,
} from '@chakra-ui/react';
import { FaTimesCircle } from 'react-icons/fa';

import { InvalidField } from '../utils/Helpers';
import {
  additionalInfoFields,
  frequenciesTabFields,
  launchSiteFields,
} from '../utils/TabFields';

interface InvalidFieldsWarningProps {
  isOpen: boolean;
  onClose: () => void;
  invalidFields: InvalidField[];
  visitedTabs: { [key: number]: boolean };
}

export const InvalidFieldsWarning = ({
  isOpen,
  onClose,
  invalidFields,
  visitedTabs,
}: InvalidFieldsWarningProps) => {
  const launchSiteErrors = launchSiteFields
    .map((key) => invalidFields.find((f) => f.fieldKey === key))
    .filter((e): e is InvalidField => !!e);

  const frequenciesErrors = invalidFields.filter(
    (f) =>
      (frequenciesTabFields as string[]).includes(f.fieldKey) ||
      f.fieldKey.startsWith('frequencies')
  );

  const additionalInfoErrors = additionalInfoFields
    .map((key) => invalidFields.find((f) => f.fieldKey === key))
    .filter((e): e is InvalidField => !!e);

  const sections = [
    { label: 'Launch Site', errors: launchSiteErrors, visited: visitedTabs[0] },
    {
      label: 'Frequencies',
      errors: frequenciesErrors,
      visited: visitedTabs[1],
    },
    {
      label: 'Additional Information',
      errors: additionalInfoErrors,
      visited: visitedTabs[2],
    },
  ].filter((section) => section.errors.length > 0 && section.visited);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeOnOverlayClick={false}
      closeOnEsc
      onOverlayClick={onClose}
    >
      <ModalOverlay backdropFilter="blur(5px)" />
      <ModalContent
        maxW="600px"
        bg="#f2f2f2"
        borderRadius="6px"
        boxShadow="0px 1px 5px 0px rgba(0,0,0,0.1), 0px 3.6px 13px 0px rgba(0,0,0,0.07), 0px 8.4px 23px 0px rgba(0,0,0,0.06), 0px 23px 35px 0px rgba(0,0,0,0.05)"
        p={4}
      >
        <ModalHeader p={0} mb={4} alignItems="center">
          <HStack spacing={2} align="center" justify="start">
            <Icon
              as={FaTimesCircle}
              w={6}
              h={6}
              color="red.500"
              flexShrink={0}
            />
            <Text
              fontSize="24px"
              fontWeight="bold"
              color="black"
              lineHeight="32px"
            >
              Fix Validation Errors
            </Text>
          </HStack>
          <ModalCloseButton />
        </ModalHeader>

        <Box pb={4}>
          <Text
            textAlign="left"
            fontSize="16px"
            color="black"
            mb={6}
            lineHeight="24px"
          >
            The following fields contain invalid values:
          </Text>
          <Box minHeight="100px" pb={0}>
            <VStack alignItems="flex-start" gap={6}>
              {sections.map((section) => (
                <Box key={section.label} width="100%">
                  <Heading
                    fontSize="20px"
                    fontWeight="bold"
                    mb={2}
                    color="black"
                    lineHeight="24px"
                  >
                    {section.label}
                  </Heading>
                  <VStack alignItems="flex-start" gap={1}>
                    {section.label === 'Frequencies' ? (
                      <Text fontSize="16px" color="black" lineHeight="24px">
                        See Frequencies tab to correct invalid frequencies
                      </Text>
                    ) : (
                      section.errors.map((field) => (
                        <Text
                          key={field.fieldKey}
                          fontSize="16px"
                          color="black"
                          lineHeight="24px"
                        >
                          <span
                            style={{ fontWeight: '700' }}
                          >{`${field.fieldName}: `}</span>
                          {`${field.message}`}
                        </Text>
                      ))
                    )}
                  </VStack>
                </Box>
              ))}
            </VStack>
          </Box>
        </Box>
        <ModalFooter
          p={0}
          pt={4}
          borderTop="none"
          display="flex"
          justifyContent="flex-start"
        >
          <Button
            width="100%"
            bg="#004a82"
            color="white"
            onClick={onClose}
            fontWeight="normal"
            fontSize="16px"
            lineHeight="normal"
            height="auto"
            px="16px"
            py="12px"
            borderRadius="6px"
            _hover={{
              bg: '#003a5a',
            }}
          >
            Ok
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
