import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class EntitiesUsersSeed {
  async main() {
    // Seed entities
    await prisma.entity.createMany({
      data: [
        {
          abbreviation: 'NTIA',
          name: 'NTIA',
          type: 'NTIA',
          active: true,
          distribution_list_email: null,
        },
        {
          abbreviation: 'NASA',
          name: 'NASA',
          type: 'FEDERAL_AGENCY',
          active: true,
          distribution_list_email: null,
        },
        {
          abbreviation: 'NAVY',
          name: 'NAVY',
          type: 'FEDERAL_AGENCY',
          active: true,
          distribution_list_email: null,
        },
        {
          abbreviation: 'NOAA',
          name: 'NOAA',
          type: 'FEDERAL_AGENCY',
          active: false,
          distribution_list_email: null,
        },
        {
          abbreviation: 'COMM',
          name: 'COMM',
          type: 'COMMERCIAL',
          active: true,
          distribution_list_email: null,
        },
        {
          abbreviation: 'SPACEX',
          name: 'SPACEX',
          type: 'COMMERCIAL',
          active: true,
          distribution_list_email: null,
        },
      ],
      skipDuplicates: true,
    });

    const entities = await prisma.entity.findMany();
    const entityMap = Object.fromEntries(
      entities.map((e) => [e.abbreviation, e.id])
    );

    // Seed users
    await prisma.user.createMany({
      data: [
        {
          external_id: 'ntiadev@company.com',
          name: 'Benjamin Harrison',
          email: 'ntiadev@company.com',
          entity_id: entityMap['NTIA'],
          active: true,
        },
        {
          external_id: 'slfcpadmin@ntia.gov',
          name: 'SLFCP Administrator',
          email: 'slfcpadmin@ntia.gov',
          entity_id: entityMap['NTIA'],
          active: true,
        },
        {
          external_id: 'federal@nasa.gov',
          name: 'Andrew Johnson',
          email: 'federal@nasa.gov',
          entity_id: entityMap['NASA'],
          can_concur: true,
          active: true,
        },
        {
          external_id: 'federal@navy.gov',
          name: 'Tom Nickelson',
          email: 'federal@navy.gov',
          entity_id: entityMap['NAVY'],
          can_concur: true,
          active: true,
        },
        {
          external_id: 'federal@noaa.gov',
          name: 'Noah Walker',
          email: 'federal@noaa.gov',
          entity_id: entityMap['NOAA'],
          can_concur: true,
          active: true,
        },
        {
          external_id: 'commercialqa@company.com',
          name: 'Thomas Jefferson',
          email: 'commercialqa@company.com',
          entity_id: entityMap['COMM'],
          active: true,
        },
        {
          external_id: 'commercialdev@company.com',
          name: 'Benjamin Franklin',
          email: 'commercialdev@company.com',
          entity_id: entityMap['COMM'],
          active: true,
        },
        {
          external_id: 'spacex@fakeserver123.com',
          name: 'SPACEX',
          email: 'spacex@fakeserver123.com',
          entity_id: entityMap['SPACEX'],
          active: true,
        },
        {
          external_id: 'SCSVCSLFCP1@ntia.gov',
          name: 'Benjamin Harrison',
          email: 'SCSVCSLFCP1@ntia.gov',
          entity_id: entityMap['NTIA'],
          active: true,
        },
        {
          external_id: 'SCSVCSLFCP2@ntia.gov',
          name: 'Andrew Johnson',
          email: 'SCSVCSLFCP2@ntia.gov',
          entity_id: entityMap['NASA'],
          can_concur: true,
          active: true,
        },
        {
          external_id: 'SCSVCSLFCP3@ntia.gov',
          name: 'Thomas Jefferson',
          email: 'SCSVCSLFCP3@ntia.gov',
          entity_id: entityMap['COMM'],
          active: true,
        },
      ],
      skipDuplicates: true,
    });

    // Seed domains
    await prisma.entityDomain.createMany({
      data: [
        { domain: 'ntia.gov', entity_id: entityMap['NTIA'] },
        { domain: 'nasa.gov', entity_id: entityMap['NASA'] },
        { domain: 'navy.gov', entity_id: entityMap['NAVY'] },
        { domain: 'noaa.gov', entity_id: entityMap['NOAA'] },
        { domain: 'spacex.com', entity_id: entityMap['SPACEX'] },
        { domain: 'spacex1.com', entity_id: entityMap['SPACEX'] },
      ],
      skipDuplicates: true,
    });
  }
}
