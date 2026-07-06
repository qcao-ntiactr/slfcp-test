import path from 'path';

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const url = process.env.AZURE_WORKFLOW_URL;

if (!url) {
  throw new Error('AZURE_WORKFLOW_URL is not defined in environment variables');
}

describe('Logic App Status Workflow Integration Tests', () => {
  const testCases = [
    {
      current_status: 'SUBMITTED',
      action: '',
      expected: 'UNDER_NTIA_INITIAL_REVIEW',
    },
    {
      current_status: 'UNDER_NTIA_INITIAL_REVIEW',
      action: 'request_revisions',
      expected: 'UNDER_INITIAL_REVISION_PER_NTIA',
    },
    {
      current_status: 'UNDER_NTIA_INITIAL_REVIEW',
      action: 'approve',
      expected: 'UNDER_FEDERAL_AGENCIES_REVIEW',
    },

    {
      current_status: 'UNDER_FEDERAL_AGENCIES_REVIEW',
      action: 'concur',
      expected: 'UNDER_NTIA_FINAL_REVIEW',
      metadata: { concur: true, conditions: false },
    },
    {
      current_status: 'UNDER_FEDERAL_AGENCIES_REVIEW',
      action: 'not_concur',
      expected: 'UNDER_NTIA_FINAL_REVIEW',
      metadata: { concur: false },
    },
    {
      current_status: 'UNDER_FEDERAL_AGENCIES_REVIEW',
      action: 'concur_with_conditions',
      expected: 'UNDER_NTIA_FINAL_REVIEW',
      metadata: { concur: true, conditions: true },
    },

    {
      current_status: 'UNDER_INITIAL_REVISION_PER_NTIA',
      action: 'resubmit',
      expected: 'UNDER_NTIA_INITIAL_REVIEW',
    },

    {
      current_status: 'UNDER_NTIA_FINAL_REVIEW',
      action: 'approve',
      expected: 'APPROVED',
    },
    {
      current_status: 'UNDER_NTIA_FINAL_REVIEW',
      action: 'approve_with_conditions',
      expected: 'APPROVED_WITH_CONDITIONS',
    },
    {
      current_status: 'UNDER_NTIA_FINAL_REVIEW',
      action: 'finalize_denial',
      expected: 'DENIED',
    },
    {
      current_status: 'UNDER_NTIA_FINAL_REVIEW',
      action: 'request_revisions',
      expected: 'UNDER_FINAL_REVISION_PER_NTIA',
    },

    {
      current_status: 'UNDER_FINAL_REVISION_PER_NTIA',
      action: 'resubmit',
      expected: 'UNDER_FEDERAL_AGENCIES_REVIEW',
      metadata: { 're-review': true },
    },
  ];

  testCases.forEach(({ current_status, action, expected, metadata }) => {
    it(`should return ${expected} for status="${current_status}" and action="${action}"`, async () => {
      const res = await request(url).post('').send({ current_status, action });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(expected);

      if (metadata) {
        expect(res.body.metadata).toMatchObject(metadata);
      }
    }, 15000); // Increase timeout to 15 seconds for Azure Logic App calls
  });
});
