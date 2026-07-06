import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

import { app } from './setup.ts';

const prisma = new PrismaClient();
let testRequestId: string;

describe('Concurrences API Integration Tests', () => {
  beforeAll(async () => {
    // Dynamically select a request from the database
    const validRequest = await prisma.request.findFirst({
      where: {
        status: 'UNDER_NTIA_INITIAL_REVIEW', // Use a request that can have concurrences
      },
    });

    if (!validRequest) {
      throw new Error(
        'No SUBMITTED requests found in database. Please run seeding first.'
      );
    }

    testRequestId = validRequest.id.toString();
  });

  afterEach(async () => {
    // Clean up concurrences created during tests to avoid conflicts
    await prisma.concurrence.deleteMany({
      where: {
        request_id: Number(testRequestId),
        user: {
          external_id: {
            in: ['federal@nasa.gov', 'federal@navy.gov', 'federal@noaa.gov'],
          },
        },
      },
    });
  });

  const getTestConcurrenceData = () => ({
    valid: {
      request_id: Number(testRequestId),
      user_id: 'federal@nasa.gov',
      concurred: false,
    },
  });

  describe('POSITIVE TESTS', () => {
    it('should create a new concurrence entry with valid data', async () => {
      const testConcurrenceData = getTestConcurrenceData();
      const res = await request(app)
        .post(`/requests/${testRequestId}/concurrences`)
        .send(testConcurrenceData.valid)
        .set('Content-Type', 'application/json')
        .set('x-user-email', 'federal@nasa.gov');
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('request_id');
    });

    it('should retrieve all concurrences for the request', async () => {
      const testConcurrenceData = getTestConcurrenceData();
      testConcurrenceData.valid.user_id = 'federal@nasa.gov';
      const createRes = await request(app)
        .post(`/requests/${testRequestId}/concurrences`)
        .send(testConcurrenceData.valid)
        .set('Content-Type', 'application/json')
        .set('x-user-email', 'federal@nasa.gov');

      expect(createRes.status).toBe(201);

      const getRes = await request(app)
        .get(`/requests/${testRequestId}/concurrences`)
        .set('x-user-email', 'federal@nasa.gov');
      expect(getRes.status).toBe(200);
      expect(Array.isArray(getRes.body)).toBe(true);
      expect(getRes.body.length).toBeGreaterThan(0);
    });
  });

  describe('NEGATIVE TESTS', () => {
    it('should return 200 for non-existent request when getting concurrences', async () => {
      const res = await request(app)
        .get('/requests/-1/concurrences')
        .set('x-user-email', 'federal@nasa.gov');
      expect(res.status).toBe(200);
    });

    /**
     * Need to make sure the NOAA entity is inactive in the database for this test to pass
     */
    it('should block concurrence submission if entity is inactive', async () => {
      const testConcurrenceData = getTestConcurrenceData();
      testConcurrenceData.valid.user_id = 'federal@noaa.gov';
      const res = await request(app)
        .post(`/requests/${testRequestId}/concurrences`)
        .send(testConcurrenceData.valid)
        .set('Content-Type', 'application/json')
        .set('x-user-email', 'federal@noaa.gov');

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Access denied: entity is inactive');
    });
  });
});
