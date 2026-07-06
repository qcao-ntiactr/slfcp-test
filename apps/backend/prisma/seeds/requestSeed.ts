import {
  Prisma,
  PrismaClient,
  EirpUnit,
  AltitudeUnit,
  SignalFilterStatus,
  LocationEnum,
  BeforeOrAfterFiltering,
  StatusEnum,
} from '@prisma/client';
import { STATE_ABBREVIATIONS } from '@slfcp/utils';
import { faker } from '@faker-js/faker';

import {
  generateOrderedDates,
  generateValidFrequencyAndBandwidth,
} from './utils/seedHelpers.js';

const prisma = new PrismaClient();
export class RequestSeed {
  async main(count: number = 50) {
    // Get valid COMMERCIAL users for creating requests
    const validUsers = await prisma.user.findMany({
      where: {
        entity: {
          type: 'COMMERCIAL',
        },
      },
      include: {
        entity: {
          select: {
            type: true,
          },
        },
      },
    });

    if (validUsers.length === 0) {
      console.error(
        '❌ Cannot seed requests: No COMMERCIAL users found in the database.\n'
      );
      process.exit(1);
    }

    for (let i = 0; i < count; i++) {
      const frequencyCount = faker.number.int({ min: 1, max: 5 });
      const frequencies =
        new Array<Prisma.FrequencyCreateWithoutRequestInput>();
      for (let j = 0; j < frequencyCount; j++) {
        const locations = [
          LocationEnum.first_stage,
          LocationEnum.second_stage,
          LocationEnum.ground,
        ];

        // Generate properly ordered dates for this frequency
        const dates = generateOrderedDates();

        // Generate valid frequency and transmitted bandwidth combination
        const {
          frequency: fakeFrequency,
          transmittedBandwidth: fakeTransmittedBandwidth,
        } = generateValidFrequencyAndBandwidth();

        const frequency = {
          frequency: fakeFrequency,
          location_of_transmitter_on_vehicle_or_platform:
            locations[Math.floor(Math.random() * locations.length)],
          eirp: faker.number.float({
            min: 0,
            max: 999,
            fractionDigits: 2,
          }),
          eirp_unit:
            Object.values(EirpUnit)[
              Math.floor(Math.random() * Object.values(EirpUnit).length)
            ],
          transmitted_bandwidth: fakeTransmittedBandwidth,
          transmitted_bandwidth_is_signal_filtered:
            Math.random() < 0.5
              ? SignalFilterStatus.filtered
              : SignalFilterStatus.not_filtered,
          transmitted_bandwidth_justification:
            fakeTransmittedBandwidth > 5 ? faker.lorem.sentence() : '',
          minus_3db_bandwidth: faker.number.float({
            min: 0,
            max: 99,
            fractionDigits: 2,
          }),
          minus_3db_bandwidth_before_or_after_filtering:
            Math.random() < 0.5
              ? BeforeOrAfterFiltering.before_filtering
              : BeforeOrAfterFiltering.after_filtering,
          minus_20db_bandwidth: faker.number.float({
            min: 0,
            max: 99,
            fractionDigits: 2,
          }),
          minus_20db_bandwidth_before_or_after_filtering:
            Math.random() < 0.5
              ? BeforeOrAfterFiltering.before_filtering
              : BeforeOrAfterFiltering.after_filtering,
          minus_60db_bandwidth: faker.number.float({
            min: 0,
            max: 99,
            fractionDigits: 2,
          }),
          minus_60db_bandwidth_before_or_after_filtering:
            Math.random() < 0.5
              ? BeforeOrAfterFiltering.before_filtering
              : BeforeOrAfterFiltering.after_filtering,
          nature_of_modulating_signals: faker.lorem.word().slice(0, 50),
          emission_designator: faker.lorem.word().slice(0, 50),
          tx_transmission_start: dates.txStart,
          tx_transmission_end: dates.txEnd,
          tx_antenna_type: faker.commerce.productName().slice(0, 100),
          tx_antenna_gain: faker.number.int({ min: 1, max: 99 }),
          tx_antenna_beamwidth: faker.number.int({ min: 1, max: 360 }),
          tx_antenna_altitude: faker.number.int({ min: -300, max: 32767 }),
          tx_antenna_altitude_unit:
            Object.values(AltitudeUnit)[
              Math.floor(Math.random() * Object.values(AltitudeUnit).length)
            ],
          receivers: [
            {
              transmission_start: dates.receiverStart,
              transmission_end: dates.receiverEnd,
              antenna_type: faker.commerce.productName().slice(0, 100),
              antenna_gain: faker.number.int({ min: 1, max: 99 }),
              antenna_beamwidth: faker.number.int({ min: 1, max: 360 }),
              antenna_altitude: faker.number.int({ min: -300, max: 32767 }),
              antenna_altitude_unit:
                Object.values(AltitudeUnit)[
                  Math.floor(Math.random() * Object.values(AltitudeUnit).length)
                ],
              location_of_receiving_ground_station:
                locations[Math.floor(Math.random() * locations.length)],
              longitude_of_receiving_antenna: faker.number.float({
                min: -180,
                max: 180,
                fractionDigits: 4,
              }),
              latitude_of_receiving_antenna: faker.number.float({
                min: -90,
                max: 90,
                fractionDigits: 4,
              }),
            },
          ],
        };
        frequencies.push(frequency);
      }

      // Randomly select a COMMERCIAL user for this request
      const user = faker.helpers.arrayElement(validUsers);

      const fullName = `${faker.person.firstName()} ${faker.person.lastName()}`;

      // Make roughly 1/3 land in last week, 1/3 in last month, 1/3 in last quarter
      const today = new Date();
      const roll = Math.random();
      let createdAt;

      if (roll < 0.33) {
        // last week: between (now - 14d, now - 7d)
        createdAt = faker.date.between({
          from: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000),
          to: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
        });
      } else if (roll < 0.66) {
        // last month: between (now - 60d, now - 30d)
        createdAt = faker.date.between({
          from: new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000),
          to: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
        });
      } else {
        // last quarter (Q3): between (now - 120d, now - 90d)
        createdAt = faker.date.between({
          from: new Date(today.getTime() - 120 * 24 * 60 * 60 * 1000),
          to: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000),
        });
      }

      const request = await prisma.request.create({
        data: {
          createdAt,
          mission_name: faker.company.name().slice(0, 50),
          name_of_licensee: faker.company.name().slice(0, 50),
          call_sign: faker.lorem.word(8).slice(0, 8),
          name_of_launch_vehicle: faker.company.name().slice(0, 50),
          city: faker.location.city().slice(0, 25),
          state:
            STATE_ABBREVIATIONS[
              faker.number.int({ min: 0, max: STATE_ABBREVIATIONS.length - 1 })
            ],
          latitude: faker.number.float({
            min: -90,
            max: 90,
            fractionDigits: 4,
          }),
          longitude: faker.number.float({
            min: -180,
            max: 180,
            fractionDigits: 4,
          }),
          launch_datetime_primary: faker.date.future(),
          launch_datetime_backup: faker.date.future(),
          orbital_location: faker.location.direction(),
          number_of_frequencies: frequencies.length,
          ground_track_from_liftoff_until_payload_separation:
            faker.lorem.sentence(),
          ecf_cartesian_vectors_format_file_desc: faker.lorem.sentence(),
          ecf_cartesian_vectors_format_file_path:
            '02c9c381-9142-424c-a3bf-7c78a287a920-testECF1.xls',
          ground_track_of_launch_vehicle_2d_img_file_desc:
            faker.lorem.sentence(),
          ground_track_of_launch_vehicle_2d_img_file_path:
            '03de300a-7415-42a0-bb0a-2d8cd6292d70-gtrack sample.jpg',
          primary_poc_name: fullName.slice(0, 30),
          primary_poc_email: faker.internet.email().slice(0, 30),
          primary_poc_phone: '703-333-3333',
          alternate_poc_name: fullName.slice(0, 30),
          alternate_poc_email: faker.internet.email().slice(0, 30),
          alternate_poc_phone: '703-444-4444',
          status: faker.helpers.enumValue(StatusEnum),
          read: false,
          user_id: user.id,
          frequencies: {
            create: frequencies,
          },
        },
      });
      console.log(
        `✅ Created request: ${request.name_of_licensee} (User: ${user.external_id || user.id})`
      );
    }

    console.log('Seed data has been added to the database.');
  }
}
