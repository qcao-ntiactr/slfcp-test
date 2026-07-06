import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { PrismaClient, User } from '@prisma/client';

import { ActionType } from '../src/services/actions.js';

import { app } from './setup.ts';

const prisma = new PrismaClient();
let testRequestId: number;
let ntiaUser: User;

describe('Actions API Integration Tests', () => {
  beforeAll(async () => {
    // Dynamically select a request from the database
    const validRequest = await prisma.request.findFirst({
      orderBy: { id: 'asc' },
    });

    if (!validRequest) {
      throw new Error(
        'No requests found in database. Please run seeding first.'
      );
    }

    testRequestId = validRequest.id;

    // Dynamically select an NTIA user from the database
    const validUser = await prisma.user.findFirst({
      where: {
        entity: {
          type: 'NTIA',
        },
      },
    });

    if (!validUser) {
      throw new Error(
        'No NTIA users found in database. Please run seeding first.'
      );
    }

    ntiaUser = validUser;
  });

  describe('POSITIVE TESTS', () => {
    it('should retrieve actions by request ID', async () => {
      const getByRequest = await request(app).get(
        `/requests/${testRequestId}/actions`
      );
      expect(getByRequest.status).toBe(200);
      expect(Array.isArray(getByRequest.body)).toBe(true);
    });

    it('should include requested changes in action details for request_revisions', async () => {
      // Prepare requested changes
      const requestedChanges = [
        'Please update the frequency range',
        'Provide additional documentation for antenna specifications',
      ];

      // Get the count of actions before creating the denial
      const actionsBeforeRes = await request(app).get(
        `/requests/${testRequestId}/actions`
      );
      const actionsBefore = actionsBeforeRes.body;

      // Create a denial with is_final: false (which triggers request_revisions action)
      // The reason field is used to represent the changes being requested
      const denialRes = await request(app)
        .post(`/requests/${testRequestId}/denials`)
        .send({
          request_id: testRequestId,
          date_denied: new Date().toISOString(),
          reason: requestedChanges.join('; '), // Pass requested changes as reason
          is_final: false, // This triggers request_revisions action
          user_id: ntiaUser.external_id,
        })
        .set('Content-Type', 'application/json')
        .set('x-user-email', 'ntiadev@company.com');

      expect(denialRes.status).toBe(201);

      // Get actions after creating the denial
      const actionsAfterRes = await request(app).get(
        `/requests/${testRequestId}/actions`
      );

      expect(actionsAfterRes.status).toBe(200);
      const actionsAfter = actionsAfterRes.body;

      // Find the new request_revisions action
      const newActions = actionsAfter.filter(
        (action: ActionType) =>
          !actionsBefore.some((before: ActionType) => before.id === action.id)
      );

      const requestRevisionsAction = newActions.find(
        (action: ActionType) => action.action === 'request_revisions'
      );

      expect(requestRevisionsAction).toBeDefined();
      expect(requestRevisionsAction.details).toContain(
        'Please update the frequency range'
      );
      expect(requestRevisionsAction.details).toContain(
        'Provide additional documentation for antenna specifications'
      );

      // The details should contain the requested changes joined with semicolons
      const expectedDetails = requestedChanges.join('; ');
      expect(requestRevisionsAction.details).toBe(expectedDetails);
    });
  });

  describe('NEGATIVE TESTS', () => {
    it('should return 200 for non-existent request when getting actions', async () => {
      const res = await request(app).get('/requests/-999/actions');
      expect(res.status).toBe(200);
    });
  });
});
