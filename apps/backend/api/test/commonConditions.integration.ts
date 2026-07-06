import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { CommonConditionStatus, PrismaClient } from '@prisma/client';

import { app } from './setup.ts';

const prisma = new PrismaClient();

type TestUser = {
  id: number;
  external_id: string;
  email: string;
};

const createdConditionIds: number[] = [];

let commercialUser: TestUser;
let federalUser: TestUser;
let ntiaUser: TestUser;

async function createCommonConditionRecord(input: {
  title: string;
  content: string;
  status: CommonConditionStatus;
  createdById?: number;
  approvedById?: number;
  rejectionReason?: string | null;
  sortOrder?: number;
}) {
  const commonCondition = await prisma.commonCondition.create({
    data: {
      title: input.title,
      content: input.content,
      status: input.status,
      created_by_id: input.createdById,
      approved_by_id: input.approvedById,
      rejection_reason: input.rejectionReason ?? null,
      sort_order: input.sortOrder ?? 0,
    },
  });

  createdConditionIds.push(commonCondition.id);
  return commonCondition;
}

function authHeaders(user: TestUser) {
  return {
    'x-user-id': user.external_id,
    'x-user-email': user.email,
  };
}

describe('Common Conditions API Integration Tests', () => {
  beforeAll(async () => {
    const [commercial, federal, ntia] = await Promise.all([
      prisma.user.findFirst({
        where: { entity: { type: 'COMMERCIAL' } },
        select: { id: true, external_id: true, email: true },
      }),
      prisma.user.findFirst({
        where: { entity: { type: 'FEDERAL_AGENCY' } },
        select: { id: true, external_id: true, email: true },
      }),
      prisma.user.findFirst({
        where: { entity: { type: 'NTIA' } },
        select: { id: true, external_id: true, email: true },
      }),
    ]);

    if (!commercial || !federal || !ntia) {
      throw new Error(
        'Required COMMERCIAL, FEDERAL_AGENCY, and NTIA users must exist in the database.'
      );
    }

    commercialUser = commercial;
    federalUser = federal;
    ntiaUser = ntia;
  });

  afterEach(async () => {
    if (createdConditionIds.length > 0) {
      await prisma.commonCondition.deleteMany({
        where: {
          id: {
            in: createdConditionIds.splice(0, createdConditionIds.length),
          },
        },
      });
    }
  });

  it('returns only published options to commercial users', async () => {
    await createCommonConditionRecord({
      title: 'Published Option',
      content: 'Published markdown',
      status: 'PUBLISHED',
      createdById: ntiaUser.id,
      sortOrder: 999,
    });
    await createCommonConditionRecord({
      title: 'Draft Option',
      content: 'Draft markdown',
      status: 'DRAFT',
      createdById: federalUser.id,
      sortOrder: 1000,
    });

    const res = await request(app)
      .get('/common-conditions/options')
      .set(authHeaders(commercialUser));

    expect(res.status).toBe(200);
    expect(
      res.body.some(
        (condition: { title: string }) => condition.title === 'Draft Option'
      )
    ).toBe(false);
    expect(
      res.body.find(
        (condition: { title: string }) => condition.title === 'Published Option'
      )
    ).toMatchObject({
      title: 'Published Option',
      content: 'Published markdown',
      sortOrder: 999,
    });
  });

  it('blocks commercial users from admin common condition endpoints', async () => {
    const res = await request(app)
      .get('/common-conditions/published')
      .set(authHeaders(commercialUser));

    expect(res.status).toBe(403);
  });

  it('allows a federal author to create a draft and view only their workflow records', async () => {
    const foreignDraft = await createCommonConditionRecord({
      title: 'NTIA Draft',
      content: 'Should not be visible to federal author',
      status: 'DRAFT',
      createdById: ntiaUser.id,
    });

    const createRes = await request(app)
      .post('/common-conditions/drafts')
      .set(authHeaders(federalUser))
      .send({
        title: 'Federal Draft',
        content: 'Federal draft markdown',
      });

    expect(createRes.status).toBe(201);
    createdConditionIds.push(createRes.body.id);
    expect(createRes.body.status).toBe('DRAFT');
    expect(createRes.body.created_by_id).toBe(federalUser.id);
    expect(createRes.body.sort_order).toBe(0);

    const listRes = await request(app)
      .get('/common-conditions/submitted?page=1&pageSize=10')
      .set(authHeaders(federalUser));

    expect(listRes.status).toBe(200);
    expect(listRes.body.page).toBe(1);
    expect(listRes.body.pageSize).toBe(10);
    expect(listRes.body.totalCount).toBe(1);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0]).toMatchObject({
      id: createRes.body.id,
      title: 'Federal Draft',
      content: 'Federal draft markdown',
      status: 'DRAFT',
      submittedBy: federalUser.email,
    });
    expect(
      listRes.body.data.some(
        (condition: { id: number }) => condition.id === foreignDraft.id
      )
    ).toBe(false);
  });

  it('publishes a newly created NTIA common condition immediately', async () => {
    const createRes = await request(app)
      .post('/common-conditions/drafts')
      .set(authHeaders(ntiaUser))
      .send({
        title: 'NTIA Published Condition',
        content: 'Publish immediately',
      });

    expect(createRes.status).toBe(201);
    createdConditionIds.push(createRes.body.id);
    expect(createRes.body.status).toBe('PUBLISHED');
    expect(createRes.body.created_by_id).toBe(ntiaUser.id);
    expect(createRes.body.approved_by_id).toBe(ntiaUser.id);
    expect(createRes.body.sort_order).toBeGreaterThanOrEqual(0);
    expect(createRes.body.publishedAt).toBe(createRes.body.createdAt);

    const publishedListRes = await request(app)
      .get('/common-conditions/published?page=1&pageSize=10')
      .set(authHeaders(ntiaUser));

    expect(publishedListRes.status).toBe(200);
    expect(
      publishedListRes.body.data.find(
        (condition: { id: number }) => condition.id === createRes.body.id
      )
    ).toMatchObject({
      id: createRes.body.id,
      title: 'NTIA Published Condition',
      status: 'PUBLISHED',
      submittedBy: ntiaUser.email,
      publishedAt: createRes.body.createdAt,
    });
  });

  it('submits a draft and rejects later draft edits', async () => {
    const createRes = await request(app)
      .post('/common-conditions/drafts')
      .set(authHeaders(federalUser))
      .send({
        title: 'Submit Me',
        content: 'Draft before submission',
      });

    expect(createRes.status).toBe(201);
    createdConditionIds.push(createRes.body.id);

    const submitRes = await request(app)
      .post(`/common-conditions/${createRes.body.id}/submit`)
      .set(authHeaders(federalUser));

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.status).toBe('SUBMITTED');

    const updateRes = await request(app)
      .put(`/common-conditions/drafts/${createRes.body.id}`)
      .set(authHeaders(federalUser))
      .send({
        title: 'Edited after submit',
        content: 'Should fail',
      });

    expect(updateRes.status).toBe(409);
    expect(updateRes.body.error).toContain('Only drafts can be edited');
  });

  it('lets NTIA publish a submitted federal common condition', async () => {
    const submitted = await createCommonConditionRecord({
      title: 'Ready to Publish',
      content: 'Submitted markdown',
      status: 'SUBMITTED',
      createdById: federalUser.id,
    });

    const res = await request(app)
      .post(`/common-conditions/${submitted.id}/publish`)
      .set(authHeaders(ntiaUser));

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PUBLISHED');
    expect(res.body.approved_by_id).toBe(ntiaUser.id);
    expect(res.body.rejection_reason).toBeNull();
    expect(res.body.sort_order).toBeGreaterThanOrEqual(0);

    const publishedListRes = await request(app)
      .get('/common-conditions/published?page=1&pageSize=10')
      .set(authHeaders(federalUser));

    expect(publishedListRes.status).toBe(200);
    expect(
      publishedListRes.body.data.find(
        (condition: { id: number }) => condition.id === submitted.id
      )
    ).toMatchObject({
      id: submitted.id,
      title: 'Ready to Publish',
      status: 'PUBLISHED',
      submittedBy: federalUser.email,
    });
  });

  it('lets NTIA reject a submitted common condition but does not allow the owner to delete the rejected item', async () => {
    const submitted = await createCommonConditionRecord({
      title: 'Reject Me',
      content: 'Submitted markdown',
      status: 'SUBMITTED',
      createdById: federalUser.id,
    });

    const rejectRes = await request(app)
      .post(`/common-conditions/${submitted.id}/reject`)
      .set(authHeaders(ntiaUser))
      .send({
        rejectionReason: 'Needs revision before publication',
      });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.status).toBe('REJECTED');
    expect(rejectRes.body.rejection_reason).toBe(
      'Needs revision before publication'
    );

    const deleteRes = await request(app)
      .delete(`/common-conditions/${submitted.id}`)
      .set(authHeaders(federalUser));

    expect(deleteRes.status).toBe(409);
    expect(deleteRes.body.error).toContain(
      'Only draft conditions can be deleted'
    );

    const dbRecord = await prisma.commonCondition.findUnique({
      where: { id: submitted.id },
    });
    expect(dbRecord).not.toBeNull();
  });

  it('prevents a federal author from editing or deleting another users draft', async () => {
    const ntiaDraft = await createCommonConditionRecord({
      title: 'NTIA Owned Draft',
      content: 'Do not touch',
      status: 'DRAFT',
      createdById: ntiaUser.id,
    });

    const updateRes = await request(app)
      .put(`/common-conditions/drafts/${ntiaDraft.id}`)
      .set(authHeaders(federalUser))
      .send({
        title: 'Unauthorized edit',
        content: 'Unauthorized edit',
      });

    expect(updateRes.status).toBe(403);

    const deleteRes = await request(app)
      .delete(`/common-conditions/${ntiaDraft.id}`)
      .set(authHeaders(federalUser));

    expect(deleteRes.status).toBe(403);
  });

  it('allows a federal author to delete only their own draft', async () => {
    const ownDraft = await createCommonConditionRecord({
      title: 'Delete My Draft',
      content: 'Draft markdown',
      status: 'DRAFT',
      createdById: federalUser.id,
    });

    const deleteRes = await request(app)
      .delete(`/common-conditions/${ownDraft.id}`)
      .set(authHeaders(federalUser));

    expect(deleteRes.status).toBe(204);

    const dbRecord = await prisma.commonCondition.findUnique({
      where: { id: ownDraft.id },
    });
    expect(dbRecord).toBeNull();

    const index = createdConditionIds.indexOf(ownDraft.id);
    if (index >= 0) {
      createdConditionIds.splice(index, 1);
    }
  });

  it('prevents NTIA from deleting draft or in-review common conditions', async () => {
    const ntiaDraft = await createCommonConditionRecord({
      title: 'Draft Not Deletable By NTIA',
      content: 'Draft markdown',
      status: 'DRAFT',
      createdById: federalUser.id,
    });
    const submitted = await createCommonConditionRecord({
      title: 'Submitted Not Deletable By NTIA',
      content: 'Submitted markdown',
      status: 'SUBMITTED',
      createdById: federalUser.id,
    });

    const draftDeleteRes = await request(app)
      .delete(`/common-conditions/${ntiaDraft.id}`)
      .set(authHeaders(ntiaUser));

    expect(draftDeleteRes.status).toBe(409);
    expect(draftDeleteRes.body.error).toContain(
      'Only final-stage approved or denied conditions can be deleted'
    );

    const submittedDeleteRes = await request(app)
      .delete(`/common-conditions/${submitted.id}`)
      .set(authHeaders(ntiaUser));

    expect(submittedDeleteRes.status).toBe(409);
    expect(submittedDeleteRes.body.error).toContain(
      'Only final-stage approved or denied conditions can be deleted'
    );
  });

  it('allows NTIA to delete final-stage common conditions', async () => {
    const rejected = await createCommonConditionRecord({
      title: 'Rejected Final Stage',
      content: 'Rejected markdown',
      status: 'REJECTED',
      createdById: federalUser.id,
      rejectionReason: 'Needs revision',
    });
    const published = await createCommonConditionRecord({
      title: 'Published Final Stage',
      content: 'Published markdown',
      status: 'PUBLISHED',
      createdById: ntiaUser.id,
      approvedById: ntiaUser.id,
    });

    const rejectedDeleteRes = await request(app)
      .delete(`/common-conditions/${rejected.id}`)
      .set(authHeaders(ntiaUser));

    expect(rejectedDeleteRes.status).toBe(204);

    const publishedDeleteRes = await request(app)
      .delete(`/common-conditions/${published.id}`)
      .set(authHeaders(ntiaUser));

    expect(publishedDeleteRes.status).toBe(204);

    const [rejectedRecord, publishedRecord] = await Promise.all([
      prisma.commonCondition.findUnique({
        where: { id: rejected.id },
      }),
      prisma.commonCondition.findUnique({
        where: { id: published.id },
      }),
    ]);

    expect(rejectedRecord).toBeNull();
    expect(publishedRecord).toBeNull();

    for (const deletedId of [rejected.id, published.id]) {
      const index = createdConditionIds.indexOf(deletedId);
      if (index >= 0) {
        createdConditionIds.splice(index, 1);
      }
    }
  });
});
