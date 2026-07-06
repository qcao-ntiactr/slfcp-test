import { Box, BoxProps, Text } from '@chakra-ui/react';
import { ReactNode } from 'react';

interface ViewContainerProps extends BoxProps {
  headerText: string;
  descriptionText: string;
  backgroundColor: string;
  children: ReactNode;
  hasBorder?: boolean;
}

export const ViewContainer = ({
  headerText,
  descriptionText,
  backgroundColor,
  children,
  hasBorder = false,
  ...rest
}: ViewContainerProps) => {
  return (
    <Box
      p={5}
      backgroundColor={backgroundColor}
      border={hasBorder ? '1px solid black' : undefined}
      {...rest}
    >
      <Box mb={3}>
        <Text fontWeight="bold" textAlign="left">
          {headerText}
        </Text>
        <Text textAlign="left">{descriptionText}</Text>
      </Box>
      {children}
    </Box>
  );
};
