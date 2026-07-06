import { test } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
const loginUrl = `${baseUrl}${process.env.LOGIN_URL || '/'}`;
const viewRequestsUrl = `${baseUrl}${process.env.VIEW_REQUESTS_URL || '/view-requests'}`;

const getFormattedRequestId = (rawId: string) =>
  `SLFCP-${rawId.toString().padStart(5, '0')}-${new Date().getFullYear()}`;

const openRequestDetails = async (page, formattedRequestId: string) => {
  await page.goto(viewRequestsUrl);

  // Wait for table to be present and loaded
  await page.waitForSelector('table tbody tr', { timeout: 15000 });

  // Wait a bit more for data to load
  await page.waitForTimeout(2000);

  while (true) {
    // Look for the row containing the request ID
    const row = page
      .locator('table tbody tr')
      .filter({ hasText: formattedRequestId });

    const rowCount = await row.count();
    console.log(
      `Looking for ${formattedRequestId}, found ${rowCount} matching rows`
    );

    if (rowCount > 0) {
      const viewButton = row.locator('a[aria-label^="View details"]').first();
      await viewButton.scrollIntoViewIfNeeded();
      await viewButton.click();
      console.log(`✅ Found and clicked view button for ${formattedRequestId}`);
      return;
    }

    // Try to go to next page
    const nextButton = page.getByRole('button', { name: /next/i });
    const isDisabled = await nextButton.getAttribute('disabled');

    if (isDisabled !== null) {
      throw new Error(
        `❌ Request ${formattedRequestId} not found after searching all pages.`
      );
    }

    console.log(`Request not found on current page, going to next page...`);
    await nextButton.click();
    await page.waitForTimeout(2000); // Wait for page to load
  }
};

const fillCommentAndSubmit = async (
  page,
  comment: string,
  action: 'approve' | 'concur',
  confidential = false
) => {
  await page.waitForSelector('textarea[name="comment"]');
  await page.locator('textarea[name="comment"]').fill(comment);

  if (confidential) {
    await page.locator('[name="is_internal"] + span').click();
  }

  await page.selectOption('select[name="action"]', action);
  await page.getByRole('button', { name: /^save$/i }).click();
  await page.waitForTimeout(8000);
};

const logOut = async (page) => {
  await page.getByRole('button', { name: 'Log Out' }).click();
  await page.waitForTimeout(3000);
};

test(`End-to-end workflow: NTIA + Navy + NASA + NTIA`, async ({ page }) => {
  const rawId = process.env.REQUEST_ID;
  if (!rawId) throw new Error('Missing REQUEST_ID. Run with REQUEST_ID=5');

  const formattedRequestId = getFormattedRequestId(rawId);

  // --- Step 1: NTIA initial approval ---
  await page.goto(loginUrl);
  await page.getByLabel('Email Address').fill('ntia@dev.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await openRequestDetails(page, formattedRequestId);
  await fillCommentAndSubmit(page, 'Initial NTIA comment', 'approve');
  await page.waitForTimeout(3000);
  console.log(
    `✅ Step 1: NTIA initially approved request ${formattedRequestId}`
  );
  await logOut(page);

  // --- Step 2: Navy concurs with private comment ---
  await page.goto(loginUrl);
  await page.getByLabel('Email Address').fill('federal@navy.gov');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await openRequestDetails(page, formattedRequestId);
  await fillCommentAndSubmit(page, 'Navy private comment', 'concur', true);
  await page.waitForTimeout(3000);
  console.log(`✅ Step 2: Navy concurred with confidential comment`);
  await logOut(page);

  // --- Step 3: NASA concurs with public comment ---
  await page.goto(loginUrl);
  await page.getByLabel('Email Address').fill('federal@nasa.gov');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await openRequestDetails(page, formattedRequestId);
  await fillCommentAndSubmit(page, 'NASA public comment', 'concur');
  await page.waitForTimeout(3000);
  console.log(`✅ Step 3: NASA concurred with public comment`);
  await logOut(page);

  // --- Step 4: NTIA final approval ---
  await page.goto(loginUrl);
  await page.getByLabel('Email Address').fill('ntia@dev.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await openRequestDetails(page, formattedRequestId);
  await fillCommentAndSubmit(page, 'Final NTIA approval comment', 'approve');
  console.log(`✅ Step 4: NTIA gave final approval`);
  await page.waitForTimeout(3000);
  await page.pause();
});
