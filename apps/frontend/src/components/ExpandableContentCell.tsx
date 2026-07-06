import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import {
  Box,
  Text,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Icon,
  Button,
  ModalFooter,
} from '@chakra-ui/react';
import { GrExpand } from 'react-icons/gr';

import { ReadOnlyTipTapMarkdown } from './ViewDetails/Feedback/FeedbackTable/CommonConditions/ReadOnlyTipTapMarkdown';

interface ExpandableContentCellProps {
  content: string;
  renderMode?: 'markdown' | 'text';
  ariaLabel?: string;
  metadataLabel?: string;
  metadataDate?: string;
  modalTitle?: string;
  previewBackgroundColor?: string;
}

export const ExpandableContentCell = ({
  content,
  renderMode = 'markdown',
  ariaLabel = 'Expand details',
  metadataLabel,
  metadataDate,
  modalTitle = 'Details',
  previewBackgroundColor = '#F5F7FA',
}: ExpandableContentCellProps) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isTruncated, setIsTruncated] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const normalizedContent = content.trim();
  const hasContent = normalizedContent.length > 0;
  const closeButtonColor = '#004a82';
  const metadataTextColor = 'gray.700';

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;

    const observer = new ResizeObserver((_entries, _observer) => {
      setIsTruncated(element.scrollHeight > element.clientHeight);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [content]);

  const renderContent = () => {
    if (renderMode === 'text') {
      return (
        <Text
          as="pre"
          fontFamily="body"
          fontSize="16px"
          lineHeight="24px"
          whiteSpace="pre-wrap"
          overflowWrap="anywhere"
          wordBreak="break-word"
          color="black"
          m={0}
        >
          {content}
        </Text>
      );
    }

    return <ReadOnlyTipTapMarkdown markdown={content} />;
  };

  return (
    <>
      <Box
        onClickCapture={
          hasContent
            ? (event) => {
                const target = event.target;

                if (
                  target instanceof HTMLElement &&
                  target.closest('a[href]')
                ) {
                  event.preventDefault();
                }
              }
            : undefined
        }
        onClick={hasContent ? onOpen : undefined}
        onKeyDown={
          hasContent
            ? (event: KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onOpen();
                }
              }
            : undefined
        }
        cursor={hasContent ? 'pointer' : 'default'}
        position="relative"
        width="100%"
        textAlign="left"
        tabIndex={hasContent ? 0 : -1}
        role={hasContent ? 'button' : undefined}
        aria-label={hasContent ? ariaLabel : undefined}
        borderBottom="1px solid"
        borderColor="#D3DAE6"
        py={2}
        pr={6}
        pl={0}
        minH="80px"
      >
        <Box
          ref={contentRef}
          maxH="58px"
          overflow="hidden"
          overflowWrap="anywhere"
          wordBreak="break-word"
        >
          {renderContent()}
        </Box>
        {hasContent && (
          <Icon
            as={GrExpand}
            position="absolute"
            top="10px"
            right="2px"
            color={closeButtonColor}
            boxSize={3.5}
            aria-hidden
          />
        )}
        {isTruncated ? (
          <Box
            position="absolute"
            bottom={2}
            left={0}
            right={6}
            height="24px"
            bgGradient={`linear(to-t, ${previewBackgroundColor}, rgba(245,247,250,0))`}
            pointerEvents="none"
          />
        ) : null}
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
        <ModalOverlay backdropFilter="blur(5px)" />
        <ModalContent
          maxW="800px"
          maxH="600px"
          display="flex"
          flexDirection="column"
          bg="#F2F2F2"
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
            {modalTitle}
          </ModalHeader>
          <ModalCloseButton
            top={2}
            right={2}
            color="black"
            _hover={{ bg: 'transparent', color: 'black' }}
            _active={{ bg: 'transparent' }}
          />
          <ModalBody
            p={0}
            display="flex"
            flexDirection="column"
            flex="1"
            minH={0}
          >
            {metadataLabel ? (
              <Text
                fontSize="16px"
                lineHeight="24px"
                color={metadataTextColor}
                mb={0}
              >
                {metadataLabel}
              </Text>
            ) : null}
            {metadataDate ? (
              <Text
                fontSize="16px"
                lineHeight="24px"
                color={metadataTextColor}
                mb={5}
              >
                {metadataDate}
              </Text>
            ) : null}

            <Box
              width="100%"
              flex="1"
              minH={0}
              overflowY="auto"
              mb={6}
              mr={-2}
              pr={2}
              sx={{
                scrollbarColor: '#98A2B3 transparent',
                '&::-webkit-scrollbar': {
                  width: '12px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#98A2B3',
                  borderRadius: '999px',
                  border: '4px solid transparent',
                  backgroundClip: 'padding-box',
                },
              }}
            >
              {renderContent()}
            </Box>
          </ModalBody>
          <ModalFooter p={0} pt={4} borderTop="none">
            <Button
              width="100%"
              bg={closeButtonColor}
              color="white"
              onClick={onClose}
              fontWeight="normal"
              fontSize="16px"
              lineHeight="normal"
              height="40px"
              px="16px"
              py={0}
              borderRadius="6px"
              _hover={{
                bg: '#003a5a',
              }}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};
