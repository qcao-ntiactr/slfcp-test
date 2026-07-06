import { Tab, TabProps, Text } from '@chakra-ui/react';

export interface TabHeaderProps extends TabProps {
  isInvalid?: boolean;
  tabName: string;
}

export const TabHeader = ({
  isInvalid = false,
  tabName,
  disabled,
  ...styleProps
}: TabHeaderProps) => {
  return (
    <>
      {isInvalid ? (
        <Tab
          fontWeight={'bold'}
          color="red.600"
          isDisabled={disabled}
          pt={5}
          pb={3}
          {...styleProps}
        >
          <Text mr={3}>{tabName}</Text>
        </Tab>
      ) : (
        <Tab
          fontWeight={'bold'}
          isDisabled={disabled}
          pt={5}
          pb={3}
          {...styleProps}
        >
          {tabName}
        </Tab>
      )}
    </>
  );
};
