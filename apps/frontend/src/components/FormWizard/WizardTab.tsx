import { Tab, Text } from '@chakra-ui/react';

export interface WizardTabProps {
  isInvalid: boolean;
  title: string;
  isDisabled: boolean;
}

export const WizardTab = ({ isInvalid, title, isDisabled }: WizardTabProps) => (
  <Tab
    fontWeight="bold"
    color={isInvalid ? 'red.600' : undefined}
    isDisabled={isDisabled}
    aria-invalid={isInvalid}
    pt={5}
    pb={3}
  >
    {isInvalid ? <Text mr={3}>{title}</Text> : title}
  </Tab>
);
