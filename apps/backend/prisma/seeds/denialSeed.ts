import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

export class DenialSeed {
  async main() {
    const requests = await prisma.request.findMany();

    if (requests.length === 0) {
      console.error(
        '❌ Cannot seed denials: No requests found in the database.\n'
      );
      process.exit(1);
    }

    const ntiaUsers = await prisma.user.findMany({
      where: {
        entity: {
          type: 'NTIA',
        },
      },
    });

    if (ntiaUsers.length === 0) {
      console.error(
        '❌ Cannot seed denials: No NTIA users found in the database.\n'
      );
      process.exit(1);
    }

    for (const request of requests) {
      const denialCount = faker.number.int({ min: 1, max: 3 });

      for (let i = 0; i < denialCount; i++) {
        const randomUser = faker.helpers.arrayElement(ntiaUsers);

        // Random delay of 1-20 days after request was created
        const daysAfter = faker.number.int({ min: 1, max: 20 });

        const denialDate = new Date(request.createdAt);
        denialDate.setDate(denialDate.getDate() + daysAfter);
        // Add random hours, minutes, and seconds for more realistic timestamps
        denialDate.setHours(faker.number.int({ min: 0, max: 23 }));
        denialDate.setMinutes(faker.number.int({ min: 0, max: 59 }));
        denialDate.setSeconds(faker.number.int({ min: 0, max: 59 }));

        await prisma.denial.create({
          data: {
            request_id: request.id,
            user_id: randomUser.id, // Must match numeric user_id type in DB
            createdAt: denialDate,
            date_denied: denialDate,
            reason: faker.lorem.sentence(), // Ensures valid, non-empty reason
            read: false,
            is_final: faker.datatype.boolean(),
          },
        });

        console.log(
          `✅ Created denial for request ${request.id} by user ${randomUser.external_id} (${daysAfter} days after request).`
        );
      }
    }

    console.log('✅ Seed data has been added to the database.\n');
  }
}
