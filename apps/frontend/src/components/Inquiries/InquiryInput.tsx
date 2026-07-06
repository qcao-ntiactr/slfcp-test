import { Box, Button, Center, Flex, Text, Textarea } from '@chakra-ui/react';
import { useState } from 'react';
import { IoSend } from 'react-icons/io5';

interface InquiryInputProps {
  // eslint-disable-next-line no-unused-vars
  handleSendMessage: (inputText: string) => Promise<void>;
  isClosed?: boolean;
  requestIsFinalized?: boolean;
}

export const InquiryInput = ({
  handleSendMessage,
  isClosed = false,
  requestIsFinalized = false,
}: InquiryInputProps) => {
  const getClosedInquiryText = () => {
    if (isClosed) return 'This inquiry is closed';
    if (requestIsFinalized)
      return 'Coordination for this request has been finalized. Inquiries are closed.';
    return '';
  };

  const [inputText, setInputText] = useState<string>('');
  return (
    <Box>
      {!isClosed && !requestIsFinalized ? (
        <Flex maxW="900px" m="0px auto" py={2}>
          <Textarea
            aria-label="Inquiry message"
            value={inputText}
            backgroundColor="white"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(inputText).then(() => {
                  setInputText('');
                });
              }
            }}
            onChange={(e) => {
              setInputText(e.target.value);
            }}
          />
          <Button
            type="button"
            aria-label="Send message"
            onClick={() =>
              handleSendMessage(inputText).then(() => {
                setInputText('');
              })
            }
          >
            <IoSend color="#005A9E" />
          </Button>
        </Flex>
      ) : (
        <Center>
          <Text color="gray.600" fontStyle="italic">
            {getClosedInquiryText()}
          </Text>
        </Center>
      )}
    </Box>
  );
};
