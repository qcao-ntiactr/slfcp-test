import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

export class CommentSeed {
  async main(count: number = 20) {
    const requestsCount = Math.min(await prisma.request.count(), count);
    const requests = await prisma.request.findMany({ take: requestsCount });

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
        '❌ Cannot seed comments: No requests found in the database.\n'
      );
      process.exit(1);
    }

    if (validUsers.length === 0) {
      console.error(
        '❌ Cannot seed comments: No NTIA or FEDERAL_AGENCY users found.\n'
      );
      process.exit(1);
    }

    for (const request of requests) {
      for (let i = 0; i < count; i++) {
        const user = faker.helpers.arrayElement(validUsers);
        const commentText = faker.lorem.sentences(2);
        const isConfidential = faker.datatype.boolean();

        const comment = await prisma.comment.create({
          data: {
            request_id: request.id,
            user_id: user.id,
            comment: commentText,
            is_internal: isConfidential,
          },
        });

        console.log(
          `✅ Created ${user.entity.type} comment for request ${request.id}: ${comment.id}`
        );
      }
    }

    console.log('✅ Seed data has been added to the database.\n');
  }
}
