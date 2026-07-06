import { describe, expect, it } from 'vitest';

import { RequestStatusGroup } from '../../types.ts';
import { UserRole } from '../../context/HybridAuthContext';

import {
  convertUserRoleToEntityType,
  formatFrequencies,
  formatRequestDraftId,
  formatRequestId,
  getFilterBtnLabel,
  mapStatusToStatusGroup,
} from './Helpers.ts';

describe('getFilterBtnLabel', () => {
  describe('positive tests', () => {
    it('should return the formatted status directly for RevisionsRequested', () => {
      expect(getFilterBtnLabel(RequestStatusGroup.RevisionsRequested)).toBe(
        'REVISIONS REQUESTED'
      );
    });

    it('should return the formatted status directly for UnderReview', () => {
      expect(getFilterBtnLabel(RequestStatusGroup.UnderReview)).toBe(
        'UNDER REVIEW'
      );
    });

    it('should prefix other statuses with "REQUEST "', () => {
      expect(getFilterBtnLabel(RequestStatusGroup.Approved)).toBe(
        'REQUEST APPROVED'
      );
      expect(getFilterBtnLabel(RequestStatusGroup.Denied)).toBe(
        'REQUEST DENIED'
      );
    });
  });

  describe('negative tests', () => {
    it('should handle unexpected values gracefully', () => {
      expect(
        // casting as unknown to bypass TypeScript, to test passing an invalid string
        getFilterBtnLabel(
          'SOME_UNKNOWN_STATUS' as unknown as RequestStatusGroup
        )
      ).toBe('REQUEST SOME UNKNOWN STATUS');
    });
  });
});

describe('formatRequestId - positive cases', () => {
  it('formats single-digit ID', () => {
    const year = new Date().getFullYear();
    expect(formatRequestId(1)).toBe(`SLFCP-00001-${year}`);
  });

  it('formats double-digit ID', () => {
    const year = new Date().getFullYear();
    expect(formatRequestId(42)).toBe(`SLFCP-00042-${year}`);
  });

  it('formats five-digit ID', () => {
    const year = new Date().getFullYear();
    expect(formatRequestId(12345)).toBe(`SLFCP-12345-${year}`);
  });

  it('formats zero as ID', () => {
    const year = new Date().getFullYear();
    expect(formatRequestId(0)).toBe(`SLFCP-00000-${year}`);
  });
});

describe('formatRequestId - negative cases', () => {
  it('handles very large numbers without truncating', () => {
    const year = new Date().getFullYear();
    expect(formatRequestId(999999)).toBe(`SLFCP-999999-${year}`);
  });
});

describe('formatRequestDraftId - positive cases', () => {
  it('formats single-digit ID', () => {
    expect(formatRequestDraftId(1)).toBe('SLFCP-DRAFT-00001');
  });

  it('formats double-digit ID', () => {
    expect(formatRequestDraftId(42)).toBe('SLFCP-DRAFT-00042');
  });

  it('formats five-digit ID', () => {
    expect(formatRequestDraftId(12345)).toBe('SLFCP-DRAFT-12345');
  });

  it('formats zero as ID', () => {
    expect(formatRequestDraftId(0)).toBe('SLFCP-DRAFT-00000');
  });
});

describe('formatRequestDraftId - negative cases', () => {
  it('handles large numbers', () => {
    expect(formatRequestDraftId(1234567)).toBe('SLFCP-DRAFT-1234567');
  });

  it('coerces numeric strings implicitly (not recommended)', () => {
    expect(formatRequestDraftId('123' as unknown as number)).toBe(
      'SLFCP-DRAFT-00123'
    ); // Will fail at runtime without TS enforcement
  });
});

describe('mapStatusToStatusGroup', () => {
  describe('positive tests', () => {
    it('should map review related statuses to "Under Review"', () => {
      expect(mapStatusToStatusGroup('UNDER_NTIA_INITIAL_REVIEW')).toBe(
        RequestStatusGroup.UnderReview
      );
      expect(mapStatusToStatusGroup('UNDER_NTIA_FINAL_REVIEW')).toBe(
        RequestStatusGroup.UnderReview
      );
      expect(mapStatusToStatusGroup('UNDER_FEDERAL_AGENCIES_REVIEW')).toBe(
        RequestStatusGroup.UnderReview
      );
    });

    it('should properly map statuses that have a direct equivalent in the RequestStatus enum', () => {
      expect(mapStatusToStatusGroup('DENIED')).toBe(RequestStatusGroup.Denied);
      expect(mapStatusToStatusGroup('APPROVED')).toBe(
        RequestStatusGroup.Approved
      );
      expect(mapStatusToStatusGroup('APPROVED_WITH_CONDITIONS')).toBe(
        RequestStatusGroup.ApprovedWithConditions
      );
    });

    it('should properly map status related to requesting revisions', () => {
      expect(mapStatusToStatusGroup('UNDER_INITIAL_REVISION_PER_NTIA')).toBe(
        RequestStatusGroup.RevisionsRequested
      );
    });
  });
});

describe('formatFrequencies - positive cases', () => {
  it('should format a single frequency', () => {
    expect(formatFrequencies([100])).toBe('100');
  });

  it('should format multiple frequencies with semicolons', () => {
    expect(formatFrequencies([100, 200, 300])).toBe('100; 200; 300');
  });

  it('should handle zero correctly', () => {
    expect(formatFrequencies([0])).toBe('0');
  });

  it('should handle mixed values', () => {
    expect(formatFrequencies([123, 456, 789])).toBe('123; 456; 789');
  });
});

describe('formatFrequencies - negative cases', () => {
  it('should return undefined for undefined input', () => {
    expect(formatFrequencies(undefined)).toBe('');
  });

  it('should return empty string for empty array', () => {
    expect(formatFrequencies([])).toBe('');
  });

  it('should handle NaN inside array', () => {
    expect(formatFrequencies([100, NaN, 200])).toBe('100; NaN; 200');
  });

  it('should handle Infinity inside array', () => {
    expect(formatFrequencies([Infinity, 100])).toBe('Infinity; 100');
  });
});

describe('convertUserRoleToEntityType - positive cases', () => {
  it('should convert Commercial to COMMERCIAL', () => {
    expect(convertUserRoleToEntityType(UserRole.commercial)).toBe('COMMERCIAL');
  });

  it('should convert Federal to FEDERAL_AGENCY', () => {
    expect(convertUserRoleToEntityType(UserRole.federal)).toBe(
      'FEDERAL_AGENCY'
    );
  });

  it('should convert NTIA to NTIA', () => {
    expect(convertUserRoleToEntityType(UserRole.ntia)).toBe('NTIA');
  });
});

describe('convertUserRoleToEntityType - negative cases', () => {
  it('should return undefined for undefined input', () => {
    expect(
      convertUserRoleToEntityType(undefined as unknown as UserRole)
    ).toBeUndefined();
  });

  it('should return undefined for null input', () => {
    expect(
      convertUserRoleToEntityType(null as unknown as UserRole)
    ).toBeUndefined();
  });

  it('should return undefined for arbitrary string not in enum', () => {
    expect(
      convertUserRoleToEntityType('RandomRole' as unknown as UserRole)
    ).toBeUndefined();
  });

  it('should return undefined for numeric input', () => {
    expect(
      convertUserRoleToEntityType(123 as unknown as UserRole)
    ).toBeUndefined();
  });
});
