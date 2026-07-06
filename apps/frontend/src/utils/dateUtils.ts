import { format } from 'date-fns';

export type DateInput = Date | string | null | undefined;

export const parseValidDate = (value: DateInput): Date | null => {
  if (!value) return null;

  const date =
    value instanceof Date ? new Date(value.getTime()) : new Date(value);

  return Number.isFinite(date.getTime()) ? date : null;
};

export const formatDateOrEmpty = (value: DateInput, formatString: string) => {
  const date = parseValidDate(value);

  return date ? format(date, formatString) : '';
};
