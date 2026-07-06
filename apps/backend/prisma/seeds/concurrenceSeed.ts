import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

export class ConcurrenceSeed {
  async main(count: number = 20) {
    const requestsCount = Math.min(await prisma.request.count(), count);
    const requests = await prisma.request.findMany({ take: requestsCount });

    // Get users from federal agency entities
    const federalAgencyUsers = await prisma.user.findMany({
      where: {
        entity: {
          type: 'FEDERAL_AGENCY',
          active: true,
        },
      },
      include: {
        entity: true,
      },
    });

    if (requests.length === 0) {
      console.error(
        '❌ Cannot seed concurrences: No requests found in the database.\n'
      );
      process.exit(1);
    }
    if (federalAgencyUsers.length === 0) {
      console.error(
        '❌ Cannot seed concurrences: No federal agency users found in the database.\n'
      );
      process.exit(1);
    }

    requests.forEach((request) => {
      federalAgencyUsers.forEach(async (user) => {
        const concurred = Math.random() < 0.5;
        const conditions = concurred
          ? Math.random() < 0.5
            ? faker.lorem.word()
            : null
          : null;
        const concurrence = await prisma.concurrence.create({
          data: {
            request_id: request.id,
            user_id: user.id,
            concurred: concurred,
            conditions: conditions,
          },
        });
        console.log(
          `✅ Created concurrence for request ${request.id} by user ${user.name} (${user.entity.abbreviation}): ${concurrence.id}`
        );
      });
    });

    console.log('✅ Seed data has been added to the database.\n');
  }
}
