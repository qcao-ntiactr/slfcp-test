import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { PrismaClient, User } from '@prisma/client';

import { app } from './setup.ts';

const prisma = new PrismaClient();
let testRequestId: string;
let ntiaUser: User;
let nonNtiaUser: User;

describe('Request Revisions API Integration Tests', () => {
  beforeAll(async () => {
    // Dynamically select a request from the database
    const validRequest = await prisma.request.findFirst({
      where: {
        status: 'UNDER_NTIA_INITIAL_REVIEW', // Use a request that can have revisions requested
      },
    });

    if (!validRequest) {
      throw new Error(
        'No SUBMITTED requests found in database. Please run seeding first.'
      );
    }

    testRequestId = validRequest.id.toString();

    // Dynamically get a user from NTIA only
    const user = await prisma.user.findFirst({
      where: {
        entity: {
          id: 1,
        },
      },
    });

    if (!user) {
      throw new Error('No NTIA user found in the database. Please seed data.');
    }

    ntiaUser = user;

    // Get a non-NTIA user for testing restrictions
    const nonNtia = await prisma.user.findFirst({
      where: {
        entity: {
          type: {
            not: 'NTIA',
          },
        },
      },
    });

    if (!nonNtia) {
      throw new Error(
        'No non-NTIA user found in the database. Please seed data.'
      );
    }

    nonNtiaUser = nonNtia;
  });

  describe('POSITIVE TESTS', () => {
    it('should successfully initiate a request revision for a valid request', async () => {
      const res = await request(app)
        .post(`/requests/${testRequestId}/requested-revisions`)
        .send({
          requested_changes: ['occaeca', 'labore dolore amet'],
          user_id: ntiaUser.external_id,
        })
        .set('Content-Type', 'application/json')
        .set('x-user-email', 'ntiadev@company.com');

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('request_id', Number(testRequestId));
      expect(res.body).toHaveProperty('requested_changes');
      expect(res.body).toHaveProperty('user_id', ntiaUser.external_id);
    });
  });

  describe('NEGATIVE TESTS', () => {
    it('should return 404 when request does not exist', async () => {
      const res = await request(app)
        .post('/requests/-1/requested-revisions')
        .send({
          requested_changes: ['missing'],
          user_id: ntiaUser.external_id,
        })
        .set('Content-Type', 'application/json')
        .set('x-user-email', 'ntiadev@company.com');
      expect(res.status).toBe(500);
    });

    it('should return 400 when trying to create requested revisions without specifying an array of requested_changes', async () => {
      const res = await request(app)
        .post(`/requests/${testRequestId}/requested-revisions`)
        .send({
          user_id: ntiaUser.external_id,
        })
        .set('Content-Type', 'application/json')
        .set('x-user-email', 'ntiadev@company.com');

      expect(res.status).toBe(400);
    });

    it('should return 400 when trying to create requested revisions without user_id', async () => {
      const res = await request(app)
        .post(`/requests/${testRequestId}/requested-revisions`)
        .send({
          requested_changes: ['test change'],
        })
        .set('Content-Type', 'application/json')
        .set('x-user-email', 'ntiadev@company.com');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty(
        'message',
        'user_id is required and must be a string'
      );
    });

    it('should return 500 when non-NTIA user tries to create requested revisions', async () => {
      const res = await request(app)
        .post(`/requests/${testRequestId}/requested-revisions`)
        .send({
          requested_changes: ['test change'],
          user_id: nonNtiaUser.external_id,
        })
        .set('Content-Type', 'application/json')
        .set('x-user-email', 'ntiadev@company.com');

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty(
        'message',
        'Failed to create requested revision'
      );
    });
  });
});
