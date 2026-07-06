import { actionsT } from 'apps/frontend/src/api/types';

/**
 * Selected action is checked against this variable to determine whether or not
 * to render the Reasons/Conditions form input, and which header to use.
 */
export const actionsRequiringJustificationText = {
  conditions: ['approve_with_conditions', 'concur_with_conditions'],
  reason: ['finalize_denial'],
  requested_changes: ['request_revisions'],
};

export const approvalActions: actionsT[] = [
  'approve',
  'approve_with_conditions',
];

export const denialActions: actionsT[] = [
  'request_revisions',
  'finalize_denial',
];

export const concurrenceActions: actionsT[] = [
  'concur',
  'concur_with_conditions',
  'not_concur',
];
