import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { PrismaClient, User } from '@prisma/client';

import { app } from './setup.ts';

const prisma = new PrismaClient();
let testRequestId: number;
let ntiaUser: User;

describe('Approvals API Integration Tests', () => {
  beforeAll(async () => {
    // Dynamically get a valid request
    const validRequest = await prisma.request.findFirst({
      orderBy: { id: 'asc' },
    });

    if (!validRequest) {
      throw new Error('No requests found in the database. Please seed data.');
    }

    testRequestId = validRequest.id;

    // Dynamically get a user from NTIA only
    const user = await prisma.user.findFirst({
      where: {
        entity: {
          type: 'NTIA',
        },
      },
    });

    if (!user) {
      throw new Error('No NTIA user found in the database. Please seed data.');
    }

    ntiaUser = user;
  });

  const testApprovalData = {
    valid: {
      get request_id() {
        return testRequestId;
      },
      date_approved: '2025-06-14T17:16:34.913Z',
      condition: 'condition',
      get user_id() {
        return ntiaUser.external_id;
      },
    },
  };

  describe('POSITIVE TESTS', () => {
    it('should create a new approval entry with valid data', async () => {
      const res = await request(app)
        .post(`/requests/${testRequestId}/approvals`)
        .send(testApprovalData.valid)
        .set('Content-Type', 'application/json')
        .set('x-user-email', 'ntiadev@company.com');

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('id');
    });

    it('should create and then retrieve approvals for the request', async () => {
      const createRes = await request(app)
        .post(`/requests/${testRequestId}/approvals`)
        .send(testApprovalData.valid)
        .set('Content-Type', 'application/json')
        .set('x-user-email', 'ntiadev@company.com');

      expect(createRes.status).toBe(201);
      expect(createRes.body).toHaveProperty('success', true);
      expect(createRes.body).toHaveProperty('data');
      const createdId = createRes.body.data.id;

      const getRes = await request(app)
        .get(`/requests/${testRequestId}/approvals`)
        .set('x-user-email', 'ntiadev@company.com');
      expect(getRes.status).toBe(200);
      expect(Array.isArray(getRes.body)).toBe(true);
      expect(getRes.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: createdId,
            request_id: testRequestId,
            condition: testApprovalData.valid.condition,
          }),
        ])
      );
    });
  });

  describe('NEGATIVE TESTS', () => {
    it('should return 200 for non-existent request when getting approvals', async () => {
      const res = await request(app)
        .get('/requests/-1/approvals')
        .set('x-user-email', 'ntiadev@company.com');
      expect(res.status).toBe(200);
    });
  });
});
