import { Box, Button, HStack, Input } from '@chakra-ui/react';
import { LuDownload } from 'react-icons/lu';
import React, { useEffect, useState } from 'react';
import { get, useFormContext } from 'react-hook-form';

import { TextInputProps } from '../TextInput/TextInputT';

import {
  base64ToFile,
  extractOriginalFileName,
} from './utils/FileUploadInputHelpers';

export const FileUploadInput = ({ field, id, isReadOnly }: TextInputProps) => {
  const [fileName, setFileName] = useState<string>('');

  const inputId = id || field?.id || field?.name;

  const {
    formState: { errors },
    watch,
  } = useFormContext();

  const fieldError = get(errors, field?.name);
  const fileValue = watch(field?.name);
  const pathName = watch(`${field?.name}_path`);

  // Initialize field with File from base64 + stored path
  useEffect(() => {
    if (
      !(field.value instanceof File) &&
      typeof field.value === 'string' &&
      pathName
    ) {
      try {
        const file = base64ToFile(field.value, pathName);
        field.onChange(file); // preserve UUID-slug name
      } catch (err) {
        console.error('Failed to parse base64 to file:', err);
      }
    }
  }, [field, pathName]);

  // Set filename for display (without UUID slug)
  useEffect(() => {
    if (fileValue instanceof File) {
      setFileName(extractOriginalFileName(fileValue.name));
    } else {
      setFileName('');
    }
  }, [fileValue]);

  return (
    <Box w="sm">
      {/* Hidden Input */}
      <Input
        type="file"
        name={field?.name}
        aria-hidden={true}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            field.onChange(file);
            setFileName(extractOriginalFileName(file.name));
          }
        }}
        cursor={isReadOnly ? 'pointer' : 'none'}
        isDisabled={isReadOnly}
        display="none"
        id={inputId}
      />

      <HStack>
        <Button
          tabIndex={0}
          color="black"
          _disabled={{ color: 'gray.600', fontWeight: 'normal' }}
          border={
            !fieldError && field.value ? 'solid 1px gray' : 'solid #E53E3E 2px'
          }
          as="label"
          htmlFor={inputId}
          w="100%"
          justifyContent="flex-start"
          _focusVisible={{ outline: '2px solid blue' }}
          onClick={isReadOnly ? (e) => e.preventDefault() : undefined}
          leftIcon={<LuDownload />}
          variant="outline"
          isDisabled={isReadOnly}
          cursor={isReadOnly ? 'default' : 'pointer'}
          aria-label={`Select a file. ${fileName ? fileName + ' is selected.' : ''}`}
          onKeyDown={(e) => {
            const isActivationKey = ['Enter', ' ', 'Spacebar'].includes(e.key);
            if (isActivationKey && !isReadOnly) {
              e.preventDefault();
              document.getElementById(inputId)?.click();
            }
          }}
        >
          {fileName || 'No file selected'}
        </Button>
      </HStack>
    </Box>
  );
};
