import { test } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
const loginUrl = `${baseUrl}${process.env.LOGIN_URL || '/'}`;
const viewRequestsUrl = `${baseUrl}${process.env.VIEW_REQUESTS_URL || '/view-requests'}`;

test(`NAVY concurs with private comment`, async ({ page }) => {
  const rawId = process.env.REQUEST_ID;

  if (!rawId) {
    throw new Error('Missing REQUEST_ID env variable. Run with: REQUEST_ID=5');
  }

  const formattedRequestId = `SLFCP-${rawId.toString().padStart(5, '0')}-${new Date().getFullYear()}`;

  // --- Login ---
  await page.goto(loginUrl);
  await page.getByLabel('Email Address').fill('federal@navy.gov');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // --- Navigate to requests table ---
  await page.goto(viewRequestsUrl);
  await page.waitForSelector('table');

  while (true) {
    const row = await page
      .locator('table >> tr', {
        hasText: formattedRequestId,
      })
      .first();

    if (await row.count()) {
      const viewButton = row.locator('a[aria-label^="View details"]');
      await viewButton.scrollIntoViewIfNeeded();
      await viewButton.click();
      break;
    }

    const nextButton = page.getByRole('button', { name: /next/i });
    const isDisabled = await nextButton.getAttribute('disabled');

    if (isDisabled !== null) {
      console.error(
        `❌ Request ID ${formattedRequestId} not found in paginated results.`
      );
      return;
    }

    await nextButton.click();
    await page.waitForTimeout(1000); // give time to load
  }

  // --- Fill comment ---
  await page.waitForSelector('textarea[name="comment"]');
  await page.locator('textarea[name="comment"]').fill('Navy private comment');
  await page.locator('[name="is_internal"] + span').click();

  // --- Select "Approve" from dropdown ---
  await page.selectOption('select[name="action"]', 'concur');

  // --- Click Save ---
  await page.getByRole('button', { name: /^save$/i }).click();
  await page.waitForTimeout(8000);
  console.log(`✅ Concurred request ${formattedRequestId} with comment.`);
});

test(`NASA concurs with public comment`, async ({ page }) => {
  const rawId = process.env.REQUEST_ID;

  if (!rawId) {
    throw new Error('Missing REQUEST_ID env variable. Run with: REQUEST_ID=5');
  }

  const formattedRequestId = `SLFCP-${rawId.toString().padStart(5, '0')}-${new Date().getFullYear()}`;

  // --- Login ---
  await page.goto(loginUrl);
  await page.getByLabel('Email Address').fill('federal@nasa.gov');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // --- Navigate to requests table ---
  await page.goto(viewRequestsUrl);
  await page.waitForSelector('table');

  while (true) {
    const row = await page
      .locator('table >> tr', {
        hasText: formattedRequestId,
      })
      .first();

    if (await row.count()) {
      const viewButton = row.locator('a[aria-label^="View details"]');
      await viewButton.scrollIntoViewIfNeeded();
      await viewButton.click();
      break;
    }

    const nextButton = page.getByRole('button', { name: /next/i });
    const isDisabled = await nextButton.getAttribute('disabled');

    if (isDisabled !== null) {
      console.error(
        `❌ Request ID ${formattedRequestId} not found in paginated results.`
      );
      return;
    }

    await nextButton.click();
    await page.waitForTimeout(1000); // give time to load
  }

  // --- Fill comment ---
  await page.waitForSelector('textarea[name="comment"]');
  await page.locator('textarea[name="comment"]').fill('Navy private comment');

  // --- Select "Approve" from dropdown ---
  await page.selectOption('select[name="action"]', 'concur');

  // --- Click Save ---
  await page.getByRole('button', { name: /^save$/i }).click();
  await page.waitForTimeout(8000);
  console.log(`✅ Concurred request ${formattedRequestId} with comment.`);

  await page.pause();
});
