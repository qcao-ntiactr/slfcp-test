import { Text } from '@chakra-ui/react';

interface ColoredLabelProps {
  labelText: string;
  labelColor: string;
}

export const ColoredLabel = ({ labelText, labelColor }: ColoredLabelProps) => {
  return (
    <Text
      className="filter-button"
      backgroundColor={labelColor}
      whiteSpace="normal"
      minHeight="30px"
      maxWidth="160px"
      lineHeight="1.2"
      px="2.5"
      size="sm"
      textAlign="center"
      fontWeight="medium"
      alignContent="center"
      border={labelColor === 'white' ? 'solid gray 1px' : 'none'}
    >
      {labelText}
    </Text>
  );
};
