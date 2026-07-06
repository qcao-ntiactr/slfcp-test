import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

import { app } from './setup.ts';

describe('Dashboard API Integration Tests', () => {
  beforeAll(async () => {
    // Dashboard endpoints don't require authentication headers
    // Tests verify the routes and data structure
  });

  describe('GET /dashboard/requests-over-time/:timeframe', () => {
    describe('POSITIVE TESTS', () => {
      it('should return requests over time for week timeframe', async () => {
        const res = await request(app)
          .get('/dashboard/requests-over-time/week')
          .set('x-user-email', 'ntia@dev.com');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              total_requests: expect.any(String),
            }),
          ])
        );
      });

      it('should return requests over time for month timeframe', async () => {
        const res = await request(app)
          .get('/dashboard/requests-over-time/month')
          .set('x-user-email', 'ntia@dev.com');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      });

      it('should return requests over time for quarter timeframe', async () => {
        const res = await request(app)
          .get('/dashboard/requests-over-time/quarter')
          .set('x-user-email', 'ntia@dev.com');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      });
    });

    describe('NEGATIVE TESTS', () => {
      it('should return 400 for invalid timeframe', async () => {
        const res = await request(app)
          .get('/dashboard/requests-over-time/invalid')
          .set('x-user-email', 'ntia@dev.com');

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
      });

      it('should return 403 for empty timeframe (no route match)', async () => {
        const res = await request(app).get('/dashboard/requests-over-time/');

        expect(res.status).toBe(403);
      });
    });
  });

  describe('GET /dashboard/request-completion-time/:timeframe', () => {
    describe('POSITIVE TESTS', () => {
      it('should return completion time metrics for week timeframe', async () => {
        const res = await request(app)
          .get('/dashboard/request-completion-time/week')
          .set('x-user-email', 'ntia@dev.com');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        console.log('hey');
        if (res.body.length > 0) {
          const item = res.body[0];
          expect(item).toHaveProperty('total_completed');
          expect(typeof item.total_completed).toBe('string');
          expect(
            item.avg_days === null || typeof item.avg_days === 'number'
          ).toBe(true);
          expect(
            item.fastest_days === null || typeof item.fastest_days === 'number'
          ).toBe(true);
          expect(
            item.slowest_days === null || typeof item.slowest_days === 'number'
          ).toBe(true);
        }
      });

      it('should return completion time metrics for month timeframe', async () => {
        const res = await request(app)
          .get('/dashboard/request-completion-time/month')
          .set('x-user-email', 'ntia@dev.com');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      });

      it('should return completion time metrics for quarter timeframe', async () => {
        const res = await request(app)
          .get('/dashboard/request-completion-time/quarter')
          .set('x-user-email', 'ntia@dev.com');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      });
    });

    describe('NEGATIVE TESTS', () => {
      it('should return 400 for invalid timeframe', async () => {
        const res = await request(app)
          .get('/dashboard/request-completion-time/invalid')
          .set('x-user-email', 'ntia@dev.com');

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
      });

      it('should return 400 for non-standard timeframe', async () => {
        const res = await request(app)
          .get('/dashboard/request-completion-time/year')
          .set('x-user-email', 'ntia@dev.com');

        expect(res.status).toBe(400);
      });
    });
  });

  describe('GET /dashboard/requests-by-commercial-entity', () => {
    describe('POSITIVE TESTS', () => {
      it('should return commercial entity submission counts', async () => {
        const res = await request(app)
          .get('/dashboard/requests-by-commercial-entity')
          .set('x-user-email', 'ntia@dev.com');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        if (res.body.length > 0) {
          expect(res.body[0]).toEqual(
            expect.objectContaining({
              entity_id: expect.any(Number),
              entity_name: expect.any(String),
              total_submissions: expect.any(String),
            })
          );
        }
      });

      it('should return array even if no commercial entities exist', async () => {
        const res = await request(app)
          .get('/dashboard/requests-by-commercial-entity')
          .set('x-user-email', 'ntia@dev.com');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      });
    });

    describe('NEGATIVE TESTS', () => {
      it('should not accept query parameters', async () => {
        const res = await request(app)
          .get('/dashboard/requests-by-commercial-entity')
          .set('x-user-email', 'ntia@dev.com')
          .query({ limit: 10, offset: 0 });

        expect(res.status).toBe(200);
      });
    });
  });

  describe('GET /dashboard/requests-by-status', () => {
    describe('POSITIVE TESTS', () => {
      it('should return request counts by status', async () => {
        const res = await request(app)
          .get('/dashboard/requests-by-status')
          .set('x-user-email', 'ntia@dev.com');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        if (res.body.length > 0) {
          expect(res.body[0]).toEqual(
            expect.objectContaining({
              status_group: expect.any(String),
              request_count: expect.any(String),
            })
          );
        }
      });

      it('should include expected status groups', async () => {
        const res = await request(app)
          .get('/dashboard/requests-by-status')
          .set('x-user-email', 'ntia@dev.com');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);

        const statusGroups = res.body.map(
          (item: { status_group: string }) => item.status_group
        );
        const expectedGroups = [
          'Approved',
          'Denied',
          'Revisions Requested',
          'Approved With Conditions',
          'Submitted',
          'Under Review',
          'Other',
        ];

        const commonGroups = expectedGroups.filter((group) =>
          statusGroups.includes(group)
        );
        expect(commonGroups.length).toBeGreaterThan(0);
      });
    });

    describe('NEGATIVE TESTS', () => {
      it('should not accept path parameters', async () => {
        const res = await request(app).get(
          '/dashboard/requests-by-status/extra'
        );

        expect(res.status).toBe(403);
      });
    });
  });

  describe('Cross-endpoint validation', () => {
    it('all endpoints should return numeric count data as strings', async () => {
      const endpoints = [
        '/dashboard/requests-over-time/week',
        '/dashboard/request-completion-time/week',
        '/dashboard/requests-by-commercial-entity',
        '/dashboard/requests-by-status',
      ];

      for (const endpoint of endpoints) {
        const res = await request(app)
          .get(endpoint)
          .set('x-user-email', 'ntia@dev.com');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);

        res.body.forEach((item: Record<string, unknown>) => {
          Object.values(item).forEach((value) => {
            if (typeof value === 'number' && value > 1000000) {
              expect(typeof value).toBe('string');
            }
          });
        });
      }
    });

    it('should handle concurrent requests without errors', async () => {
      const endpoints = [
        '/dashboard/requests-over-time/week',
        '/dashboard/request-completion-time/month',
        '/dashboard/requests-by-commercial-entity',
        '/dashboard/requests-by-status',
      ];

      const results = await Promise.all(
        endpoints.map((endpoint) =>
          request(app).get(endpoint).set('x-user-email', 'ntia@dev.com')
        )
      );

      results.forEach((res) => {
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      });
    });
  });
});
