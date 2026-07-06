import { Box, Flex, Text } from '@chakra-ui/react';

import { StatusFilterButton } from './StatusFilterButton';

export interface StatusFilterOption<TValue extends string> {
  value: TValue;
  label: string;
  backgroundColor: string;
}

interface StatusFilterBarProps<TValue extends string> {
  options: StatusFilterOption<TValue>[];
  selectedValue?: TValue;
  selectedValues?: TValue[];
  onSelect: (_value: TValue) => void;
  title?: string;
  ariaLabelPrefix: string;
}

export const StatusFilterBar = <TValue extends string>({
  options,
  selectedValue,
  selectedValues,
  onSelect,
  title = 'FILTER BY STATUS',
  ariaLabelPrefix,
}: StatusFilterBarProps<TValue>) => {
  const selectedValueSet = new Set(
    selectedValues || (selectedValue ? [selectedValue] : [])
  );

  return (
    <Box alignSelf="center" paddingY={2} maxW="1000px">
      <Text
        marginBottom="10px"
        marginRight="auto"
        fontSize="12px"
        fontWeight="bold"
        color="gray.600"
      >
        {title}
      </Text>
      <Flex gap={1} wrap="wrap">
        {options.map((option) => (
          <StatusFilterButton
            key={option.value}
            label={option.label}
            backgroundColor={option.backgroundColor}
            isSelected={selectedValueSet.has(option.value)}
            ariaLabel={`${ariaLabelPrefix} ${option.label}`}
            onClick={() => onSelect(option.value)}
          />
        ))}
      </Flex>
    </Box>
  );
};
