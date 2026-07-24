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

const numFrequencies = parseInt(process.env.NUM_FREQ || '1', 10);

test(`Login and fill good launch/frequencies but bad additional info`, async ({
  page,
}) => {
  await loginAndOpenRequestForm(page, loginUrl, formUrl);
  await fillValidLaunchSite(page, 2027);
  await page.getByRole('button', { name: 'Frequencies' }).click();

  // === TAB 1: Frequencies (Valid Values) ===
  await page
    .getByLabel('Number Of Frequencies')
    .fill(numFrequencies.toString());
  await expect(page.locator('#frequency')).toBeVisible();

  for (let i = 0; i < numFrequencies; i++) {
    await fillValidFrequency(page, 2027);

    await page.getByRole('button', { name: /Add Frequency/i }).click();
    const frequencyLabel = numFrequencies === 1 ? 'frequency' : 'frequencies';
    await expect(
      page.getByRole('heading', {
        name: `${i + 1} out of ${numFrequencies} ${frequencyLabel} added`,
      })
    ).toBeVisible();
  }

  // === TAB 2: Additional Information (Invalid Values) ===
  await page.getByRole('tab', { name: 'Additional Information' }).click();

  await page
    .locator('#ground_track_from_liftoff_until_payload_separation')
    .fill(''); // Required field left blank

  await page.locator('#ecf_cartesian_vectors_format_file_desc').fill('');

  // Uploading wrong file type
  await page.setInputFiles(
    'input[type="file"]#ecf_cartesian_vectors_format_file',
    path.join(__dirname, 'files', 'cmis.png')
  );

  await page
    .locator('#ground_track_of_launch_vehicle_2d_img_file_desc')
    .fill('');

  // Corrupted image or wrong file
  await page.setInputFiles(
    'input[type="file"]#ground_track_of_launch_vehicle_2d_img_file',
    path.join(__dirname, 'files', 'testECF1.xls')
  );

  await page.locator('#fcc_filing_date').fill('');

  await page.locator('#primary_poc_name').fill('@#dasc');
  await page.locator('#primary_poc_email').fill('2eee@email.com');
  await page.locator('#primary_poc_phone').fill('222');
  await page.locator('#alternate_poc_name').fill('eddie #Jones');
  await page.locator('#alternate_poc_email').fill('EmailWithoutProvider');
  await page.locator('#alternate_poc_phone').fill('555123123');

  await page.getByRole('tab', { name: 'Summary' }).click();

  await expect(
    page.getByRole('tab', { name: 'Additional Information' })
  ).toHaveAttribute('aria-selected', 'true');
  await expect(
    page.locator('#ground_track_from_liftoff_until_payload_separation')
  ).toHaveAttribute('aria-invalid', 'true');
});
