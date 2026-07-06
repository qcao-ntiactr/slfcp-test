import { Input } from '@chakra-ui/react';

export interface ReadOnlyTextOrNumberProps {
  inputType: 'number' | 'text' | 'textarea';
  id: string;
  value: string | number;
}

export const ReadOnlyTextOrNumber = ({
  inputType,
  id,
  value,
}: ReadOnlyTextOrNumberProps) => {
  return (
    <Input
      id={id}
      w="sm"
      value={value}
      type={inputType}
      className={'read-only-input'}
      isReadOnly
    />
  );
};
