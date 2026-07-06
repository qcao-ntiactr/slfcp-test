import { describe, it, afterEach, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { BlobServiceClient } from '@azure/storage-blob';
import { PrismaClient } from '@prisma/client';

import { app } from './setup.ts';

const prisma = new PrismaClient();
let testUserId: string;
let navyUserId: string;
let nasaUserId: string;
let ntiaUserId: string;

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

    navyUserId = 'federal@navy.gov';
    nasaUserId = 'federal@nasa.gov';

    // Dynamically select a NASA user from the database
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
  afterEach(async (context) => {
    const connectionString =
      process.env.AZURE_BLOB_STORAGE_CONNECTION_STRING || '';
    const containerName = process.env.CONTAINER_NAME || 'slfcp-uploads';

    // Create Azure Blob Service Client
    const blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const storedFileNames = testContext.get(context.task.name);

    if (storedFileNames && Array.isArray(storedFileNames)) {
      for (const filePath of storedFileNames) {
        await containerClient.getBlobClient(filePath).deleteIfExists();
      }
    }
  });

  const testContext = new Map();
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const getFutureIsoDate = (daysFromNow: number, hoursFromNow = 0) =>
    new Date(
      Date.now() +
        daysFromNow * millisecondsPerDay +
        hoursFromNow * 60 * 60 * 1000
    ).toISOString();
  const validFccFilingDate = getFutureIsoDate(30);
  const validLaunchPrimaryDate = getFutureIsoDate(45, 8);
  const validLaunchBackupDate = getFutureIsoDate(46, 8);
  const validTransmissionStartDate = getFutureIsoDate(45, 7);
  const validTransmissionEndDate = getFutureIsoDate(45, 9);

  const testRequestData = {
    valid1: {
      get user_id() {
        return testUserId;
      },
      mission_name: 'Mission Name Test',
      name_of_licensee: 'Test Licensee',
      fcc_filing_date: validFccFilingDate,
      call_sign: 'TEST-CS',
      name_of_launch_vehicle: 'name_of_launch_vehicle test',
      city: 'city test',
      state: 'VA',
      latitude: '-35.6747',
      longitude: '82.9936',
      launch_datetime_primary: validLaunchPrimaryDate,
      launch_datetime_backup: validLaunchBackupDate,
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
          tx_transmission_start: validTransmissionStartDate,
          tx_transmission_end: validTransmissionEndDate,
          receivers: [
            {
              transmission_start: validTransmissionStartDate,
              transmission_end: validTransmissionEndDate,
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
      fcc_filing_date: validFccFilingDate,
      call_sign: 'TEST-CS',
      name_of_launch_vehicle: 'name_of_launch_vehicle test',
      city: 'city test',
      state: 'VA',
      latitude: '-35.6747',
      longitude: '82.9936',
      launch_datetime_primary: validLaunchPrimaryDate,
      launch_datetime_backup: validLaunchBackupDate,
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
          tx_transmission_start: validTransmissionStartDate,
          tx_transmission_end: validTransmissionEndDate,
          receivers: [
            {
              transmission_start: validTransmissionStartDate,
              transmission_end: validTransmissionEndDate,
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
          tx_transmission_start: validTransmissionStartDate,
          tx_transmission_end: validTransmissionEndDate,
          receivers: [
            {
              transmission_start: validTransmissionStartDate,
              transmission_end: validTransmissionEndDate,
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

  describe('create new request with revisions ', () => {
    describe('POSITIVE TESTS', () => {
      it('should create a new request with valid data and one frequency, create a revision and submit revision request after creating request', async (context) => {
        let req = request(app).post('/requests');
        req = req.set('x-user-id', testUserId);
        req = addFormFields(req, testRequestData.valid1);
        req = addFiles(req);
        const res = await req;
        const _request = res.body.request;

        expect(res.status).toBe(201);
        expect(_request).toBeDefined();

        // Store file names in context for cleanup
        if (_request) {
          testContext.set(context.task.name, [
            ...(testContext.get(context.task.name) || []),
            ...[
              _request.ecf_cartesian_vectors_format_file_path,
              _request.ground_track_of_launch_vehicle_2d_img_file_path,
            ],
          ]);
        }
        expect(_request).toHaveProperty('revision');
        expect(_request.name_of_licensee).toBe('Test Licensee');

        const requestId = _request.id;
        expect(requestId).toBeDefined();
        const revision0 = _request.revision;
        expect(revision0).toBe(0);
        expect(res.body.status).toBe('UNDER_NTIA_INITIAL_REVIEW');

        // Create a revision request first
        let requestRevisionReq = request(app)
          .post(`/requests/${requestId}/requested-revisions`)
          .send({
            requested_changes: ['occaeca', 'labore dolore amet'],
            user_id: ntiaUserId,
          });
        requestRevisionReq = requestRevisionReq.set('x-user-email', ntiaUserId);
        const requestRevisionRes = await requestRevisionReq;
        const requestRevision = requestRevisionRes.body;

        expect(requestRevisionRes.status).toBe(201);
        expect(requestRevision).toHaveProperty('id');

        // Create a denial
        let denialReq = request(app)
          .post(`/requests/${requestId}/denials`)
          .send({
            date_denied: '2027-06-14T17:16:34.913Z',
            reason: 'reason',
            is_final: false,
            user_id: ntiaUserId,
          });
        denialReq = denialReq.set('x-user-email', ntiaUserId);
        const denialRes = await denialReq;
        const denial = denialRes.body;

        expect(denialRes.status).toBe(201);
        expect(denial.status.status).toBe('UNDER_INITIAL_REVISION_PER_NTIA');

        // Create a revision
        req = request(app).post(
          `/requests/${requestId}/revisions?action=resubmit`
        );
        req = addFormFields(req, testRequestData.valid1);
        req = addFiles(req);
        const revisionRes = await req;
        const revision = revisionRes.body.request;

        expect(revisionRes.status).toBe(201);
        expect(revision).toBeDefined();
        expect(revision.root_request_id).toBe(requestId);
        expect(revision.revision).toBe(revision0 + 1);
        expect(revisionRes.body.status).toBe('UNDER_NTIA_INITIAL_REVIEW');

        // Store file names in context for cleanup
        if (revision) {
          testContext.set(context.task.name, [
            ...(testContext.get(context.task.name) || []),
            ...[
              revision.ecf_cartesian_vectors_format_file_path,
              revision.ground_track_of_launch_vehicle_2d_img_file_path,
            ],
          ]);
        }

        // Create an approval
        let approvalReq = request(app)
          .post(`/requests/${revision.id}/approvals`)
          .send({
            date_approved: '2027-06-14T17:16:34.913Z',
            condition: '',
            //,"is_final": false
          });
        approvalReq = approvalReq.set('x-user-email', ntiaUserId);
        let approvalRes = await approvalReq;
        let approval = approvalRes.body.createdApproval || approvalRes.body;

        expect(approvalRes.status).toBe(201);
        expect(approvalRes.body.status).toBe('UNDER_FEDERAL_AGENCIES_REVIEW');
        if (approval && typeof approval === 'object') {
          expect(approval.data).toHaveProperty('id');
        }

        // Create a concurrence 1
        let concurrenceReq = request(app)
          .post(`/requests/${revision.id}/concurrences`)
          .send({
            concurred: true,
            conditions: '',
            user_id: nasaUserId,
          });
        concurrenceReq = concurrenceReq.set('x-user-email', nasaUserId);

        const concurrenceRes = await concurrenceReq;
        const concurrence = concurrenceRes.body;

        expect(concurrenceRes.status).toBe(201);
        expect(concurrence.concurred).toBe(true);

        // Create a concurrence 2
        concurrenceReq = request(app)
          .post(`/requests/${revision.id}/concurrences`)
          .send({
            concurred: true,
            conditions: '',
            user_id: navyUserId,
          });
        concurrenceReq = concurrenceReq.set('x-user-email', navyUserId);

        const concurrenceRes1 = await concurrenceReq;
        const concurrence1 =
          concurrenceRes1.body.concurrence || concurrenceRes1.body;

        expect(concurrenceRes1.status).toBe(201);
        if (concurrence1 && typeof concurrence1 === 'object') {
          expect(concurrence1.concurred).toBe(true);
        }
        expect(concurrenceRes1.body.status).toBe('UNDER_NTIA_FINAL_REVIEW');

        // Create an approval
        approvalReq = request(app)
          .post(`/requests/${revision.id}/approvals`)
          .send({
            date_approved: '2027-06-14T17:16:34.913Z',
            condition: '',
            //,"is_final": false
          });
        approvalReq = approvalReq.set('x-user-email', ntiaUserId);
        approvalRes = await approvalReq;
        //approval = approvalRes.body.createdApproval;

        expect(approvalRes.status).toBe(201);
        expect(approvalRes.body.status).toBe('APPROVED');
      }, 30000);
      it('should create a new request with valid data and one frequency, create a revision and submit revision request after federal agencies review before approving', async (context) => {
        let req = request(app).post('/requests');
        req = req.set('x-user-id', testUserId);
        req = addFormFields(req, testRequestData.valid1);
        req = addFiles(req);
        const res = await req;
        const _request = res.body.request;

        expect(res.status).toBe(201);
        expect(_request).toBeDefined();

        // Store file names in context for cleanup
        if (_request) {
          testContext.set(context.task.name, [
            ...(testContext.get(context.task.name) || []),
            ...[
              _request.ecf_cartesian_vectors_format_file_path,
              _request.ground_track_of_launch_vehicle_2d_img_file_path,
            ],
          ]);
        }
        expect(_request).toHaveProperty('revision');
        expect(_request.name_of_licensee).toBe('Test Licensee');

        let requestId = _request.id;
        expect(requestId).toBeDefined();
        const revision0 = _request.revision;
        expect(revision0).toBe(0);
        expect(res.body.status).toBe('UNDER_NTIA_INITIAL_REVIEW');

        // Create an approval
        let approvalReq = request(app)
          .post(`/requests/${requestId}/approvals`)
          .send({
            date_approved: '2027-06-14T17:16:34.913Z',
            condition: '',
          });
        approvalReq = approvalReq.set('x-user-email', ntiaUserId);
        let approvalRes = await approvalReq;
        let approval = approvalRes.body.createdApproval || approvalRes.body;

        expect(approvalRes.status).toBe(201);
        expect(approvalRes.body.status).toBe('UNDER_FEDERAL_AGENCIES_REVIEW');
        if (approval && typeof approval === 'object') {
          expect(approval.data).toHaveProperty('id');
        }

        // Create a concurrence 1
        let concurrenceReq = request(app)
          .post(`/requests/${requestId}/concurrences`)
          .send({
            federal_agency_id: 1,
            concurred: true,
            conditions: '',
            user_id: nasaUserId,
          });
        concurrenceReq = concurrenceReq.set('x-user-email', nasaUserId);

        let concurrenceRes = await concurrenceReq;
        let concurrence = concurrenceRes.body;

        expect(concurrenceRes.status).toBe(201);
        expect(concurrence.concurred).toBe(true);

        // Create a concurrence 2
        concurrenceReq = request(app)
          .post(`/requests/${requestId}/concurrences`)
          .send({
            federal_agency_id: 2,
            concurred: true,
            conditions: '',
            user_id: navyUserId,
          });
        concurrenceReq = concurrenceReq.set('x-user-email', navyUserId);

        concurrenceRes = await concurrenceReq;
        concurrence = concurrenceRes.body.concurrence || concurrenceRes.body;

        expect(concurrenceRes.status).toBe(201);
        if (concurrence && typeof concurrence === 'object') {
          expect(concurrence.concurred).toBe(true);
        }
        expect(concurrenceRes.body.status).toBe('UNDER_NTIA_FINAL_REVIEW');

        // Create a revision request first
        let requestRevisionReq2 = request(app)
          .post(`/requests/${requestId}/requested-revisions`)
          .send({
            requested_changes: ['final revision needed', 'additional changes'],
            user_id: ntiaUserId,
          });
        requestRevisionReq2 = requestRevisionReq2.set(
          'x-user-email',
          ntiaUserId
        );
        const requestRevisionRes2 = await requestRevisionReq2;
        const requestRevision2 = requestRevisionRes2.body;

        expect(requestRevisionRes2.status).toBe(201);
        expect(requestRevision2).toHaveProperty('id');

        // Create a denial
        let denialReq = request(app)
          .post(`/requests/${requestId}/denials`)
          .send({
            date_denied: '2027-06-14T17:16:34.913Z',
            reason: 'reason',
            is_final: false,
          });
        denialReq = denialReq.set('x-user-email', ntiaUserId);
        const denialRes = await denialReq;
        const denial = denialRes.body;

        expect(denialRes.status).toBe(201);
        expect(denial.status.status).toBe('UNDER_FINAL_REVISION_PER_NTIA');

        // Create a revision request
        let requestRevisionReq = request(app)
          .post(`/requests/${requestId}/requested-revisions`)
          .send({
            requested_changes: ['occaeca', 'labore dolore amet'],
            user_id: ntiaUserId,
          });
        requestRevisionReq = requestRevisionReq.set('x-user-email', ntiaUserId);
        const requestRevisionRes = await requestRevisionReq;
        const requestRevision = requestRevisionRes.body;

        expect(requestRevisionRes.status).toBe(201);
        expect(requestRevision).toHaveProperty('id');

        // Create a revision
        req = request(app).post(
          `/requests/${requestId}/revisions?action=resubmit`
        );
        req = addFormFields(req, testRequestData.valid1);
        req = addFiles(req);
        const revisionRes = await req;
        const revision = revisionRes.body.request;

        expect(revisionRes.status).toBe(201);
        expect(revision).toBeDefined();
        expect(revision.root_request_id).toBe(requestId);
        expect(revision.revision).toBe(revision0 + 1);
        expect(revisionRes.body.status).toBe('UNDER_FEDERAL_AGENCIES_REVIEW');

        // Store file names in context for cleanup
        if (revision) {
          testContext.set(context.task.name, [
            ...(testContext.get(context.task.name) || []),
            ...[
              revision.ecf_cartesian_vectors_format_file_path,
              revision.ground_track_of_launch_vehicle_2d_img_file_path,
            ],
          ]);
        }

        requestId = revision.id;
        // Create a concurrence 1
        concurrenceReq = request(app)
          .post(`/requests/${requestId}/concurrences`)
          .send({
            federal_agency_id: 1,
            concurred: true,
            conditions: '',
            user_id: nasaUserId,
          });
        concurrenceReq = concurrenceReq.set('x-user-email', nasaUserId);

        concurrenceRes = await concurrenceReq;
        concurrence = concurrenceRes.body;

        expect(concurrenceRes.status).toBe(201);
        expect(concurrence.concurred).toBe(true);

        // Create a concurrence 2
        concurrenceReq = request(app)
          .post(`/requests/${requestId}/concurrences`)
          .send({
            federal_agency_id: 2,
            concurred: true,
            conditions: '',
            user_id: navyUserId,
          });
        concurrenceReq = concurrenceReq.set('x-user-email', navyUserId);

        concurrenceRes = await concurrenceReq;
        concurrence = concurrenceRes.body.concurrence || concurrenceRes.body;

        expect(concurrenceRes.status).toBe(201);
        if (concurrence && typeof concurrence === 'object') {
          expect(concurrence.concurred).toBe(true);
        }
        expect(concurrenceRes.body.status).toBe('UNDER_NTIA_FINAL_REVIEW');

        // Create an approval
        approvalReq = request(app)
          .post(`/requests/${requestId}/approvals`)
          .send({
            date_approved: '2027-06-14T17:16:34.913Z',
            condition: '',
            is_final: true,
          });
        approvalReq = approvalReq.set('x-user-email', ntiaUserId);
        approvalRes = await approvalReq;
        //approval = approvalRes.body.createdApproval;

        expect(approvalRes.status).toBe(201);
        expect(approvalRes.body.status).toBe('APPROVED');
      }, 15000);
    });
  });
});
