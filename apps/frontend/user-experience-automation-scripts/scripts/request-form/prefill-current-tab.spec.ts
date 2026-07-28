import { expect, test } from '@playwright/test';
import dotenv from 'dotenv';

import { loginAndOpenRequestForm } from './utils';

dotenv.config();

const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
const loginUrl = `${baseUrl}${process.env.LOGIN_URL || '/'}`;
const formUrl = `${baseUrl}${process.env.FORM_URL || '/create-request'}`;

test('prefills the active request tab when its New Request heading is clicked', async ({
  page,
}) => {
  await loginAndOpenRequestForm(page, loginUrl, formUrl);

  const prefillButton = page
    .getByRole('heading', { name: 'New Request' })
    .getByRole('button');
  await prefillButton.click();

  await expect(page.locator('#mission_name')).toHaveValue(
    'Test Launch Mission'
  );
  await expect(page.locator('#state')).toHaveValue('FL');

  await page.getByRole('button', { name: 'Frequencies' }).click();
  await prefillButton.click();

  await expect(page.getByLabel('Number Of Frequencies')).toHaveValue('1');
  await expect(page.locator('#frequency')).toHaveValue('2050');
  await expect(
    page.locator('#transmitted_bandwidth_justification')
  ).toHaveValue('Test bandwidth justification');

  const addFrequencyButton = page.getByRole('button', {
    name: 'Add frequency',
  });
  await expect(addFrequencyButton).toBeEnabled();
  await addFrequencyButton.click();

  await page.getByRole('tab', { name: 'Additional Information' }).click();
  await prefillButton.click();

  await expect(page.locator('#primary_poc_name')).toHaveValue('Test Contact');
  await expect(page.locator('#primary_poc_phone')).toHaveValue(
    '(202) 555-0100'
  );
  await expect(
    page.locator('#ecf_cartesian_vectors_format_file')
  ).toHaveValue('');
});
