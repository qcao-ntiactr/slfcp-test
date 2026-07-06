import { expect, test } from '@playwright/test';

import {
  closeOpenDialog,
  createCommonCondition,
  denyCommonCondition,
  expectMenuOptions,
  findCommonConditionRow,
  getUniqueCommonConditionData,
  gotoCommonConditionsLibrary,
  loginAsUser,
  logOut,
  openCommonConditionViewModal,
  submitCommonConditionForReview,
} from './utils';

test('Complete common condition denial workflow', async ({ page }) => {
  test.setTimeout(120000);

  const condition = getUniqueCommonConditionData('Denial');
  const rejectionReason = `Denial reason for ${condition.title}`;

  console.log('\n=== STEP 1: Federal user creates and submits a draft ===');
  await loginAsUser(page, 'federal');
  await gotoCommonConditionsLibrary(page);
  await createCommonCondition(page, {
    title: condition.title,
    content: condition.content,
    action: 'save_draft',
  });

  let row = await findCommonConditionRow(page, condition.title, {
    tab: 'Submissions',
    expectedText: 'DRAFT',
  });
  await submitCommonConditionForReview(page, row, condition.title);
  row = await findCommonConditionRow(page, condition.title, {
    tab: 'Submissions',
    expectedText: 'UNDER REVIEW',
  });
  await expect(row).toContainText('UNDER REVIEW');
  console.log(`✅ Federal user submitted "${condition.title}"`);
  await logOut(page);

  console.log('\n=== STEP 2: NTIA denies the submitted common condition ===');
  await loginAsUser(page, 'ntia');
  row = await findCommonConditionRow(page, condition.title, {
    tab: 'Submissions',
    expectedText: 'UNDER REVIEW',
  });
  await denyCommonCondition(page, row, condition.title, rejectionReason);
  console.log(`✅ NTIA denied "${condition.title}"`);
  await logOut(page);

  console.log(
    '\n=== STEP 3: Federal user verifies rejected status and denial reason ==='
  );
  await loginAsUser(page, 'federal');
  row = await findCommonConditionRow(page, condition.title, {
    tab: 'Submissions',
    expectedText: 'DENIED',
  });
  await expect(row).toContainText('DENIED');

  await openCommonConditionViewModal(page, row, condition.title);
  await expect(page.getByRole('dialog')).toContainText('DENIED');
  await expect(page.getByRole('dialog')).toContainText(rejectionReason);
  await closeOpenDialog(page);

  await expectMenuOptions(page, row, condition.title, ['View', 'Delete']);
  console.log(
    `✅ Federal user can still view/delete rejected condition "${condition.title}"`
  );
});
