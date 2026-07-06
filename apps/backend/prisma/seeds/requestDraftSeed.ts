import {
  PrismaClient,
  EirpUnit,
  AltitudeUnit,
  SignalFilterStatus,
  LocationEnum,
  BeforeOrAfterFiltering,
} from '@prisma/client';
import { STATE_ABBREVIATIONS } from '@slfcp/utils';
import { faker } from '@faker-js/faker';

import {
  generateOrderedDates,
  generateValidFrequencyAndBandwidth,
} from './utils/seedHelpers.js';

const prisma = new PrismaClient();

export class RequestDraftSeed {
  async main(count: number = 50) {
    // Get valid COMMERCIAL users for creating request drafts
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
        '❌ Cannot seed request drafts: No COMMERCIAL users found in the database.\n'
      );
      process.exit(1);
    }

    for (let i = 0; i < count; i++) {
      const frequencyCount = faker.number.int({ min: 1, max: 5 });
      const frequencies: unknown[] = [];

      for (let j = 0; j < frequencyCount; j++) {
        // Generate properly ordered dates for this frequency
        const dates = generateOrderedDates();

        // Generate valid frequency and transmitted bandwidth combination
        const {
          frequency: fakeFrequency,
          transmittedBandwidth: fakeTransmittedBandwidth,
        } = generateValidFrequencyAndBandwidth();

        frequencies.push({
          frequency: fakeFrequency,
          location_of_transmitter_on_vehicle_or_platform:
            faker.helpers.arrayElement(Object.values(LocationEnum)),
          eirp: faker.number.float({ min: 0, max: 999, fractionDigits: 2 }),
          eirp_unit: faker.helpers.arrayElement(Object.values(EirpUnit)),
          transmitted_bandwidth: fakeTransmittedBandwidth,
          transmitted_bandwidth_is_signal_filtered: faker.helpers.arrayElement(
            Object.values(SignalFilterStatus)
          ),
          transmitted_bandwidth_justification:
            fakeTransmittedBandwidth > 5 ? faker.lorem.sentence() : '',
          minus_3db_bandwidth: faker.number.float({
            min: 0,
            max: 99.99,
            fractionDigits: 2,
          }),
          minus_3db_bandwidth_before_or_after_filtering:
            faker.helpers.arrayElement(Object.values(BeforeOrAfterFiltering)),
          minus_20db_bandwidth: faker.number.float({
            min: 0,
            max: 99.99,
            fractionDigits: 2,
          }),
          minus_20db_bandwidth_before_or_after_filtering:
            faker.helpers.arrayElement(Object.values(BeforeOrAfterFiltering)),
          minus_60db_bandwidth: faker.number.float({
            min: 0,
            max: 99.99,
            fractionDigits: 2,
          }),
          minus_60db_bandwidth_before_or_after_filtering:
            faker.helpers.arrayElement(Object.values(BeforeOrAfterFiltering)),
          nature_of_modulating_signals: faker.lorem.word().slice(0, 50),
          emission_designator: faker.lorem.word().slice(0, 50),
          tx_transmission_start: dates.txStart,
          tx_transmission_end: dates.txEnd,
          tx_antenna_type: faker.commerce.productName().slice(0, 100),
          tx_antenna_gain: faker.number.int({ min: 1, max: 99 }),
          tx_antenna_beamwidth: faker.number.int({ min: 1, max: 360 }),
          tx_antenna_altitude: faker.number.int({ min: -300, max: 32767 }),
          tx_antenna_altitude_unit: faker.helpers.arrayElement(
            Object.values(AltitudeUnit)
          ),
          receivers: [
            {
              transmission_start: dates.receiverStart,
              transmission_end: dates.receiverEnd,
              antenna_type: faker.commerce.productName().slice(0, 100),
              antenna_gain: faker.number.int({ min: 1, max: 99 }),
              antenna_beamwidth: faker.number.int({ min: 1, max: 360 }),
              antenna_altitude: faker.number.int({ min: -300, max: 32767 }),
              antenna_altitude_unit: faker.helpers.arrayElement(
                Object.values(AltitudeUnit)
              ),
              location_of_receiving_ground_station: faker.helpers.arrayElement(
                Object.values(LocationEnum)
              ),
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
        });
      }

      // Randomly select a COMMERCIAL user for this request draft
      const user = faker.helpers.arrayElement(validUsers);

      const fullName = `${faker.person.firstName()} ${faker.person.lastName()}`;

      await prisma.requestDraft.create({
        data: {
          mission_name: faker.company.name().slice(0, 50),
          name_of_licensee: faker.datatype.boolean()
            ? faker.company.name().slice(0, 50)
            : undefined,
          call_sign: faker.datatype.boolean()
            ? faker.string.alpha({ length: 8 })
            : undefined,
          name_of_launch_vehicle: faker.datatype.boolean()
            ? faker.company.name().slice(0, 50)
            : undefined,
          city: faker.datatype.boolean()
            ? faker.location.city().slice(0, 25)
            : undefined,
          state: faker.datatype.boolean()
            ? faker.helpers.arrayElement(STATE_ABBREVIATIONS)
            : undefined,
          latitude: faker.datatype.boolean()
            ? faker.number.float({ min: -90, max: 90, fractionDigits: 4 })
            : undefined,
          longitude: faker.datatype.boolean()
            ? faker.number.float({ min: -180, max: 180, fractionDigits: 4 })
            : undefined,
          launch_datetime_primary: faker.datatype.boolean()
            ? faker.date.future()
            : undefined,
          launch_datetime_backup: faker.datatype.boolean()
            ? faker.date.future()
            : undefined,
          orbital_location: faker.datatype.boolean()
            ? faker.location.direction()
            : undefined,
          number_of_frequencies: frequencies.length,
          ground_track_from_liftoff_until_payload_separation:
            faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
          ecf_cartesian_vectors_format_file_desc: faker.datatype.boolean()
            ? faker.lorem.sentence()
            : undefined,
          ecf_cartesian_vectors_format_file_path: 'mock-ecf-file.xls',
          ground_track_of_launch_vehicle_2d_img_file_desc:
            faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
          ground_track_of_launch_vehicle_2d_img_file_path:
            'mock-gtrack-image.jpg',
          primary_poc_name: faker.datatype.boolean()
            ? fullName.slice(0, 30)
            : undefined,
          primary_poc_email: faker.datatype.boolean()
            ? faker.internet.email().slice(0, 30)
            : undefined,
          primary_poc_phone: faker.datatype.boolean()
            ? '703-555-1212'
            : undefined,
          alternate_poc_name: faker.datatype.boolean()
            ? fullName.slice(0, 30)
            : undefined,
          alternate_poc_email: faker.datatype.boolean()
            ? faker.internet.email().slice(0, 30)
            : undefined,
          alternate_poc_phone: faker.datatype.boolean()
            ? '703-555-3434'
            : undefined,
          user_id: user.id,
          frequencies: { create: frequencies },
        },
      });
    }

    console.log(
      `✅ ${count} request drafts seeded successfully with user associations.`
    );
  }
}
