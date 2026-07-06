import { Input } from '@chakra-ui/react';
import { useFormContext } from 'react-hook-form';

import { TextInputProps } from '../TextInput/TextInputT';

import {
  getDependentDateFieldName,
  toISO8601FromLocal,
  toLocalFromISO8601,
} from './utils/DateInputHelpers';

export const DateInput = ({
  isReadOnly = false,
  field,
  id,
}: TextInputProps) => {
  const { clearErrors, trigger } = useFormContext();

  const inputId = id || field?.id || field?.name;

  const dependentDateFieldNames =
    field?.name && getDependentDateFieldName(field?.name);

  const dateType =
    field?.name === 'fcc_filing_date' ? 'date' : 'datetime-local';

  const handleDateChange = (rawValue: string) => {
    clearErrors([field?.name, ...dependentDateFieldNames]);

    if (!rawValue) {
      // Native clear can come through input events; keep clear as explicit empty.
      field.onChange('');
      if (field?.name !== 'fcc_filing_date') {
        trigger(dependentDateFieldNames);
      }
      return;
    }

    const isoValue = toISO8601FromLocal(rawValue);

    field.onChange(isoValue ?? '');
    if (field?.name !== 'fcc_filing_date') {
      trigger(dependentDateFieldNames);
    }
  };

  return (
    <Input
      {...field}
      w="sm"
      cursor="pointer"
      id={inputId}
      type={dateType}
      isReadOnly={isReadOnly}
      className={isReadOnly ? 'read-only-input' : 'input'}
      value={field.value ? toLocalFromISO8601(field.value, dateType) : ''}
      onInput={(e) => handleDateChange((e.target as HTMLInputElement).value)}
      onChange={(e) => handleDateChange(e.target.value)}
    />
  );
};
