import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COMMON_CONDITIONS = [
  {
    filename: 'non-interference-basis-nib.md',
    title: 'Non-Interference Basis (NIB)',
  },
  {
    filename: 'cease-buzzer-operations.md',
    title: 'Cease Buzzer Operations',
  },
  {
    filename: 'payload-license-requirement.md',
    title: 'Payload License Requirement',
  },
  {
    filename: 'launch-prelaunch-scope.md',
    title: 'Launch/Prelaunch Scope',
  },
  {
    filename: 'booster-recovery-scope.md',
    title: 'Booster Recovery Scope',
  },
  {
    filename: 'scope-of-operations.md',
    title: 'Scope of Operations',
  },
  {
    filename: 'nswcdd-boz-notice.md',
    title: 'NSWCDD BOZ Notice',
  },
  {
    filename: 'trajectory-reporting.md',
    title: 'Trajectory Reporting',
  },
  {
    filename: 'range-coordination-schedule.md',
    title: 'Range Coordination/Schedule',
  },
  {
    filename: 'pfd-limits.md',
    title: 'PFD Limits',
  },
  {
    filename: 'erp-restriction.md',
    title: 'ERP Restriction',
  },
  {
    filename: 'satellite-protection-not-sure-this-is-common.md',
    title: 'Satellite Protection',
  },
  {
    filename: 'nasa-artemis-ii-mission-protection.md',
    title: 'NASA Artemis II Mission Protection',
  },
  {
    filename: 'tx-log-required.md',
    title: 'TX Log Required',
  },
  {
    filename: 'future-request-expectation.md',
    title: 'Future Request Expectation',
  },
] as const;

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const commonConditionsDir = path.resolve(
  currentDir,
  '../../../frontend/src/components/ViewDetails/Feedback/FeedbackTable/CommonConditions/conditions-markdown'
);

async function readConditionMarkdown({
  filename,
  title,
}: (typeof COMMON_CONDITIONS)[number]) {
  const filePath = path.join(commonConditionsDir, filename);
  const markdown = (await readFile(filePath, 'utf8')).trimEnd();

  return {
    title,
    content: markdown,
  };
}

export class CommonConditionsSeed {
  async main() {
    const seedOwner = await prisma.user.findUnique({
      where: {
        email: 'slfcpadmin@ntia.gov',
      },
      select: {
        id: true,
      },
    });

    if (!seedOwner) {
      throw new Error(
        'Seed user slfcpadmin@ntia.gov not found. Run the Entities+Users+Domains seed first.'
      );
    }

    await prisma.commonCondition.deleteMany();

    for (let i = 0; i < COMMON_CONDITIONS.length; i++) {
      const commonConditionDefinition = COMMON_CONDITIONS[i];
      const commonCondition = await readConditionMarkdown(
        commonConditionDefinition
      );
      const timestamp = new Date();

      await prisma.commonCondition.create({
        data: {
          ...commonCondition,
          sort_order: i,
          status: 'PUBLISHED',
          created_by_id: seedOwner.id,
          createdAt: timestamp,
          publishedAt: timestamp,
        },
      });
    }
  }
}
