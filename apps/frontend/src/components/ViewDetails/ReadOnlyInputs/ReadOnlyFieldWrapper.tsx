import { Box, Flex, FormLabel } from '@chakra-ui/react';
import React from 'react';

export const ReadOnlyField = ({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) => (
  <Box className="field-container">
    <Flex className="field-row">
      <Box maxHeight="xs" p={0} overflow="hidden">
        <FormLabel className="field-label" htmlFor={htmlFor}>
          {label}
        </FormLabel>
      </Box>
      {children}
    </Flex>
  </Box>
);
