import { describe, test, expect } from 'vitest';
import { ActionOption } from '@slfcp/role-actions-access-control';

// Test the logic for hiding actions dropdown for federal agency users who cannot vote
describe('ViewDetailsPage - Action Options Visibility', () => {
  const mockBaseActionOptions: ActionOption[] = [
    { label: 'Concur', value: 'concur' },
    { label: 'Concur with Conditions', value: 'concur_with_conditions' },
    { label: 'Not Concur', value: 'not_concur' },
  ];

  const getActionOptions = (
    baseActionOptions: ActionOption[] | undefined,
    role: string | undefined,
    canConcur: boolean | undefined
  ): ActionOption[] | undefined => {
    if (!baseActionOptions) return undefined;

    // If user is federal agency and cannot concur, hide the entire actions dropdown
    if (role?.toLowerCase() === 'federal' && canConcur === false) {
      return undefined;
    }

    return baseActionOptions;
  };

  test('should hide actions dropdown entirely for federal users who cannot vote', () => {
    const result = getActionOptions(mockBaseActionOptions, 'Federal', false);
    expect(result).toBeUndefined();
  });

  test('should show actions dropdown for federal users who can vote', () => {
    const result = getActionOptions(mockBaseActionOptions, 'Federal', true);
    expect(result).toEqual(mockBaseActionOptions);
  });

  test('should show actions dropdown for federal users with undefined canConcur', () => {
    const result = getActionOptions(
      mockBaseActionOptions,
      'Federal',
      undefined
    );
    expect(result).toEqual(mockBaseActionOptions);
  });

  test('should show actions dropdown for non-federal users regardless of canConcur', () => {
    const result = getActionOptions(mockBaseActionOptions, 'NTIA', false);
    expect(result).toEqual(mockBaseActionOptions);
  });

  test('should return undefined when baseActionOptions is undefined', () => {
    const result = getActionOptions(undefined, 'Federal', false);
    expect(result).toBeUndefined();
  });

  test('should hide actions dropdown for federal users who cannot vote even with mixed actions', () => {
    const mixedActions: ActionOption[] = [
      { label: 'Approve', value: 'approve' },
      { label: 'Concur', value: 'concur' },
      { label: 'Request Revisions', value: 'request_revisions' },
      { label: 'Not Concur', value: 'not_concur' },
    ];

    const result = getActionOptions(mixedActions, 'Federal', false);
    expect(result).toBeUndefined();
  });
});
