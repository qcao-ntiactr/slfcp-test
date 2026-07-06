import { expect, test } from '@playwright/test';

import {
  closeOpenDialog,
  createCommonCondition,
  findCommonConditionRow,
  getUniqueCommonConditionData,
  gotoCommonConditionsLibrary,
  loginAsUser,
} from './utils';

test('Happy path common conditions library', async ({ page }) => {
  test.setTimeout(90000);

  const condition = getUniqueCommonConditionData('Library Happy Path');

  console.log('\n=== STEP 1: NTIA opens the common conditions library ===');
  await loginAsUser(page, 'ntia');
  await gotoCommonConditionsLibrary(page);

  console.log('\n=== STEP 2: NTIA publishes a new common condition ===');
  await createCommonCondition(page, {
    title: condition.title,
    content: condition.content,
    action: 'publish',
  });

  console.log('\n=== STEP 3: Published condition appears in the library ===');
  const publishedRow = await findCommonConditionRow(page, condition.title, {
    tab: 'Published',
    expectedText: condition.title,
  });
  await expect(publishedRow).toContainText(condition.title);
  await expect(publishedRow).toContainText(/ntia/i);

  console.log('\n=== STEP 4: Published condition can be opened and viewed ===');
  await publishedRow
    .getByRole('button', {
      name: `Expand details for common condition ${condition.title}`,
    })
    .click();
  await expect(page.getByRole('dialog')).toContainText('Details');
  await expect(page.getByRole('dialog')).toContainText(condition.content);
  await closeOpenDialog(page);

  console.log(`✅ Happy path completed for "${condition.title}"`);
});
