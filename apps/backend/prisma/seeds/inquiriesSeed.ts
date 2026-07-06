import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

export class InquiriesSeed {
  async main(count: number = 20) {
    let readInquiriesCount = 0;
    let unreadInquiriesCount = 0;
    const requestsCount = Math.min(await prisma.request.count(), count);
    const allRequests = await prisma.request.findMany({
      select: { id: true },
    });
    const shuffled = allRequests.sort(() => 0.5 - Math.random());
    const selectedIds = shuffled.slice(0, requestsCount).map((r) => r.id);

    const requests = await prisma.request.findMany({
      where: { id: { in: selectedIds } },
    });

    if (requests.length === 0) {
      console.error(
        '❌ Cannot seed inqiuries: No requests found in the database.\n'
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

    const federalUsers = await prisma.user.findMany({
      where: {
        entity: {
          type: 'FEDERAL_AGENCY',
        },
      },
    });

    const commUsers = await prisma.user.findMany({
      where: {
        entity: {
          type: 'COMMERCIAL',
        },
      },
    });

    if (ntiaUsers.length === 0) {
      console.error(
        '❌ Cannot seed inqiuries: No NTIA users found in the database.\n'
      );
      process.exit(1);
    }

    if (federalUsers.length === 0) {
      console.error(
        '❌ Cannot seed inqiuries: No FEDERAL_AGENCY users found in the database.\n'
      );
      process.exit(1);
    }

    if (commUsers.length === 0) {
      console.error(
        '❌ Cannot seed inqiuries: No COMMERCIAL users found in the database.\n'
      );
      process.exit(1);
    }

    for (const request of requests) {
      const userGroups = [ntiaUsers, federalUsers, commUsers];
      const senderIndex = faker.number.int({ min: 0, max: 2 });
      const senderUsers = userGroups[senderIndex];
      let recipientUsers = userGroups[faker.number.int({ min: 1, max: 2 })];

      recipientUsers = senderIndex > 0 ? ntiaUsers : recipientUsers;
      const senderUser = faker.helpers.arrayElement(senderUsers);
      const recipientUser = faker.helpers.arrayElement(recipientUsers);

      const inq = await prisma.inquiry.findMany({
        where: {
          request_id: request.id,
          OR: [
            {
              entityA_id: senderUser.entity_id,
              entityB_id: recipientUser.entity_id,
            },
            {
              entityA_id: recipientUser.entity_id,
              entityB_id: senderUser.entity_id,
            },
          ],
        },
      });
      if (inq.length > 0) {
        console.log(
          `❌ Inquiry already exists ${inq[0].id} for request ${request.id} between ${senderUser.external_id} and ${recipientUser.external_id}. Skipping.`
        );
        continue; // Skip if inquiry already exists
      }

      const inquiry = await prisma.inquiry.create({
        data: {
          request_id: request.id,
          entityA_id: senderUser.entity_id,
          entityB_id: recipientUser.entity_id,
          messages: {
            create: [
              {
                sender_id: senderUser.id,
                content: 'Please review the revised request by EOD.',
                sentAt: faker.date.past(),
              },
              {
                sender_id: recipientUser.id,
                content: 'Replied to request.',
                sentAt: faker.date.past(),
              },
            ],
          },
        },
        include: {
          messages: true,
        },
      });

      // Create read statuses for some messages to test zero count hiding
      // 60% chance that messages are marked as read (to create mix of read/unread)
      const shouldMarkAsRead = faker.datatype.boolean({ probability: 0.6 });

      if (shouldMarkAsRead) {
        readInquiriesCount++;
      } else {
        unreadInquiriesCount++;
      }

      if (shouldMarkAsRead) {
        // Mark messages as read by relevant users
        for (const message of inquiry.messages) {
          // Mark as read by the recipient (not the sender)
          const recipientId =
            message.sender_id === senderUser.id
              ? recipientUser.id
              : senderUser.id;

          await prisma.messageReadStatus.create({
            data: {
              message_id: message.id,
              user_id: recipientId,
              readAt: faker.date.between({
                from: message.sentAt,
                to: new Date(),
              }),
            },
          });
        }
      }

      console.log(
        `✅ Created inquiry for request ${request.id} by user ${senderUser.external_id} and user ${recipientUser.external_id}: ${inquiry.id} ${shouldMarkAsRead ? '(messages marked as read)' : '(messages unread)'}`
      );
    }

    console.log(`✅ Seed data has been added to the database.`);
    console.log(
      `📊 Summary: ${readInquiriesCount} inquiries with read messages (0 unread count), ${unreadInquiriesCount} inquiries with unread messages (>0 unread count)\n`
    );
  }
}
