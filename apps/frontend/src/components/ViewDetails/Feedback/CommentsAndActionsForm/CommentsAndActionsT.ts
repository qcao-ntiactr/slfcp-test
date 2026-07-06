import { actionsT } from 'apps/frontend/src/api/types';

export interface CommentsAndActionsFormValues {
  comment: string;
  is_internal: boolean;
  action?: actionsT;
  justificationText?: string;
}
