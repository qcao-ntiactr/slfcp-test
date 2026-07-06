import { describe, expect, it } from 'vitest';

import { canDeleteCommonCondition } from './CommonConditionsTableHelpers';

describe('canDeleteCommonCondition', () => {
  it('allows federal users to delete only their own drafts', () => {
    expect(
      canDeleteCommonCondition(
        { status: 'DRAFT', isOwnedByCurrentUser: true },
        false
      )
    ).toBe(true);

    expect(
      canDeleteCommonCondition(
        { status: 'REJECTED', isOwnedByCurrentUser: true },
        false
      )
    ).toBe(false);

    expect(
      canDeleteCommonCondition(
        { status: 'DRAFT', isOwnedByCurrentUser: false },
        false
      )
    ).toBe(false);
  });

  it('allows NTIA to delete only denied submissions in the submissions table', () => {
    expect(
      canDeleteCommonCondition(
        { status: 'REJECTED', isOwnedByCurrentUser: false },
        true
      )
    ).toBe(true);

    expect(
      canDeleteCommonCondition(
        { status: 'SUBMITTED', isOwnedByCurrentUser: false },
        true
      )
    ).toBe(false);

    expect(
      canDeleteCommonCondition(
        { status: 'DRAFT', isOwnedByCurrentUser: false },
        true
      )
    ).toBe(false);
  });
});
