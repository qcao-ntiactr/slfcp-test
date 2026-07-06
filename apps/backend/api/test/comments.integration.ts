import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

import { app } from './setup.ts';

const prisma = new PrismaClient();
let testRequestId: number;
let testUserId: string;

describe('Comments API Integration Tests', () => {
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

    // Dynamically select a user from the database
    const validUser = await prisma.user.findFirst({
      where: {
        entity: {
          type: {
            in: ['NTIA', 'FEDERAL_AGENCY'],
          },
        },
      },
    });

    if (!validUser) {
      throw new Error(
        'No NTIA or FEDERAL_AGENCY users found in database. Please run seeding first.'
      );
    }

    testUserId = validUser.external_id;
  });

  const testCommentData = {
    valid: {
      get request_id() {
        return testRequestId;
      },
      get user_id() {
        return testUserId;
      },
      comment: 'This is a test comment.',
      is_internal: false,
    },
  };

  describe('POSITIVE TESTS', () => {
    it('should create a new comment entry with valid data', async () => {
      const res = await request(app)
        .post(`/requests/${testRequestId}/comments`)
        .send(testCommentData.valid)
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('comment');
      expect(res.body.comment).toBe(testCommentData.valid.comment);
    });

    it('should return all comments for the request', async () => {
      const createRes = await request(app)
        .post(`/requests/${testRequestId}/comments`)
        .send(testCommentData.valid)
        .set('Content-Type', 'application/json');

      expect(createRes.status).toBe(201);
      const commentId = createRes.body.id;

      const getRes = await request(app).get(
        `/requests/${testRequestId}/comments`
      );
      expect(getRes.status).toBe(200);
      expect(Array.isArray(getRes.body)).toBe(true);
      expect(getRes.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: commentId,
            request_id: testRequestId,
            comment: testCommentData.valid.comment,
          }),
        ])
      );
    });
  });

  describe('NEGATIVE TESTS', () => {
    it('should return 200 for non-existent request when getting comments', async () => {
      const res = await request(app).get('/requests/-1/comments');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return 400 or 500 for invalid comment payload', async () => {
      const res = await request(app)
        .post(`/requests/${testRequestId}/comments`)
        .send({ bad_field: 'oops' })
        .set('Content-Type', 'application/json');

      expect([400, 500]).toContain(res.status); // Adjust to match actual error handling
    });
  });
});
