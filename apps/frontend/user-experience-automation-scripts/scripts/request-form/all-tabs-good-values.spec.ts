import path from 'path';

import { expect, test } from '@playwright/test';
import dotenv from 'dotenv';

import {
  fillValidFrequency,
  fillValidLaunchSite,
  loginAndOpenRequestForm,
} from './utils';

dotenv.config();

const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
const loginUrl = `${baseUrl}${process.env.LOGIN_URL || '/'}`;
const formUrl = `${baseUrl}${process.env.FORM_URL || '/create-request'}`;

// Read number of frequencies from CLI args or environment variable
const numFrequencies = parseInt(process.env.NUM_FREQ || '1', 10);

test(`Login and add ${numFrequencies} frequency(ies)`, async ({ page }) => {
  await loginAndOpenRequestForm(page, loginUrl, formUrl);
  await fillValidLaunchSite(page);

  await page.getByRole('button', { name: 'Frequencies' }).click();

  // === TAB 1: Frequencies ===
  await page
    .getByLabel('Number Of Frequencies')
    .fill(numFrequencies.toString());
  await expect(page.locator('#frequency')).toBeVisible();

  for (let i = 0; i < numFrequencies; i++) {
    await fillValidFrequency(page);

    await page.getByRole('button', { name: /Add Frequency/i }).click();
    const frequencyLabel = numFrequencies === 1 ? 'frequency' : 'frequencies';
    await expect(
      page.getByRole('heading', {
        name: `${i + 1} out of ${numFrequencies} ${frequencyLabel} added`,
      })
    ).toBeVisible();
  }

  await page.getByRole('button', { name: 'Edit frequency' }).click();
  await expect(
    page.getByRole('heading', { name: 'Edit Frequency' })
  ).toBeVisible();
  await expect(page.locator('#frequency')).toHaveValue('2050');
  await expect(page.getByRole('button', { name: 'Back' })).toBeDisabled();
  await expect(
    page.getByRole('tab', { name: 'Additional Information' })
  ).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Save Draft' })).toBeDisabled();

  await page.locator('#frequency').fill('2055');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(
    page.getByRole('heading', { name: 'Edit Frequency' })
  ).not.toBeVisible();
  await expect(
    page.getByRole('tab', { name: 'Additional Information' })
  ).toBeEnabled();

  // === TAB 2: Additional Information ===
  await page.getByRole('tab', { name: 'Additional Information' }).click();

  await page
    .locator('#ground_track_from_liftoff_until_payload_separation')
    .fill(
      'Launch will follow equatorial trajectory toward geostationary orbit.'
    );

  await page
    .locator('#ecf_cartesian_vectors_format_file_desc')
    .fill('Format includes X, Y, Z vectors at 1-second intervals.');

  await page.setInputFiles(
    'input[type="file"]#ecf_cartesian_vectors_format_file',
    path.join(__dirname, 'files', 'testECF1.xls')
  );

  await page
    .locator('#ground_track_of_launch_vehicle_2d_img_file_desc')
    .fill('PNG image showing 2D projection of flight path.');

  await page.setInputFiles(
    'input[type="file"]#ground_track_of_launch_vehicle_2d_img_file',
    path.join(__dirname, 'files', 'cmis.png')
  );

  await page.locator('#fcc_filing_date').fill('2030-10-01');

  // === TAB 3: Points of Contact ===
  await page
    .locator('#primary_poc_name')
    .fill('Johnathan Bartholomew-Middleton the Third');
  await page
    .locator('#primary_poc_email')
    .fill('johnathan.b.middleton.the.third@example.com');
  await page.locator('#primary_poc_phone').fill('5551234567');
  await page
    .locator('#alternate_poc_name')
    .fill('Jane Elizabeth Alexandra de Saint-Exupéry');
  await page
    .locator('#alternate_poc_email')
    .fill('jane.e.alexandra.desaintexupery@example.com');
  await page.locator('#alternate_poc_phone').fill('5559876543');

  // === TAB 4: Summary ===
  await page.getByRole('tab', { name: 'Summary' }).click();

  await expect(page.getByRole('tab', { name: 'Summary' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  await expect(page.getByLabel('Mission Name', { exact: true })).toHaveValue(
    'Falcon Heavy Demo Mission'
  );
  await expect(
    page.getByRole('cell', { name: '2055', exact: true })
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit' })).toBeEnabled();

  let submittedBody = '';
  await page.route('**/requests', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }

    submittedBody = route.request().postData() ?? '';
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ request: { id: 123 } }),
    });
  });

  await page.getByRole('button', { name: 'Submit' }).click();

  await expect(
    page.getByRole('dialog', { name: 'Request Submitted' })
  ).toBeVisible();
  expect(submittedBody).toContain('name="mission_name"');
  expect(submittedBody).toContain('Falcon Heavy Demo Mission');
  expect(submittedBody).toContain('name="frequencies"');
  expect(submittedBody).toContain('"frequency":2055');
});
