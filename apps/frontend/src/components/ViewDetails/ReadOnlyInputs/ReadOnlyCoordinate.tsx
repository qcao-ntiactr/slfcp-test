import {
  Input,
  InputGroup,
  InputLeftAddon,
  InputRightAddon,
} from '@chakra-ui/react';

import {
  getDirection,
  normalizeCoordValue,
} from '../../RequestForm/Fields/CoordinateField/utils/CoordinateHelpers';

export type CoordinateTypeT = 'latitude' | 'longitude';
export interface ReadOnlyCoordinateProps {
  coordinateType: CoordinateTypeT;
  id: string;
  value: number;
}

export const ReadOnlyCoordinate = ({
  coordinateType,
  id,
  value,
}: ReadOnlyCoordinateProps) => {
  const direction = getDirection(coordinateType, value);
  const normalized = normalizeCoordValue(Math.abs(value).toString());

  return (
    <InputGroup w="sm">
      <InputLeftAddon
        className="read-only-addon-button"
        marginRight="5px"
        tabIndex={-1}
      >
        {direction}
      </InputLeftAddon>
      <Input
        id={id}
        className="read-only-input"
        sx={{
          borderTopLeftRadius: '5px',
          borderBottomLeftRadius: '5px',
        }}
        isReadOnly
        value={normalized}
        type="number"
      />
      <InputRightAddon className="addon-label">DD</InputRightAddon>
    </InputGroup>
  );
};
