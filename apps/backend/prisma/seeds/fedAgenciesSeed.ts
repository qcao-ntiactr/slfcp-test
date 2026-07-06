import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class FedAgeniesSeed {
  async main() {
    await prisma.entity.createMany({
      data: [
        {
          abbreviation: 'NAVY',
          name: 'United States Navy',
          type: 'FEDERAL_AGENCY',
          active: true,
          distribution_list_email: 'navy-spectrum@navy.mil',
        },
        {
          abbreviation: 'NASA',
          name: 'National Aeronautics and Space Administration',
          type: 'FEDERAL_AGENCY',
          active: true,
          distribution_list_email: 'nasa-slfcp@nasa.gov',
        },
        {
          abbreviation: 'NOAA',
          name: 'National Oceanic and Atmospheric Administration',
          type: 'FEDERAL_AGENCY',
          active: false,
          distribution_list_email: 'noaa-spectrum@noaa.gov',
        },
      ],
      skipDuplicates: true, // avoids error if already seeded
    });
  }
}
