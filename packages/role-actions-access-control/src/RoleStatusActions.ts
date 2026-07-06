export type ActionOption = { label: string; value: string };
export type StatusActions = Record<string, ActionOption[]>;

export const roleStatusActions: Record<string, StatusActions> = {
  // commercial user never has actions
  commercial_user: {},
  ntia: {
    UNDER_NTIA_INITIAL_REVIEW: [
      { label: 'Approve', value: 'approve' },
      { label: 'Request Revisions', value: 'request_revisions' },
    ],
    UNDER_NTIA_FINAL_REVIEW: [
      { label: 'Approve', value: 'approve' },
      { label: 'Approve with Conditions', value: 'approve_with_conditions' },
      { label: 'Deny', value: 'finalize_denial' },
      { label: 'Request Revisions', value: 'request_revisions' },
    ],
  },
  federal: {
    UNDER_FEDERAL_AGENCIES_REVIEW: [
      { label: 'Concur', value: 'concur' },
      { label: 'Concur with Conditions', value: 'concur_with_conditions' },
      { label: 'Not Concur', value: 'not_concur' },
    ],
  },
};
