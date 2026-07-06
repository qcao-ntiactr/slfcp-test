import { FieldControlT } from '../../Inputs/TextInput/TextInputT';

export enum Direction {
  //eslint-disable-next-line no-unused-vars
  North = 'N',
  //eslint-disable-next-line no-unused-vars
  East = 'E',
  //eslint-disable-next-line no-unused-vars
  South = 'S',
  //eslint-disable-next-line no-unused-vars
  West = 'W',
}

export interface DirectionOptions {
  positive: Direction.North | Direction.East;
  negative: Direction.South | Direction.West;
}

export interface CoordinateFieldProps extends FieldControlT {
  mode: 'latitude' | 'longitude';
  isReadOnly?: boolean;

  validate?: (
    _value: unknown,
    _fieldValues: Record<string, unknown>
  ) => string | boolean;
}
