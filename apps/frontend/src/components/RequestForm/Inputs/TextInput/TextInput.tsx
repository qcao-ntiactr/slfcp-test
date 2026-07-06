import { Input, Textarea } from '@chakra-ui/react';

import { TextInputProps } from './TextInputT';

export const TextInput = ({
  field,
  id,
  placeholder,
  type = 'text',
  isTextArea = false,
  isReadOnly = false,
}: TextInputProps) => {
  const inputId = id || field?.id || field?.name;

  return isTextArea ? (
    <Textarea
      className={isReadOnly ? 'read-only-input' : 'input'}
      w="sm"
      id={inputId}
      value={field.value || ''}
      placeholder={placeholder}
      onChange={field.onChange}
      isReadOnly={isReadOnly}
    />
  ) : (
    <Input
      w="sm"
      id={inputId}
      value={field.value || ''}
      placeholder={placeholder}
      type={type}
      className={isReadOnly ? 'read-only-input' : 'input'}
      onChange={field.onChange}
      isReadOnly={isReadOnly}
    />
  );
};
