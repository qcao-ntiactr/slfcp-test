import { Box, Text } from '@chakra-ui/react';
import { format } from 'date-fns';

export interface InquiryMessageProps {
  message: string;
  from: string;
  timeStamp: string;
  authoredByUser: boolean;
}

export const InquiryMessage = ({
  message,
  from,
  timeStamp,
  authoredByUser,
}: InquiryMessageProps) => {
  return (
    <Box
      tabIndex={0}
      minW="48%"
      maxW="70%"
      w="fit-content"
      mb={'30px'}
      p={6}
      backgroundColor="white"
      borderLeft={!authoredByUser ? '3px solid black' : ''}
      borderRight={authoredByUser ? '3px solid black' : ''}
      marginLeft={authoredByUser ? 'auto' : ''}
      marginRight={authoredByUser ? '' : 'auto'}
      borderRadius="10"
    >
      <Text
        as="pre"
        fontFamily="body"
        mb={5}
        marginLeft={authoredByUser ? 'auto' : ''}
        marginRight={authoredByUser ? '' : 'auto'}
        w="100%"
        whiteSpace="pre-wrap"
        wordBreak="break-word"
      >
        {message}
      </Text>
      <Text
        color="gray.600"
        fontSize="13px"
        marginLeft={authoredByUser ? 'auto' : ''}
        marginRight={authoredByUser ? '' : 'auto'}
        w="fit-content"
        mb={1}
      >
        {from}
      </Text>
      <Text
        color="gray.600"
        fontSize="13px"
        marginLeft={authoredByUser ? 'auto' : ''}
        marginRight={authoredByUser ? '' : 'auto'}
        w="fit-content"
      >
        {format(timeStamp, 'MM/dd/yyyy HH:mm a')}
      </Text>
    </Box>
  );
};
