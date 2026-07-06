import { describe, it, afterEach, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { BlobServiceClient } from '@azure/storage-blob';
import { PrismaClient } from '@prisma/client';

import { app } from './setup.ts';

const prisma = new PrismaClient();

// Type for request items in API responses
interface RequestItem {
  id: number;
  mission_name: string;
  name_of_licensee: string;
  call_sign: string;
  status: string;
  frequencies: unknown[];
  unreadMessageCount?: number;
  [key: string]: unknown;
}
let testUserId: string;

describe('Requests API Integration Tests', () => {
  beforeAll(async () => {
    // Dynamically select a COMMERCIAL user from the database
    const validUser = await prisma.user.findFirst({
      where: {
        entity: {
          type: 'COMMERCIAL',
        },
      },
    });

    if (!validUser) {
      throw new Error(
        'No COMMERCIAL users found in database. Please run seeding first.'
      );
    }

    testUserId = validUser.external_id;

    // Dynamically select an NTIA user for approvals/denials
    const ntiaUser = await prisma.user.findFirst({
      where: {
        entity: {
          type: 'NTIA',
        },
      },
    });

    if (!ntiaUser) {
      throw new Error(
        'No NTIA users found in database. Please run seeding first.'
      );
    }
  });

  afterEach(async (context) => {
    const connectionString =
      process.env.AZURE_BLOB_STORAGE_CONNECTION_STRING || '';
    const containerName = process.env.CONTAINER_NAME || 'slfcp-uploads';

    // Create Azure Blob Service Client
    const blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const storedFileNames = testContext.get(context.task.name);
    if (storedFileNames) {
      const {
        ecf_cartesian_vectors_format_file_path,
        ground_track_of_launch_vehicle_2d_img_file_path,
      } = storedFileNames;
      const blobClient = containerClient.getBlobClient(
        ecf_cartesian_vectors_format_file_path
      );
      // Delete the test blob after each test
      await blobClient.deleteIfExists();
      const blobClient1 = containerClient.getBlobClient(
        ground_track_of_launch_vehicle_2d_img_file_path
      );
      await blobClient1.deleteIfExists();
    }
  });

  const testContext = new Map();

  const testRequestData = {
    valid1: {
      get user_id() {
        return testUserId;
      },
      mission_name: 'Mission Name Test',
      name_of_licensee: 'Test Licensee',
      fcc_filing_date: '2030-06-14T17:16:34.913Z',
      call_sign: 'TEST-CS',
      name_of_launch_vehicle: 'name_of_launch_vehicle test',
      city: 'city test',
      state: 'VA',
      latitude: '-35.6747',
      longitude: '82.9936',
      launch_datetime_primary: '2030-06-14T17:16:34.913Z',
      launch_datetime_backup: '2030-08-16T18:17:20.739Z',
      orbital_location: 'South',
      ground_track_from_liftoff_until_payload_separation:
        'ground_track_from_liftoff_until_payload_separation - test',
      ecf_cartesian_vectors_format_file_desc:
        'ecf_cartesian_vectors_format_file_desc - test',
      ground_track_of_launch_vehicle_2d_img_file_desc:
        'ground_track_of_launch_vehicle_2d_img_file_desc - test',
      primary_poc_name: 'Roxanne Champlin',
      primary_poc_email: 'Haylee_Welch64@hotmail.com',
      primary_poc_phone: '703-333-3333',
      alternate_poc_name: 'Morris Smitham I',
      alternate_poc_email: 'Rodolfo70@hotmail.com',
      alternate_poc_phone: '703-444-4444',
      number_of_frequencies: '1',
      status: 'SUBMITTED',
      read: 'false',
      frequencies: JSON.stringify([
        {
          frequency: 2378.552,
          location_of_transmitter_on_vehicle_or_platform: 'first_stage',
          eirp: 452.85,
          eirp_unit: 'dBW',
          transmitted_bandwidth: 26.63,
          transmitted_bandwidth_is_signal_filtered: 'not_filtered',
          transmitted_bandwidth_justification:
            '00Atque vaco eligendi esse conduco.',
          minus_3db_bandwidth: 83.7,
          minus_3db_bandwidth_before_or_after_filtering: 'before_filtering',
          minus_20db_bandwidth: 91.83,
          minus_20db_bandwidth_before_or_after_filtering: 'after_filtering',
          minus_60db_bandwidth: 14.15,
          minus_60db_bandwidth_before_or_after_filtering: 'before_filtering',
          nature_of_modulating_signals: 'sono',
          emission_designator: 'FCC',
          tx_antenna_type: 'Fantastic Rubber Bacon',
          tx_antenna_gain: 55,
          tx_antenna_beamwidth: 37,
          tx_antenna_altitude: 50,
          tx_antenna_altitude_unit: 'm',
          tx_transmission_start: '2030-06-14T17:16:34.913Z',
          tx_transmission_end: '2030-06-14T17:16:34.913Z',
          receivers: [
            {
              transmission_start: '2030-06-14T17:16:34.913Z',
              transmission_end: '2030-06-14T17:16:34.913Z',
              antenna_type: 'Intelligent Steel Gloves',
              antenna_gain: 53,
              antenna_beamwidth: 129,
              antenna_altitude: 50,
              antenna_altitude_unit: 'm',
              location_of_receiving_ground_station: 'first_stage',
              longitude_of_receiving_antenna: 17.6706,
              latitude_of_receiving_antenna: 57.8469,
            },
          ],
        },
      ]),
    },
    valid2: {
      get user_id() {
        return testUserId;
      },
      mission_name: 'Mission Name Test',
      name_of_licensee: 'Test Licensee',
      fcc_filing_date: '2030-06-14T17:16:34.913Z',
      call_sign: 'TEST-CS',
      name_of_launch_vehicle: 'name_of_launch_vehicle test',
      city: 'city test',
      state: 'VA',
      latitude: '-35.6747',
      longitude: '82.9936',
      launch_datetime_primary: '2030-06-14T17:16:34.913Z',
      launch_datetime_backup: '2030-08-16T18:17:20.739Z',
      orbital_location: 'South',
      ground_track_from_liftoff_until_payload_separation:
        'ground_track_from_liftoff_until_payload_separation - test',
      ecf_cartesian_vectors_format_file_desc:
        'ecf_cartesian_vectors_format_file_desc - test',
      ground_track_of_launch_vehicle_2d_img_file_desc:
        'ground_track_of_launch_vehicle_2d_img_file_desc - test',
      primary_poc_name: 'Roxanne Champlin',
      primary_poc_email: 'Haylee_Welch64@hotmail.com',
      primary_poc_phone: '703-333-3333',
      alternate_poc_name: 'Morris Smitham I',
      alternate_poc_email: 'Rodolfo70@hotmail.com',
      alternate_poc_phone: '703-444-4444',
      number_of_frequencies: '2',
      status: 'SUBMITTED',
      read: 'false',
      frequencies: JSON.stringify([
        {
          frequency: 2075.552,
          location_of_transmitter_on_vehicle_or_platform: 'first_stage',
          eirp: 452.85,
          eirp_unit: 'dBW',
          transmitted_bandwidth: 46.63,
          transmitted_bandwidth_is_signal_filtered: 'not_filtered',
          transmitted_bandwidth_justification:
            '00Atque vaco eligendi esse conduco.',
          minus_3db_bandwidth: 83.7,
          minus_3db_bandwidth_before_or_after_filtering: 'before_filtering',
          minus_20db_bandwidth: 91.83,
          minus_20db_bandwidth_before_or_after_filtering: 'after_filtering',
          minus_60db_bandwidth: 14.15,
          minus_60db_bandwidth_before_or_after_filtering: 'before_filtering',
          nature_of_modulating_signals: 'sono',
          emission_designator: 'FCC',
          tx_antenna_type: 'Fantastic Rubber Bacon',
          tx_antenna_gain: 55,
          tx_antenna_beamwidth: 37,
          tx_antenna_altitude: 50,
          tx_antenna_altitude_unit: 'm',
          tx_transmission_start: '2030-06-14T17:16:34.913Z',
          tx_transmission_end: '2030-06-14T17:16:34.913Z',
          receivers: [
            {
              transmission_start: '2030-06-14T17:16:34.913Z',
              transmission_end: '2030-06-14T17:16:34.913Z',
              antenna_type: 'Intelligent Steel Gloves',
              antenna_gain: 53,
              antenna_beamwidth: 129,
              antenna_altitude: 50,
              antenna_altitude_unit: 'm',
              location_of_receiving_ground_station: 'second_stage',
              longitude_of_receiving_antenna: 17.6706,
              latitude_of_receiving_antenna: 57.8469,
            },
          ],
        },
        {
          frequency: 2245.552,
          location_of_transmitter_on_vehicle_or_platform: 'first_stage',
          eirp: 452.85,
          eirp_unit: 'dBW',
          transmitted_bandwidth: 46.63,
          transmitted_bandwidth_is_signal_filtered: 'not_filtered',
          transmitted_bandwidth_justification:
            '00Atque vaco eligendi esse conduco.',
          minus_3db_bandwidth: 83.7,
          minus_3db_bandwidth_before_or_after_filtering: 'before_filtering',
          minus_20db_bandwidth: 91.83,
          minus_20db_bandwidth_before_or_after_filtering: 'after_filtering',
          minus_60db_bandwidth: 14.15,
          minus_60db_bandwidth_before_or_after_filtering: 'before_filtering',
          nature_of_modulating_signals: 'sono',
          emission_designator: 'FCC',
          tx_antenna_type: 'Fantastic Rubber Bacon',
          tx_antenna_gain: 55,
          tx_antenna_beamwidth: 37,
          tx_antenna_altitude: 50,
          tx_antenna_altitude_unit: 'm',
          tx_transmission_start: '2030-06-14T17:16:34.913Z',
          tx_transmission_end: '2030-06-14T17:16:34.913Z',
          receivers: [
            {
              transmission_start: '2030-06-14T17:16:34.913Z',
              transmission_end: '2030-06-14T17:16:34.913Z',
              antenna_type: 'Intelligent Steel Gloves',
              antenna_gain: 53,
              antenna_beamwidth: 129,
              antenna_altitude: 50,
              antenna_altitude_unit: 'm',
              location_of_receiving_ground_station: 'ground',
              longitude_of_receiving_antenna: 17.6706,
              latitude_of_receiving_antenna: 57.8469,
            },
          ],
        },
      ]),
    },
  };

  const addFormFields = (req: request.Test, data: Record<string, string>) => {
    Object.entries(data).forEach(([key, value]) => {
      req = req.field(key, value);
    });
    return req;
  };
  const addFiles = (req: request.Test) => {
    req = req
      .attach(
        'ecf_cartesian_vectors_format_file',
        Buffer.from('Sample XLS File Content'),
        'test-file.xls'
      )
      .attach(
        'ground_track_of_launch_vehicle_2d_img_file',
        Buffer.from('Sample IMAGE File Content'),
        'test-file.jpg'
      );
    return req;
  };

  describe('create new request', () => {
    describe('POSITIVE TESTS', () => {
      it('should create a new request with valid data and one frequency', async (context) => {
        let req = request(app).post('/requests');
        req = req.set('x-user-id', testUserId);
        req = addFormFields(req, testRequestData.valid1);
        req = addFiles(req);
        const res = await req;
        // Store file names in context for cleanup
        const ecf_cartesian_vectors_format_file_path =
          res.body.request.ecf_cartesian_vectors_format_file_path;
        const ground_track_of_launch_vehicle_2d_img_file_path =
          res.body.request.ground_track_of_launch_vehicle_2d_img_file_path;
        testContext.set(context.task.name, {
          ecf_cartesian_vectors_format_file_path,
          ground_track_of_launch_vehicle_2d_img_file_path,
        });

        expect(res.status).toBe(201);
        expect(res.body.request).toHaveProperty('id');
        expect(res.body.request.name_of_licensee).toBe('Test Licensee');
      });
      it('should create a new request with valid data and multiple frequencies', async (context) => {
        let req = request(app).post('/requests');
        req = req.set('x-user-id', testUserId);
        req = addFormFields(req, testRequestData.valid2);
        req = addFiles(req);
        const res = await req;
        // Store file names in context for cleanup
        const ecf_cartesian_vectors_format_file_path =
          res.body.request.ecf_cartesian_vectors_format_file_path;
        const ground_track_of_launch_vehicle_2d_img_file_path =
          res.body.request.ground_track_of_launch_vehicle_2d_img_file_path;
        testContext.set(context.task.name, {
          ecf_cartesian_vectors_format_file_path,
          ground_track_of_launch_vehicle_2d_img_file_path,
        });

        expect(res.status).toBe(201);
      });
    });
    describe('NEGATIVE TESTS', () => {
      it('should return 400 and error on not matching [number_of_frequencies] value and number of frequencies', async () => {
        const testRequestData1 = { ...testRequestData.valid1 };
        testRequestData1.number_of_frequencies = '2';
        let req = request(app).post('/requests');
        req = addFormFields(req, testRequestData1);
        req = addFiles(req);
        const res = await req;
        expect(res.status).toBe(400);
        expect(res.body.error['issues'][0].message).toContain(
          'Only 1 out of 2 frequencies entered'
        );
      });
      it('should return 400 and error on invalid frequency', async () => {
        const testRequestData1 = { ...testRequestData.valid1 };
        const frequencies = JSON.parse(testRequestData1.frequencies);
        frequencies[0].frequency = '2368.552';
        testRequestData1.frequencies = JSON.stringify(frequencies);
        let req = request(app).post('/requests');
        req = addFormFields(req, testRequestData1);
        req = addFiles(req);
        const res = await req;
        expect(res.status).toBe(400);
        expect(res.body.error['issues'][0].message).toContain(
          'falls outside the allowed bands'
        );
      });
      it('should return 400 and error on invalid file extension', async () => {
        const testRequestData1 = { ...testRequestData.valid1 };
        let req = request(app).post('/requests');
        req = addFormFields(req, testRequestData1);
        req = req
          .attach(
            'ecf_cartesian_vectors_format_file',
            Buffer.from('Sample TEXT File Content'),
            'test-file.txt'
          )
          .attach(
            'ground_track_of_launch_vehicle_2d_img_file',
            Buffer.from('Sample IMAGE File Content'),
            'test-file.jpg'
          );
        const res = await req;
        expect(res.status).toBe(400);
        expect(res.body.error['issues'][0].message).toContain('File must be ');
      });
      it('should return 400 and error on invalid phone or email format', async () => {
        const testRequestData1 = { ...testRequestData.valid1 };
        testRequestData1.primary_poc_phone = '703-333 3333';
        testRequestData1.alternate_poc_email = 'Rodolfo70 hotmail.com';
        let req = request(app).post('/requests');
        req = addFormFields(req, testRequestData1);
        req = addFiles(req);
        const res = await req;

        expect(res.status).toBe(400);
        expect(res.body.error['issues'][0].message).toContain(
          'Must be a valid US phone number'
        );
        expect(res.body.error['issues'][1].message).toContain(
          'Must be a valid email address'
        );
      });
      it('should return 400 and error on invalid string lengths', async () => {
        const testRequestData1 = { ...testRequestData.valid1 };
        testRequestData1.call_sign = 'abcdefghi';
        const frequencies = JSON.parse(testRequestData1.frequencies);
        frequencies[0].nature_of_modulating_signals = 'abcdefghijklmno';
        testRequestData1.frequencies = JSON.stringify(frequencies);
        let req = request(app).post('/requests');
        req = addFormFields(req, testRequestData1);
        req = addFiles(req);
        const res = await req;
        expect(res.status).toBe(400);
        expect(res.body.error['issues'][0].message).toContain(
          'characters or fewer'
        );
        expect(res.body.error['issues'][1].message).toContain(
          'characters or fewer'
        );
      });
      it('should return 400 and error on invalid numbers', async () => {
        const testRequestData1 = { ...testRequestData.valid1 };
        testRequestData1.latitude = '-200';
        const frequencies = JSON.parse(testRequestData1.frequencies);
        frequencies[0].receivers[0].latitude_of_receiving_antenna = 200;
        testRequestData1.frequencies = JSON.stringify(frequencies);
        let req = request(app).post('/requests');
        req = addFormFields(req, testRequestData1);
        req = addFiles(req);
        const res = await req;
        expect(res.status).toBe(400);
        expect(res.body.error['issues'][0].message).toContain(
          'Must be at least'
        );
        expect(res.body.error['issues'][1].message).toContain(
          'Must be at most'
        );
      });
      it('should return 400 and error on invalid BW filtering selections', async () => {
        const testRequestData1 = { ...testRequestData.valid1 };
        testRequestData1.state = 'XX';
        const frequencies = JSON.parse(testRequestData1.frequencies);
        frequencies[0].minus_3db_bandwidth_before_or_after_filtering =
          'before_filtering1';
        frequencies[0].minus_20db_bandwidth_before_or_after_filtering =
          'after_filtering1';
        testRequestData1.frequencies = JSON.stringify(frequencies);
        let req = request(app).post('/requests');
        req = addFormFields(req, testRequestData1);
        req = addFiles(req);
        const res = await req;
        expect(res.status).toBe(400);
        expect(res.body.error['issues'][0].message).toContain(
          'Invalid enum value. '
        );
        expect(res.body.error['issues'][1].message).toContain(
          'Invalid enum value. '
        );
        expect(res.body.error['issues'][2].message).toContain(
          'Invalid enum value. '
        );
      });
    });
  });

  describe('GET /requests', () => {
    describe('Unread Message Count Functionality', () => {
      it('should return requests with proper structure when user_id is provided', async () => {
        const res = await request(app)
          .get('/requests')
          .query({ user_id: testUserId });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('totalCount');
        expect(Array.isArray(res.body.data)).toBe(true);

        // Verify response structure
        res.body.data.forEach((requestItem: RequestItem) => {
          expect(requestItem).toHaveProperty('id');
          expect(requestItem).toHaveProperty('name_of_licensee');
          expect(requestItem).toHaveProperty('call_sign');
          expect(requestItem).toHaveProperty('status');
          expect(requestItem).toHaveProperty('frequencies');
          expect(Array.isArray(requestItem.frequencies)).toBe(true);

          // unreadMessageCount should only be present if > 0 (zero counts omitted)
          if ('unreadMessageCount' in requestItem) {
            expect(typeof requestItem.unreadMessageCount).toBe('number');
            expect(requestItem.unreadMessageCount).toBeGreaterThan(0);
          }
        });
      });

      it('should handle invalid user_id gracefully', async () => {
        const res = await request(app)
          .get('/requests')
          .set('x-user-id', 'invalid-user-id');

        expect(res.status).toBe(401);
      });

      it('should support pagination parameters', async () => {
        const res = await request(app).get('/requests').query({
          user_id: testUserId,
          page: 1,
          pageSize: 5,
        });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('totalCount');
        expect(res.body.data.length).toBeLessThanOrEqual(5);
      });

      it('should support status filtering', async () => {
        const res = await request(app)
          .get('/requests')
          .query({
            user_id: testUserId,
            statuses: ['SUBMITTED', 'UNDER_NTIA_INITIAL_REVIEW'],
          });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');

        // Verify all returned requests have the specified statuses
        res.body.data.forEach((requestItem: RequestItem) => {
          expect(['SUBMITTED', 'UNDER_NTIA_INITIAL_REVIEW']).toContain(
            requestItem.status
          );
        });
      });
    });
  });
});
