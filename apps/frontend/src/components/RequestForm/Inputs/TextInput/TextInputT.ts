import { ControllerRenderProps } from 'react-hook-form';

export interface FieldControlT {
  label: string;
  fieldName: string;
}

export type ControllerFieldWithId = ControllerRenderProps & { id?: string };

export interface TextInputProps {
  field: ControllerFieldWithId;
  id?: string;
  type?: 'text' | 'datetime-local' | 'email';
  placeholder?: string;
  isTextArea?: boolean;
  isReadOnly?: boolean;
}
