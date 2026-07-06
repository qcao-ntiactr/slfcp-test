import { Box } from '@chakra-ui/react';

import { RequestStatusGroup } from '../../types';
import { ColoredLabel } from '../Label/ColoredLabel';
import { getFilterBtnLabel } from '../utils/Helpers';

const requestStatusLabelColors: Record<RequestStatusGroup, string> = {
  [RequestStatusGroup.Submitted]: 'white',
  [RequestStatusGroup.Denied]: '#BD271E33',
  [RequestStatusGroup.Approved]: '#00BFB333',
  [RequestStatusGroup.ApprovedWithConditions]: '#F5A70033',
  [RequestStatusGroup.RevisionsRequested]: '#69707D33',
  [RequestStatusGroup.UnderReview]: '#006DE433',
};

interface RequestStatusLabelProps {
  status: RequestStatusGroup;
}

export const RequestStatusLabel = ({ status }: RequestStatusLabelProps) => (
  <Box w="fit-content">
    <ColoredLabel
      labelText={getFilterBtnLabel(status)}
      labelColor={requestStatusLabelColors[status]}
    />
  </Box>
);
