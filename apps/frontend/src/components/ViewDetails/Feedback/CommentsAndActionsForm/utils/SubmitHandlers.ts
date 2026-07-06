import { BackendRequestStatus } from 'apps/frontend/src/types';
import { User } from 'apps/frontend/src/context/HybridAuthContext';

import {
  PostApprovalByRequestIdPayload,
  PostCommentByRequestIdPayload,
  PostConcurrenceByRequestIdPayload,
  PostDenialByRequestIdPayload,
  PostRequestedRevisionsByRequestIdPayload,
  UserTypeT,
} from '../../../../../api/types';
import { submitComment } from '../../../../../api/Comments';
import { submitConcurrence } from '../../../../../api/Concurrences';
import { denyRequest } from '../../../../../api/Denials';
import { approveRequest } from '../../../../../api/Approvals';
import { requestRevisions } from '../../../../../api/RequestedRevisions';
import { CommentsAndActionsFormValues } from '../CommentsAndActionsT';

import { approvalActions, concurrenceActions, denialActions } from './Actions';

export type SubmissionContext = {
  data: CommentsAndActionsFormValues;
  user: User;
  userType: UserTypeT;
  requestId: number;
  now: string;
  status: BackendRequestStatus;
};

/**
 * Submits a comment if one is present in the form data.
 *
 * This function builds a comment payload and attempts to submit it.
 * If the submission fails, it logs the error and throws a generic error
 * to be handled by the calling context.
 *
 * @param {SubmissionContext} context - Context for the submission, including user and form data.
 * @throws {Error} If the comment submission fails.
 */
export const submitCommentIfPresent = async ({
  data,
  user,
  userType,
  requestId,
}: SubmissionContext) => {
  if (!data.comment) return;

  const payload: PostCommentByRequestIdPayload = {
    request_id: requestId,
    federal_agency_id: userType === 'NTIA' ? undefined : user.federalAgencyId,
    user_id: user.id,
    user_name: user.displayName,
    user_type: userType,
    comment: data.comment!,
    is_internal: data.is_internal,
  };

  try {
    await submitComment(requestId, payload);
    console.log('Comment submitted');
  } catch (err) {
    console.error('Error submitting comment:', err);
    throw new Error('Submission failed');
  }
};

/**
 * Submits a decision (approval, denial, or concurrence) based on the selected action.
 *
 * This function checks which decision type applies, constructs the appropriate payload,
 * and submits it to the backend. Only one decision type will be processed.
 *
 * If submission fails, the error is logged and a generic error is thrown.
 *
 * @param {SubmissionContext} context - Context for the submission, including user, form data, and request state.
 * @throws {Error} If the decision submission fails.
 */
export const submitDecisionIfPresent = async ({
  data,
  user,
  userType,
  requestId,
  now,
  status,
}: SubmissionContext) => {
  if (!data.action) return;

  try {
    if (approvalActions.includes(data.action)) {
      if (
        data.action === 'approve_with_conditions' &&
        !data.justificationText
      ) {
        throw new Error('Conditions are required for approval with conditions');
      }

      const payload: PostApprovalByRequestIdPayload = {
        request_id: requestId,
        user_id: user.id,
        user_name: user.displayName,
        user_type: userType,
        federal_agency_id:
          userType === 'NTIA' ? undefined : user.federalAgencyId,
        date_approved: now,
        condition: data.justificationText || '',
        is_final: status === 'UNDER_NTIA_FINAL_REVIEW',
      };
      await approveRequest(requestId, payload);
      console.log('Approval submitted');
    } else if (denialActions.includes(data.action)) {
      if (!data.justificationText) {
        switch (data.action) {
          case 'finalize_denial':
            throw new Error('Reason is required for denial');
          case 'request_revisions':
            throw new Error('Requested changes are required for revisions');
        }
      }

      if (data.action === 'request_revisions') {
        const payload: PostRequestedRevisionsByRequestIdPayload = {
          id: requestId,
          user_id: user.id,
          requested_changes: [data?.justificationText],
        };
        await requestRevisions(requestId, payload);
        console.log('Requested Revision submitted');
      }

      const shouldSendReason =
        data.action === 'finalize_denial' ||
        data.action === 'request_revisions';

      const payload: PostDenialByRequestIdPayload = {
        request_id: requestId,
        user_id: user.id,
        user_name: user.displayName,
        user_type: userType,
        federal_agency_id:
          userType === 'NTIA' ? undefined : user.federalAgencyId,
        date_denied: now,
        reason: shouldSendReason ? data?.justificationText : '',
        is_final: data.action === 'finalize_denial',
      };

      await denyRequest(requestId, payload);
      console.log('Denial submitted');
    } else if (concurrenceActions.includes(data.action) && user.id) {
      if (data.action === 'concur_with_conditions' && !data.justificationText) {
        throw new Error(
          'Conditions are required for concurrence with conditions'
        );
      }
      const payload: PostConcurrenceByRequestIdPayload = {
        request_id: requestId,
        user_id: user.id,
        user_name: user.displayName,
        user_type: userType,
        federal_agency_id: user.federalAgencyId,
        concurred: data.action !== 'not_concur',
        conditions: data.justificationText || '',
      };

      await submitConcurrence(requestId, payload);
      console.log('Concurrence submitted');
    }
  } catch (err) {
    console.error('Error submitting decision:', err);
    throw new Error('Submission failed');
  }
};
