import { RequestStatusGroup } from '../../../types';
import { StatusFilterOption } from '../../FilterControls/StatusFilterBar';
import { getFilterBtnLabel } from '../../utils/Helpers';

export const requestStatusFilterOptions: StatusFilterOption<RequestStatusGroup>[] =
  [
    {
      value: RequestStatusGroup.Approved,
      label: getFilterBtnLabel(RequestStatusGroup.Approved),
      backgroundColor: '#00BFB333',
    },
    {
      value: RequestStatusGroup.RevisionsRequested,
      label: getFilterBtnLabel(RequestStatusGroup.RevisionsRequested),
      backgroundColor: '#69707D33',
    },
    {
      value: RequestStatusGroup.Denied,
      label: getFilterBtnLabel(RequestStatusGroup.Denied),
      backgroundColor: '#BD271E33',
    },
    {
      value: RequestStatusGroup.ApprovedWithConditions,
      label: getFilterBtnLabel(RequestStatusGroup.ApprovedWithConditions),
      backgroundColor: '#F5A70033',
    },
    {
      value: RequestStatusGroup.UnderReview,
      label: getFilterBtnLabel(RequestStatusGroup.UnderReview),
      backgroundColor: '#006DE433',
    },
  ];
