import { Box } from '@chakra-ui/react';

import { BackendCommonConditionStatus } from '../../types';
import { ColoredLabel } from '../Label/ColoredLabel';
import { getCommonConditionStatusLabel } from '../utils/Helpers';

const commonConditionStatusColors: Record<
  BackendCommonConditionStatus,
  string
> = {
  DRAFT: 'white',
  SUBMITTED: '#006DE433',
  REJECTED: '#BD271E33',
  PUBLISHED: '#00BFB333',
};

interface CommonConditionStatusLabelProps {
  status: BackendCommonConditionStatus;
}

export const CommonConditionStatusLabel = ({
  status,
}: CommonConditionStatusLabelProps) => (
  <Box w="fit-content">
    <ColoredLabel
      labelText={getCommonConditionStatusLabel(status)}
      labelColor={commonConditionStatusColors[status]}
    />
  </Box>
);
