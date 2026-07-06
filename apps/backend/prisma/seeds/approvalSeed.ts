import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

export class ApprovalSeed {
  async main() {
    const requests = await prisma.request.findMany();

    if (requests.length === 0) {
      console.error(
        '❌ Cannot seed approvals: No requests found in the database.\n'
      );
      process.exit(1);
    }

    const ntiaUsers = await prisma.user.findMany({
      where: {
        entity: { type: 'NTIA' },
      },
    });

    if (ntiaUsers.length === 0) {
      console.error(
        '❌ Cannot seed approvals: No NTIA users found in the database.\n'
      );
      process.exit(1);
    }

    for (const request of requests) {
      const approvalCount = faker.number.int({ min: 1, max: 3 });

      for (let i = 0; i < approvalCount; i++) {
        const randomUser = faker.helpers.arrayElement(ntiaUsers);

        // pick a random delay of 1–20 days after the request was created
        const daysAfter = faker.number.int({ min: 1, max: 20 });

        const approvalDate = new Date(request.createdAt);
        approvalDate.setDate(approvalDate.getDate() + daysAfter);
        // Add random hours, minutes, and seconds for more realistic timestamps
        approvalDate.setHours(faker.number.int({ min: 0, max: 23 }));
        approvalDate.setMinutes(faker.number.int({ min: 0, max: 59 }));
        approvalDate.setSeconds(faker.number.int({ min: 0, max: 59 }));

        await prisma.approval.create({
          data: {
            request_id: request.id,
            user_id: randomUser.id,
            date_approved: approvalDate,
            createdAt: approvalDate, // ensure internal consistency
            condition: faker.book.title(),
            read: faker.datatype.boolean(),
            is_final: faker.datatype.boolean(),
          },
        });

        console.log(
          `✅ Created approval for request ${request.id} by user ${randomUser.external_id} (${daysAfter} days after request).`
        );
      }
    }

    console.log('✅ Seed data has been added to the database.\n');
  }
}
