import { RequestBase } from '../types';

export type federalActions = 'concur' | 'concur_with_conditions' | 'not_concur';
/**
 * Actions taken by NTIA on a request.
 * - Approvals: 'approve', 'approve_with_conditions'
 * - Denials: 'finalize_denial', 'request_revisions'
 */
export type ntiaActions =
  | 'approve'
  | 'approve_with_conditions'
  | 'finalize_denial'
  | 'request_revisions';

export type commercialActions = 'resubmit';

export type actionsT = ntiaActions | federalActions | commercialActions;

export type UserTypeT = 'FEDERAL_AGENCY' | 'NTIA' | 'COMMERCIAL';

export type PostCommentByRequestIdPayload = {
  request_id: number;
  federal_agency_id?: number;
  federal_agency_name?: string;
  federal_agency_abbr?: string;
  user_id: string;
  user_name: string;
  user_type: UserTypeT;
  comment: string;
  is_internal: boolean;
};

export type GetCommentsByRequestIdResponse = PostCommentByRequestIdPayload & {
  id: number;
  createdAt: string;
  updatedAt: string;
};

export type PostApprovalByRequestIdPayload = {
  request_id: number;
  user_id: string;
  user_name: string;
  user_type: UserTypeT;
  federal_agency_id?: number;
  date_approved: string;
  condition: string;
  is_final: boolean;
};

export type GetApprovalsByRequestIdResponse = PostApprovalByRequestIdPayload & {
  id: number;
  read?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PostDenialByRequestIdPayload = {
  request_id: number;
  user_id: string;
  user_name: string;
  user_type: UserTypeT;
  federal_agency_id?: number;
  date_denied: string;
  reason: string;
  is_final: boolean;
};

export type GetDenialsByRequestIdResponse = PostDenialByRequestIdPayload & {
  id: number;
  read?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PostConcurrenceByRequestIdPayload = {
  request_id: number;
  user_id: string;
  user_name: string;
  user_type: UserTypeT;
  federal_agency_id?: number;
  concurred: boolean;
  conditions?: string;
};

export type GetConcurrencesByRequestIdResponse =
  PostConcurrenceByRequestIdPayload & {
    id: number;
    createdAt: string;
    updatedAt: string;
    user_name?: string;
    user_type?: string;
    entity_id?: number;
    entity_name?: string;
    entity_abbr?: string;
  };

export type PostRequestedRevisionsByRequestIdPayload = {
  id: number;
  user_id: string;
  requested_changes: string[];
};

export type GetRequestedRevisionsByRequestIdResponse =
  PostRequestedRevisionsByRequestIdPayload & {
    created_at: string;
    updated_at: string;
  };

export type PostRevisionByRequestIdPayload = RequestBase & {
  id: number;
};

export type PostActionByRequestIdPayload = {
  request_id: number;
  federal_agency_id?: number;
  federal_agency_name?: string;
  federal_agency_abbr?: string;
  user_id: string;
  user_name: string;
  user_type: UserTypeT;
  action: actionsT;
  details: string;
};

export type GetActionsByRequestIdResponse = PostActionByRequestIdPayload & {
  id: number;
  createdAt: string;
};
