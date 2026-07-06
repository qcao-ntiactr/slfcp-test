export type EirpUnit = 'Watts' | 'dBW' | 'milliWatts' | 'dBm';

export interface EirpFieldsProps {
  valueFieldName: string;
  unitFieldName: string;
  isReadOnly?: boolean;
}
