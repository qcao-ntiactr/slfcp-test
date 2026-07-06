import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { PrismaClient, User } from '@prisma/client';

import { app } from './setup.ts';

const prisma = new PrismaClient();
let testRequestId: number;
let ntiaUser: User;

describe('Denials API Integration Tests', () => {
  beforeAll(async () => {
    // Get a valid request
    const validRequest = await prisma.request.findFirst({
      orderBy: { id: 'asc' },
    });

    if (!validRequest) {
      throw new Error('No requests found in the database. Please seed data.');
    }

    testRequestId = validRequest.id;

    // Get a valid NTIA user
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

  const testDenialData = {
    valid: {
      get request_id() {
        return testRequestId;
      },
      date_denied: '2025-06-14T17:16:34.913Z',
      reason: 'reason',
      is_final: true,
      get user_id() {
        return String(ntiaUser.external_id);
      },
    },
  };

  describe('POSITIVE TESTS', () => {
    it('should create a new denial entry with valid data', async () => {
      const res = await request(app)
        .post(`/requests/${testRequestId}/denials`)
        .send(testDenialData.valid)
        .set('Content-Type', 'application/json')
        .set('x-user-email', 'ntiadev@company.com');

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('request_id');
    });

    it('should create and then retrieve denials for the request', async () => {
      const createRes = await request(app)
        .post(`/requests/${testRequestId}/denials`)
        .send(testDenialData.valid)
        .set('Content-Type', 'application/json')
        .set('x-user-email', 'ntiadev@company.com');

      expect(createRes.status).toBe(201);

      const getRes = await request(app)
        .get(`/requests/${testRequestId}/denials`)
        .set('x-user-email', 'ntiadev@company.com');
      expect(getRes.status).toBe(200);
      expect(Array.isArray(getRes.body)).toBe(true);
      expect(getRes.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            request_id: testRequestId,
            reason: testDenialData.valid.reason,
          }),
        ])
      );
    });
  });

  describe('NEGATIVE TESTS', () => {
    it('should return 200 for non-existent request when getting denials', async () => {
      const res = await request(app).get('/requests/-1/denials');
      expect(res.status).toBe(200);
    });
  });
});
