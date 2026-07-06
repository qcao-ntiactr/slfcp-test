import { expect, test } from '@playwright/test';

import {
  approveCommonCondition,
  createCommonCondition,
  findCommonConditionRow,
  getUniqueCommonConditionData,
  gotoCommonConditionsLibrary,
  isCommonConditionAbsent,
  loginAsUser,
  logOut,
  submitCommonConditionForReview,
} from './utils';

test('Complete common condition approval workflow', async ({ page }) => {
  test.setTimeout(120000);

  const condition = getUniqueCommonConditionData('Approval');

  console.log(
    '\n=== STEP 1: Federal user creates a draft common condition ==='
  );
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
  await expect(row).toContainText(condition.title);
  await expect(row).toContainText('DRAFT');
  console.log(`✅ Federal user created draft "${condition.title}"`);

  console.log('\n=== STEP 2: Federal user submits the draft for review ===');
  await submitCommonConditionForReview(page, row, condition.title);
  row = await findCommonConditionRow(page, condition.title, {
    tab: 'Submissions',
    expectedText: 'UNDER REVIEW',
  });
  await expect(row).toContainText('UNDER REVIEW');
  console.log(`✅ Federal user submitted "${condition.title}" for review`);
  await logOut(page);

  console.log('\n=== STEP 3: NTIA approves and publishes the condition ===');
  await loginAsUser(page, 'ntia');
  row = await findCommonConditionRow(page, condition.title, {
    tab: 'Submissions',
    expectedText: 'UNDER REVIEW',
  });
  await approveCommonCondition(page, row, condition.title);

  const stillInSubmissions = await isCommonConditionAbsent(
    page,
    condition.title,
    'Submissions'
  );
  expect(stillInSubmissions).toBe(true);

  const publishedRow = await findCommonConditionRow(page, condition.title, {
    tab: 'Published',
    expectedText: condition.title,
  });
  await expect(publishedRow).toContainText(condition.title);
  await expect(publishedRow).toContainText(/federal|navy/i);
  console.log(`✅ NTIA published "${condition.title}" successfully`);
});
