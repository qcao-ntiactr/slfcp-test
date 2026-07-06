import type { ReactNode } from 'react';
import { Box, Flex, Heading, Text } from '@chakra-ui/react';

interface InstructionStepProps {
  children?: ReactNode;
  description: string;
  stepNumber: string;
  title: string;
}

export const InstructionStep = ({
  children,
  description,
  stepNumber,
  title,
}: InstructionStepProps) => {
  return (
    <Flex
      direction={{ base: 'column', md: 'row' }}
      gap={{ base: 2, md: 6 }}
      width="100%"
    >
      <Flex
        align="baseline"
        display={{ base: 'flex', md: 'none' }}
        gap={3}
        pl={{ base: 5, sm: 6 }}
        width="100%"
      >
        <Text color="blue.600" fontSize="3xl" fontWeight="bold" lineHeight="1">
          {stepNumber}
        </Text>
        <Heading lineHeight="1" mb={0} size="lg">
          {title}
        </Heading>
      </Flex>

      <Flex
        align="center"
        justify="center"
        flexShrink={0}
        display={{ base: 'none', md: 'flex' }}
        minWidth={{ base: '48px', md: '48px' }}
        width={{ base: '48px', md: '48px' }}
      >
        <Text
          color="blue.600"
          fontSize={{ base: '4xl', md: '5xl' }}
          fontWeight="bold"
          lineHeight="1"
        >
          {stepNumber}
        </Text>
      </Flex>

      <Flex
        align="stretch"
        borderRadius="md"
        direction="column"
        flex="1"
        gap={4}
        px={{ base: 5, md: 6 }}
        py={6}
        width="100%"
      >
        <Box flex="1">
          <Heading display={{ base: 'none', md: 'block' }} size="lg" mb={2}>
            {title}
          </Heading>
          <Text>{description}</Text>
          {children && <Box mt={4}>{children}</Box>}
        </Box>
      </Flex>
    </Flex>
  );
};
