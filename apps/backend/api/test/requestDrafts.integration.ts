import { describe, it, afterEach, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { BlobServiceClient } from '@azure/storage-blob';
import { PrismaClient } from '@prisma/client';

import { app } from './setup.ts';

const prisma = new PrismaClient();
let testUserId: string;
let ntiaUserId: string;
const testContext = new Map();

const baseDraftData = {
  get user_id() {
    return testUserId;
  },
  mission_name: 'Test Mission Name',
  name_of_licensee: 'Draft Test',
  call_sign: 'DRAFT-CS',
  name_of_launch_vehicle: 'Draft Launcher',
  city: 'Draft City',
  state: 'DC',
  latitude: '-30.0',
  longitude: '85.0',
  launch_datetime_primary: new Date().toISOString(),
  launch_datetime_backup: new Date().toISOString(),
  orbital_location: 'Test Orbit',
  ground_track_from_liftoff_until_payload_separation: 'Test track',
  ecf_cartesian_vectors_format_file_desc: 'ECF File Description',
  ground_track_of_launch_vehicle_2d_img_file_desc: 'GT File Description',
  primary_poc_name: 'Primary Contact',
  primary_poc_email: 'primary@example.com',
  primary_poc_phone: '703-555-1212',
  alternate_poc_name: 'Alt Contact',
  alternate_poc_email: 'alt@example.com',
  alternate_poc_phone: '703-555-3434',
  number_of_frequencies: '1',
  frequencies: JSON.stringify([
    {
      frequency: 2400.5,
      location_of_transmitter_on_vehicle_or_platform: 'first_stage',
      eirp: 50,
      eirp_unit: 'dBW',
      transmitted_bandwidth: 20,
      transmitted_bandwidth_is_signal_filtered: 'filtered',
      transmitted_bandwidth_justification: 'testing',
      minus_3db_bandwidth: 10,
      minus_3db_bandwidth_before_or_after_filtering: 'before_filtering',
      minus_20db_bandwidth: 15,
      minus_20db_bandwidth_before_or_after_filtering: 'after_filtering',
      minus_60db_bandwidth: 25,
      minus_60db_bandwidth_before_or_after_filtering: 'before_filtering',
      nature_of_modulating_signals: 'Test Signal',
      emission_designator: 'E',
      tx_antenna_type: 'Type A',
      tx_antenna_gain: 10,
      tx_antenna_beamwidth: 120,
      tx_antenna_altitude: 300,
      tx_antenna_altitude_unit: 'm',
      tx_transmission_start: new Date().toISOString(),
      tx_transmission_end: new Date().toISOString(),
      receivers: [
        {
          transmission_start: new Date().toISOString(),
          transmission_end: new Date().toISOString(),
          antenna_type: 'Type B',
          antenna_gain: 8,
          antenna_beamwidth: 90,
          antenna_altitude: 200,
          antenna_altitude_unit: 'm',
          location_of_receiving_ground_station: 'ground',
          longitude_of_receiving_antenna: 75.0,
          latitude_of_receiving_antenna: 25.0,
        },
      ],
    },
  ]),
};

const addFormFields = (req: request.Test, data: Record<string, string>) => {
  Object.entries(data).forEach(([key, value]) => {
    req = req.field(key, value);
  });
  return req;
};

const addFiles = (req: request.Test) => {
  return req
    .attach(
      'ecf_cartesian_vectors_format_file',
      Buffer.from('dummy data'),
      'test.xls'
    )
    .attach(
      'ground_track_of_launch_vehicle_2d_img_file',
      Buffer.from('dummy image'),
      'image.jpg'
    );
};

afterEach(async (context) => {
  const connectionString =
    process.env.AZURE_BLOB_STORAGE_CONNECTION_STRING || '';
  const containerName = process.env.CONTAINER_NAME || 'slfcp-uploads';
  const blobServiceClient =
    BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobServiceClient.getContainerClient(containerName);

  const stored = testContext.get(context.task.name);
  if (stored) {
    if (stored.ecf_path)
      await containerClient.getBlobClient(stored.ecf_path).deleteIfExists();
    if (stored.gt_path)
      await containerClient.getBlobClient(stored.gt_path).deleteIfExists();
  }
});

describe('Request Drafts API Integration Tests', () => {
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

    // Get an NTIA user for testing access restrictions
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

    ntiaUserId = ntiaUser.external_id;
  });

  it('should create, update, and delete a request draft', async (context) => {
    let req = request(app).post('/request-drafts');
    req = req.set('x-user-id', testUserId);
    req = addFormFields(req, baseDraftData);
    req = addFiles(req);
    const createRes = await req;

    expect(createRes.status).toBe(201);
    const draftId = createRes.body.id || createRes.body.request?.id;
    expect(draftId).toBeDefined();

    testContext.set(context.task.name, {
      ecf_path: createRes.body.ecf_cartesian_vectors_format_file_path,
      gt_path: createRes.body.ground_track_of_launch_vehicle_2d_img_file_path,
    });

    let updateReq = request(app).put(`/request-drafts/${draftId}`);
    updateReq = updateReq.set('x-user-id', testUserId);
    updateReq = addFormFields(updateReq, {
      ...baseDraftData,
      call_sign: 'UPD-CS',
    });
    updateReq = addFiles(updateReq);
    const updateRes = await updateReq;

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.call_sign).toBe('UPD-CS');
    const deleteRes = await request(app).delete(
      `/request-drafts/${draftId}?user_id=${testUserId}`
    );
    expect(deleteRes.status).toBe(204);
  });

  it('should return 404 on deleting non-existent draft', async () => {
    const res = await request(app).delete(
      `/request-drafts/999999?user_id=${testUserId}`
    );
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('Request draft not found');
  });

  it('should return 400 on invalid number format in PUT', async () => {
    const res = await request(app)
      .put('/request-drafts/abc')
      .set('x-user-email', 'commercial@company.com');
    expect(res.status).toBe(400);
  });

  it('should create a request draft with user_id and retrieve it with external user_id', async (context) => {
    let req = request(app).post('/request-drafts');
    req = req.set('x-user-id', testUserId);
    req = addFormFields(req, baseDraftData);
    req = addFiles(req);
    const createRes = await req;

    expect(createRes.status).toBe(201);
    expect(createRes.body.user_id).toBe(testUserId);

    const draftId = createRes.body.id;
    testContext.set(context.task.name, {
      ecf_path: createRes.body.ecf_cartesian_vectors_format_file_path,
      gt_path: createRes.body.ground_track_of_launch_vehicle_2d_img_file_path,
    });

    // Retrieve the draft and verify user_id is returned as external_id
    const getRes = await request(app)
      .get(`/request-drafts/${draftId}`)
      .set('x-user-id', testUserId);
    expect(getRes.status).toBe(200);
    expect(getRes.body.user_id).toBe(testUserId);

    // Clean up
    await request(app).delete(
      `/request-drafts/${draftId}?user_id=${testUserId}`
    );
  });

  it('should fail to create request draft with invalid user_id', async () => {
    const invalidData = {
      ...baseDraftData,
      user_id: 'invalid-user-id',
    };

    let req = request(app).post('/request-drafts');
    req = req.set('x-user-id', 'invalid-user-id');
    req = addFormFields(req, invalidData);
    req = addFiles(req);
    const createRes = await req;

    expect(createRes.status).toBe(401);
    expect(createRes.body.message).toContain('not found');
  });

  it('should fail to create request draft with non-COMMERCIAL user', async () => {
    const ntiaData = {
      ...baseDraftData,
      user_id: ntiaUserId,
    };

    let req = request(app).post('/request-drafts');
    req = req.set('x-user-id', ntiaUserId);
    req = addFormFields(req, ntiaData);
    req = addFiles(req);
    const createRes = await req;

    expect(createRes.status).toBe(403);
    expect(createRes.body.error).toContain('Only COMMERCIAL users');
  });
});
