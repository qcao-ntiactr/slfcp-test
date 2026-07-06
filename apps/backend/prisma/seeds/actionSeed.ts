import { PrismaClient, ActionType } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

export class ActionSeed {
  async main(count: number = 20) {
    const requestsCount = Math.min(await prisma.request.count(), count);
    const requests = await prisma.request.findMany({ take: requestsCount });

    // Get valid users (NTIA or FEDERAL_AGENCY type)
    const validUsers = await prisma.user.findMany({
      where: {
        entity: {
          type: {
            in: ['NTIA', 'FEDERAL_AGENCY'],
          },
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

    if (requests.length === 0) {
      console.error(
        '❌ Cannot seed actions: No requests found in the database.\n'
      );
      return;
    }

    if (validUsers.length === 0) {
      console.error(
        '❌ Cannot seed actions: No NTIA or FEDERAL_AGENCY users found.\n'
      );
      return;
    }

    for (const request of requests) {
      const actionCount = faker.number.int({ min: 1, max: 3 });

      for (let i = 0; i < actionCount; i++) {
        const user = faker.helpers.arrayElement(validUsers);
        const action: ActionType = faker.helpers.arrayElement([
          'finalize_denial',
          'approve_with_conditions',
          'approve',
          'concur_with_conditions',
          'concur',
          'not_concur',
          'request_revisions',
          'resubmit',
        ]);
        const details =
          action.includes('with_conditions') ||
          action === 'concur_with_conditions'
            ? faker.lorem.sentence()
            : null;

        const created = await prisma.action.create({
          data: {
            request_id: request.id,
            user_id: user.id, // Use actual database user ID
            action,
            details: details || undefined,
          },
        });

        console.log(
          `✅ Created ${user.entity.type} action (${action}) for request ${request.id}: ${created.id}`
        );
      }
    }

    console.log('✅ Action seed data has been added to the database.\n');
  }
}
