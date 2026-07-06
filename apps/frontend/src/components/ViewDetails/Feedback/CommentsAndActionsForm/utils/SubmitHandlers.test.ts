import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BackendRequestStatus } from 'apps/frontend/src/types';

import { User, UserRole } from '../../../../../context/HybridAuthContext';
import { approveRequest } from '../../../../../api/Approvals';
import { submitConcurrence } from '../../../../../api/Concurrences';
import { denyRequest } from '../../../../../api/Denials';
import { submitComment } from '../../../../../api/Comments';
import { requestRevisions } from '../../../../../api/RequestedRevisions';
import { UserTypeT } from '../../../../../api/types';
import { CommentsAndActionsFormValues } from '../CommentsAndActionsT';

import {
  submitCommentIfPresent,
  SubmissionContext,
  submitDecisionIfPresent,
} from './SubmitHandlers';

vi.mock('../../../../../api/Comments', () => ({ submitComment: vi.fn() }));
vi.mock('../../../../../api/Approvals', () => ({ approveRequest: vi.fn() }));
vi.mock('../../../../../api/Denials', () => ({ denyRequest: vi.fn() }));
vi.mock('../../../../../api/Concurrences', () => ({
  submitConcurrence: vi.fn(),
}));
vi.mock('../../../../../api/RequestedRevisions', () => ({
  requestRevisions: vi.fn(),
}));

const mockUser: User = {
  id: 'user-123',
  tenantId: '',
  displayName: 'Jane Doe',
  email: 'jane.doe@example.com',
  role: UserRole.ntia,
  federalAgencyId: 2,
  userPrincipalName: '',
};

const baseData: CommentsAndActionsFormValues = {
  comment: 'Test comment',
  is_internal: false,
  action: 'concur',
  justificationText: 'some condition',
};

const baseContext: SubmissionContext = {
  data: baseData,
  user: mockUser,
  userType: 'NTIA' as UserTypeT,
  requestId: 123,
  now: new Date().toISOString(),
  status: 'IN_REVIEW' as BackendRequestStatus,
};

describe('submitCommentIfPresent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Positive tests', () => {
    it('should call submitComment with the correct payload', async () => {
      await submitCommentIfPresent(baseContext);

      expect(submitComment).toHaveBeenCalledWith(123, {
        request_id: 123,
        federal_agency_id: undefined,
        user_id: 'user-123',
        user_name: 'Jane Doe',
        user_type: 'NTIA',
        comment: 'Test comment',
        is_internal: false,
      });
    });
  });

  describe('Negative tests', () => {
    it('should throw a generic error if submitComment throws', async () => {
      (submitComment as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('backend failed')
      );

      await expect(() =>
        submitCommentIfPresent(baseContext)
      ).rejects.toThrowError('Submission failed');
    });

    it('should do nothing if no comment is present', async () => {
      const noCommentContext: SubmissionContext = {
        ...baseContext,
        data: {
          ...baseContext.data,
          comment: '',
        },
      };

      await submitCommentIfPresent(noCommentContext);
      expect(submitComment).not.toHaveBeenCalled();
    });
  });
});

describe('submitDecisionIfPresent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call approveRequest with correct payload', async () => {
    const ctx = {
      ...baseContext,
      data: { ...baseContext.data, action: 'approve' as const },
    };
    await submitDecisionIfPresent(ctx);
    expect(approveRequest).toHaveBeenCalledWith(123, {
      request_id: 123,
      user_id: 'user-123',
      user_name: 'Jane Doe',
      user_type: 'NTIA',
      federal_agency_id: undefined,
      date_approved: ctx.now,
      condition: 'some condition',
      is_final: false,
    });
  });

  it('should call denyRequest with correct payload', async () => {
    const ctx = {
      ...baseContext,
      data: { ...baseContext.data, action: 'finalize_denial' as const },
    };
    await submitDecisionIfPresent(ctx);
    expect(denyRequest).toHaveBeenCalledWith(123, {
      request_id: 123,
      user_id: 'user-123',
      user_name: 'Jane Doe',
      user_type: 'NTIA',
      federal_agency_id: undefined,
      date_denied: ctx.now,
      reason: 'some condition',
      is_final: true,
    });
  });

  it('should call submitConcurrence with correct payload', async () => {
    const ctx = {
      ...baseContext,
      data: { ...baseContext.data, action: 'concur' as const },
    };
    await submitDecisionIfPresent(ctx);
    expect(submitConcurrence).toHaveBeenCalledWith(123, {
      request_id: 123,
      user_id: 'user-123',
      user_name: 'Jane Doe',
      user_type: 'NTIA',
      federal_agency_id: 2,
      concurred: true,
      conditions: 'some condition',
    });
  });

  it('should call approveRequest with condition text for approve_with_conditions', async () => {
    const ctx = {
      ...baseContext,
      data: {
        ...baseContext.data,
        action: 'approve_with_conditions' as const,
      },
    };

    await submitDecisionIfPresent(ctx);

    expect(approveRequest).toHaveBeenCalledWith(123, {
      request_id: 123,
      user_id: 'user-123',
      user_name: 'Jane Doe',
      user_type: 'NTIA',
      federal_agency_id: undefined,
      date_approved: ctx.now,
      condition: 'some condition',
      is_final: false,
    });
  });

  it('should call submitConcurrence with condition text for concur_with_conditions', async () => {
    const ctx = {
      ...baseContext,
      data: {
        ...baseContext.data,
        action: 'concur_with_conditions' as const,
      },
    };

    await submitDecisionIfPresent(ctx);

    expect(submitConcurrence).toHaveBeenCalledWith(123, {
      request_id: 123,
      user_id: 'user-123',
      user_name: 'Jane Doe',
      user_type: 'NTIA',
      federal_agency_id: 2,
      concurred: true,
      conditions: 'some condition',
    });
  });

  it('should throw when approve_with_conditions has no conditions', async () => {
    const ctx = {
      ...baseContext,
      data: {
        ...baseContext.data,
        action: 'approve_with_conditions' as const,
        justificationText: '',
      },
    };

    await expect(() => submitDecisionIfPresent(ctx)).rejects.toThrow(
      'Submission failed'
    );
    expect(approveRequest).not.toHaveBeenCalled();
  });

  it('should throw when concur_with_conditions has no conditions', async () => {
    const ctx = {
      ...baseContext,
      data: {
        ...baseContext.data,
        action: 'concur_with_conditions' as const,
        justificationText: '',
      },
    };

    await expect(() => submitDecisionIfPresent(ctx)).rejects.toThrow(
      'Submission failed'
    );
    expect(submitConcurrence).not.toHaveBeenCalled();
  });

  it('should call requestRevisions when requested revisions are submitted', async () => {
    const ctx = {
      ...baseContext,
      data: {
        ...baseContext.data,
        action: 'request_revisions' as const,
      },
    };

    await submitDecisionIfPresent(ctx);

    expect(requestRevisions).toHaveBeenCalledWith(123, {
      id: 123,
      user_id: 'user-123',
      requested_changes: ['some condition'],
    });
  });

  it('should throw if the API fails', async () => {
    (approveRequest as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('failure')
    );
    const ctx = {
      ...baseContext,
      data: { ...baseContext.data, action: 'approve' as const },
    };
    await expect(() => submitDecisionIfPresent(ctx)).rejects.toThrow(
      'Submission failed'
    );
  });

  it('should do nothing if no action is present', async () => {
    const ctx = {
      ...baseContext,
      data: { ...baseContext.data, action: undefined },
    };
    await submitDecisionIfPresent(ctx);
    expect(approveRequest).not.toHaveBeenCalled();
    expect(denyRequest).not.toHaveBeenCalled();
    expect(submitConcurrence).not.toHaveBeenCalled();
  });
});
