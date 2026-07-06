export type AntennaAltitudeUnit = 'ft' | 'm' | 'km';

export interface AntennaAltitudeFieldsProps {
  valueFieldName: string;
  unitFieldName: string;
  isReadOnly?: boolean;
  validate?: (
    // eslint-disable-next-line no-unused-vars
    value: unknown,
    // eslint-disable-next-line no-unused-vars
    formValues: Record<string, unknown>
  ) => string | boolean;
}
