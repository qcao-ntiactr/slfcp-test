import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

import { app } from './setup.ts';

const testContext = new Map();
const prisma = new PrismaClient();

describe('Inquiry API Integration Tests', () => {
  beforeEach(async () => {
    // Find an existing request to use for testing
    const existingRequest = await prisma.request.findFirst({
      orderBy: { id: 'desc' },
    });

    if (!existingRequest) {
      throw new Error(
        'No requests found in database. Please run seeding first.'
      );
    }

    // Create a new request for testing inquiries to avoid conflicts
    const testUser = await prisma.user.findFirst({
      where: {
        entity: {
          type: 'COMMERCIAL',
        },
      },
    });

    if (!testUser) {
      throw new Error(
        'No COMMERCIAL users found in database. Please run seeding first.'
      );
    }

    const newRequest = await prisma.request.create({
      data: {
        user_id: testUser.id,
        mission_name: 'Test Mission Name for Inquiries',
        name_of_licensee: 'Test Licensee for Inquiries',
        fcc_filing_date: new Date('2030-06-14T17:16:34.913Z'),
        call_sign: 'TEST-INQ',
        name_of_launch_vehicle: 'Test Launch Vehicle',
        city: 'Test City',
        state: 'VA',
        latitude: -35.6747,
        longitude: 82.9936,
        launch_datetime_primary: new Date('2030-06-14T17:16:34.913Z'),
        launch_datetime_backup: new Date('2030-08-16T18:17:20.739Z'),
        orbital_location: 'South',
        ground_track_from_liftoff_until_payload_separation: 'Test ground track',
        ecf_cartesian_vectors_format_file_desc: 'Test ECF file desc',
        ecf_cartesian_vectors_format_file_path: 'test-ecf-file.txt',
        ground_track_of_launch_vehicle_2d_img_file_desc:
          'Test ground track file desc',
        ground_track_of_launch_vehicle_2d_img_file_path:
          'test-ground-track.png',
        primary_poc_name: 'Test POC',
        primary_poc_email: 'test@example.com',
        primary_poc_phone: '703-333-3333',
        alternate_poc_name: 'Test Alt POC',
        alternate_poc_email: 'testalt@example.com',
        alternate_poc_phone: '703-444-4444',
        number_of_frequencies: 1,
        status: 'SUBMITTED',
        read: false,
      },
    });

    testContext.set('testRequestId', newRequest.id);
    testContext.set('existingRequestId', existingRequest.id);
    testContext.set('userEmail', 'ntiadev@company.com');
    testContext.set('userEmailSender', 'commercialdev@company.com');

    const [userA, userB, entityNTIA, entityCOMM] = await Promise.all([
      prisma.user.findUnique({ where: { email: 'ntiadev@company.com' } }),
      prisma.user.findUnique({ where: { email: 'commercialdev@company.com' } }),
      prisma.entity.findFirst({ where: { abbreviation: 'NTIA' } }),
      prisma.entity.findFirst({ where: { abbreviation: 'COMM' } }),
    ]);

    testContext.set('entityAId', entityNTIA?.id);
    testContext.set('entityBId', entityCOMM?.id);
    testContext.set('senderId', userA?.id);
    testContext.set('userEmailSenderId', userB?.id);
  });

  afterEach(async () => {
    // Clean up the test request and any related data
    const testRequestId = testContext.get('testRequestId');
    if (testRequestId) {
      // Delete messages first, then inquiries, then request (due to foreign key constraints)
      const inquiries = await prisma.inquiry.findMany({
        where: { request_id: testRequestId },
      });

      for (const inquiry of inquiries) {
        await prisma.message.deleteMany({
          where: { inquiry_id: inquiry.id },
        });
      }

      await prisma.inquiry.deleteMany({
        where: { request_id: testRequestId },
      });

      // Delete the test request
      await prisma.request
        .delete({
          where: { id: testRequestId },
        })
        .catch(() => {
          // Ignore errors if request was already deleted
        });
    }
  });

  describe('Positive tests Inquiries API', () => {
    it('should create a new inquiry', async () => {
      const testRequestId = testContext.get('testRequestId');
      const entityAId = testContext.get('entityAId');
      const entityBId = testContext.get('entityBId');
      const userEmail = testContext.get('userEmail');
      const userEmailSenderId = testContext.get('userEmailSenderId');
      const request_id = testRequestId;
      const res = await request(app)
        .post(`/requests/${request_id}/inquiries`)
        .set('x-user-email', userEmail)
        .send({
          request_id: request_id,
          entityA_id: entityAId,
          entityB_id: entityBId,
          messages: [
            {
              sender_id: userEmailSenderId,
              content: 'Please review the revised request by EOD.',
              sentAt: '2025-06-01T09:00:00Z',
            },
          ],
        });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.request_id).toBe(request_id);
    });

    it('should get an inquiry by id', async () => {
      // First create an inquiry to test with
      const testRequestId = testContext.get('testRequestId');
      const entityAId = testContext.get('entityAId');
      const entityBId = testContext.get('entityBId');
      const userEmail = testContext.get('userEmail');
      const userEmailSenderId = testContext.get('userEmailSenderId');
      const request_id = testRequestId;

      // Create an inquiry first
      const createRes = await request(app)
        .post(`/requests/${request_id}/inquiries`)
        .set('x-user-email', userEmail)
        .send({
          request_id: request_id,
          entityA_id: entityAId,
          entityB_id: entityBId,
          messages: [
            {
              sender_id: userEmailSenderId,
              content: 'Test inquiry for get by id.',
              sentAt: '2025-06-01T09:00:00Z',
            },
          ],
        });

      expect(createRes.statusCode).toBe(201);
      const inquiryId = createRes.body.id;

      // Now test getting the inquiry by id
      const getRes = await request(app)
        .get(`/requests/${request_id}/inquiries/${inquiryId}`)
        .set('x-user-email', userEmail)
        .expect(200);

      expect(getRes.body).toHaveProperty('id', inquiryId);
      expect(getRes.body.request_id).toBe(request_id);
      expect(getRes.body.id).toBe(inquiryId);
    });
    it('should update an inquiry', async () => {
      // First, create an inquiry to update
      const testRequestId = testContext.get('testRequestId');
      const entityAId = testContext.get('entityAId');
      const entityBId = testContext.get('entityBId');
      const senderId = testContext.get('senderId');
      const userEmail = testContext.get('userEmail');
      const requestId = testRequestId;
      const res = await request(app)
        .post(`/requests/${requestId}/inquiries`)
        .set('x-user-email', userEmail)
        .send({
          request_id: requestId,
          entityA_id: entityAId,
          entityB_id: entityBId,
          messages: [
            {
              sender_id: senderId,
              content: 'Please review the revised request by EOD.',
              sentAt: '2025-06-01T09:00:00Z',
            },
          ],
        });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.request_id).toBe(requestId);
      const inquiryId = res.body.id;
      // Now, update the inquiry
      const updateRes = await request(app)
        .put(`/requests/${requestId}/inquiries/${inquiryId}`)
        .set('x-user-email', userEmail)
        .send({
          closed: true,
          closedAt: '2025-06-01T09:00:00Z',
        })
        .expect(200);

      expect(updateRes.body).toHaveProperty('id', inquiryId);
      expect(updateRes.body.closed).toBe(true);
    });

    it('should add a message to existing inquiry', async () => {
      // First, create an inquiry
      const testRequestId = testContext.get('testRequestId');
      const entityAId = testContext.get('entityAId');
      const entityBId = testContext.get('entityBId');
      const senderId = testContext.get('senderId');
      const userEmail = testContext.get('userEmail');
      const userEmailSender = testContext.get('userEmailSender');
      const userEmailSenderId = testContext.get('userEmailSenderId');
      const requestId = testRequestId;
      const inquiryRes = await request(app)
        .post(`/requests/${requestId}/inquiries`)
        .set('x-user-email', userEmail)
        .send({
          request_id: requestId,
          entityA_id: entityAId,
          entityB_id: entityBId,
          messages: [
            {
              sender_id: senderId,
              content: 'Initial message.',
              sentAt: '2025-06-03T08:00:00Z',
            },
          ],
        });

      expect(inquiryRes.statusCode).toBe(201);

      const inquiryId = inquiryRes.body.id;
      const newMessage = {
        sender_id: userEmailSenderId,
        content: 'Reply to initial message.',
        sentAt: '2025-06-03T09:00:00Z',
      };

      const addMsgRes = await request(app)
        .post(`/requests/${requestId}/inquiries/${inquiryId}/messages`)
        .set('x-user-email', userEmailSender)
        .send(newMessage);

      expect(addMsgRes.statusCode).toBe(201);
      expect(addMsgRes.body).toHaveProperty('id');
      expect(addMsgRes.body.sender_id).toBe(newMessage.sender_id);

      // Fetch the inquiry and verify the message was added
      const getRes = await request(app).get(
        `/requests/${requestId}/inquiries/${inquiryId}`
      );

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body.messages).toBeDefined();
    });
  });
});
