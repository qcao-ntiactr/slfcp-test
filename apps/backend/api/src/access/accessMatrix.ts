type Role = 'NTIA' | 'FEDERAL_AGENCY' | 'COMMERCIAL';
type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
type RouteKey = `${Method} ${string}`;

export const accessMatrix: Record<RouteKey, Role[]> = {
  // Request routes
  'GET /requests': ['NTIA', 'FEDERAL_AGENCY', 'COMMERCIAL'],
  'POST /requests': ['COMMERCIAL'],
  'GET /requests/:id': ['NTIA', 'FEDERAL_AGENCY', 'COMMERCIAL'],
  'PUT /requests/:id': ['COMMERCIAL'],

  // Comments
  'GET /requests/:id/comments': ['NTIA', 'FEDERAL_AGENCY', 'COMMERCIAL'],
  'POST /requests/:id/comments': ['NTIA', 'FEDERAL_AGENCY', 'COMMERCIAL'],

  // Approvals
  'GET /requests/:id/approvals': ['NTIA', 'FEDERAL_AGENCY', 'COMMERCIAL'],
  'POST /requests/:id/approvals': ['NTIA'],

  // Denials
  'GET /requests/:id/denials': ['NTIA', 'FEDERAL_AGENCY', 'COMMERCIAL'],
  'POST /requests/:id/denials': ['NTIA'],

  // Concurrences
  'GET /requests/:id/concurrences': ['NTIA', 'FEDERAL_AGENCY', 'COMMERCIAL'],
  'POST /requests/:id/concurrences': ['FEDERAL_AGENCY'],

  // Actions
  'GET /requests/:id/actions': ['NTIA', 'FEDERAL_AGENCY', 'COMMERCIAL'],

  // Revisions
  'POST /requests/:id/revisions': ['COMMERCIAL'],
  'GET /requests/:id/revisions/:revisionId': [
    'NTIA',
    'FEDERAL_AGENCY',
    'COMMERCIAL',
  ],

  // Requested revisions
  'GET /requests/:id/requested-revisions': [
    'NTIA',
    'FEDERAL_AGENCY',
    'COMMERCIAL',
  ],
  'POST /requests/:id/requested-revisions': ['NTIA'],

  // Inquiries
  'GET /requests/:id/inquiries': ['NTIA', 'FEDERAL_AGENCY', 'COMMERCIAL'],
  'POST /requests/:id/inquiries': ['NTIA', 'FEDERAL_AGENCY', 'COMMERCIAL'],
  'GET /requests/:id/inquiries/:inquiryId': [
    'NTIA',
    'FEDERAL_AGENCY',
    'COMMERCIAL',
  ],
  'PUT /requests/:id/inquiries/:inquiryId': [
    'NTIA',
    'FEDERAL_AGENCY',
    'COMMERCIAL',
  ],

  // Messages
  'POST /requests/:id/inquiries/:inquiryId/messages': [
    'NTIA',
    'FEDERAL_AGENCY',
    'COMMERCIAL',
  ],
  'POST /requests/:id/inquiries/:inquiryId/mark-read': [
    'NTIA',
    'FEDERAL_AGENCY',
    'COMMERCIAL',
  ],
  'PUT /messages/:messageId/mark-read': [
    'NTIA',
    'FEDERAL_AGENCY',
    'COMMERCIAL',
  ],

  // Request drafts
  'GET /request-drafts': ['COMMERCIAL'],
  'POST /request-drafts': ['COMMERCIAL'],
  'GET /request-drafts/:id': ['COMMERCIAL'],
  'PUT /request-drafts/:id': ['COMMERCIAL'],
  'DELETE /request-drafts/:id': ['COMMERCIAL'],

  // Users
  'GET /users/:externalId': ['NTIA', 'FEDERAL_AGENCY', 'COMMERCIAL'],
  'GET /users/email/:email': ['NTIA', 'FEDERAL_AGENCY', 'COMMERCIAL'],

  // Frequency ranges
  'GET /allowed_frequency_ranges': ['NTIA', 'FEDERAL_AGENCY', 'COMMERCIAL'],

  // Dashboard
  'GET /dashboard/requests-over-time/:timeframe': ['NTIA'],
  'GET /dashboard/request-completion-time/:timeframe': ['NTIA'],
  'GET /dashboard/requests-by-commercial-entity': ['NTIA'],
  'GET /dashboard/requests-by-status': ['NTIA'],

  // Common conditions
  'GET /common-conditions/options': ['NTIA', 'FEDERAL_AGENCY', 'COMMERCIAL'],
  'GET /common-conditions/published': ['NTIA', 'FEDERAL_AGENCY'],
  'GET /common-conditions/submitted': ['NTIA', 'FEDERAL_AGENCY'],
  'POST /common-conditions/drafts': ['NTIA', 'FEDERAL_AGENCY'],
  'PUT /common-conditions/drafts/:id': ['NTIA', 'FEDERAL_AGENCY'],
  'POST /common-conditions/:id/submit': ['NTIA', 'FEDERAL_AGENCY'],
  'POST /common-conditions/:id/publish': ['NTIA'],
  'POST /common-conditions/:id/reject': ['NTIA'],
  'DELETE /common-conditions/:id': ['NTIA', 'FEDERAL_AGENCY'],
};
