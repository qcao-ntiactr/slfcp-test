import { ControllerRenderProps } from 'react-hook-form';

export type SelectOption = {
  value: string;
  label: string;
};
export interface SelectInputProps {
  placeholder?: string;
  selectOptions: SelectOption[];
  field: ControllerRenderProps;
  id?: string;
  isReadOnly?: boolean;
}
