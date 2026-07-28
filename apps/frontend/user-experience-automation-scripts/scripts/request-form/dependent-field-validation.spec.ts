import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import dotenv from 'dotenv';

import {
  fillReceiverField,
  fillValidFrequency,
  fillValidLaunchSite,
  loginAndOpenRequestForm,
} from './utils';

dotenv.config();

const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
const loginUrl = `${baseUrl}${process.env.LOGIN_URL || '/'}`;
const formUrl = `${baseUrl}${process.env.FORM_URL || '/create-request'}`;

const openFrequencyForm = async (page: Page) => {
  await loginAndOpenRequestForm(page, loginUrl, formUrl);
  await fillValidLaunchSite(page, 2099);
  await page.getByRole('tab', { name: 'Frequencies' }).click();
  await page.getByLabel('Number Of Frequencies').fill('1');
  await expect(page.locator('#frequency')).toBeVisible();
};

test('validates the occupied frequency band using frequency and bandwidth together', async ({
  page,
}) => {
  await openFrequencyForm(page);

  const frequency = page.locator('#frequency');
  const bandwidth = page.locator('#transmitted_bandwidth');

  await frequency.fill('2030');
  await bandwidth.fill('20');

  await expect(frequency).toHaveAttribute('aria-invalid', 'true');
  await expect(bandwidth).toHaveAttribute('aria-invalid', 'true');
  await expect(
    page.getByText(
      /Frequency minus half the bandwidth \(2020\.00 MHz\) falls outside/
    )
  ).toHaveCount(2);

  await bandwidth.fill('10');

  await expect(frequency).not.toHaveAttribute('aria-invalid', 'true');
  await expect(bandwidth).not.toHaveAttribute('aria-invalid', 'true');
});

test('requires bandwidth justification only above 5 MHz', async ({ page }) => {
  await openFrequencyForm(page);

  await page.locator('#frequency').fill('2050');
  const bandwidth = page.locator('#transmitted_bandwidth');
  await bandwidth.fill('6');

  const justification = page.locator('#transmitted_bandwidth_justification');
  await expect(justification).toBeVisible();

  await justification.fill('Required for the mission data rate');
  await justification.clear();

  await expect(justification).toHaveAttribute('aria-invalid', 'true');
  await expect(
    page.getByText(
      'Justification required when transmitted bandwidth is more than 5.'
    )
  ).toBeVisible();

  await justification.fill('Required for the mission data rate');
  await expect(justification).not.toHaveAttribute('aria-invalid', 'true');

  await bandwidth.fill('5');
  await expect(justification).toBeHidden();
});

test('validates transmitter and receiver date relationships', async ({
  page,
}) => {
  await openFrequencyForm(page);

  const transmitterStart = page.locator('#tx_transmission_start');
  const transmitterEnd = page.locator('#tx_transmission_end');

  await transmitterStart.fill('2099-07-01T10:00');
  await transmitterEnd.fill('2099-07-01T09:00');

  await expect(transmitterStart).toHaveAttribute('aria-invalid', 'true');
  await expect(transmitterEnd).toHaveAttribute('aria-invalid', 'true');
  await expect(
    page.getByText(
      'Transmission Start Date must be earlier than Transmission End Date.'
    )
  ).toBeVisible();
  await expect(
    page.getByText(
      'Transmission End Date must be later than Transmission Start Date.'
    )
  ).toBeVisible();

  await transmitterStart.fill('2099-07-01T08:00');
  await transmitterEnd.fill('2099-07-01T09:00');
  await fillReceiverField(page, 0, 'transmission_start', '2099-07-01T07:00');
  await fillReceiverField(page, 0, 'transmission_end', '2099-07-01T08:30');

  const receiverStart = page.locator('#receivers\\.0\\.transmission_start');
  const receiverEnd = page.locator('#receivers\\.0\\.transmission_end');

  await expect(receiverStart).toHaveAttribute('aria-invalid', 'true');
  await expect(receiverEnd).toHaveAttribute('aria-invalid', 'true');
  await expect(
    page.getByText(
      'Receiver Start Date cannot be before Transmission Start Date.'
    )
  ).toBeVisible();
  await expect(
    page.getByText('Receiver End Date cannot be before Transmission End Date.')
  ).toBeVisible();
});

test('requires every Receiver 2 field after any Receiver 2 value is entered', async ({
  page,
}) => {
  await openFrequencyForm(page);

  await page.locator('[aria-label="Show second receiver section"]').click();

  const receiver2Start = page.locator('#receivers\\.1\\.transmission_start');
  await expect(receiver2Start).not.toHaveAttribute('aria-invalid', 'true');

  await page.locator('#receivers\\.1\\.antenna_type').fill('Dish');

  await expect(receiver2Start).toHaveAttribute('aria-invalid', 'true');
  await expect(
    page.locator('#receivers\\.1\\.longitude_of_receiving_antenna')
  ).toHaveAttribute('aria-invalid', 'true');
});

test('reports when fewer frequencies are saved than requested', async ({
  page,
}) => {
  await openFrequencyForm(page);

  await page.getByLabel('Number Of Frequencies').fill('2');
  await fillValidFrequency(page, 2099);
  await page.getByRole('button', { name: 'Add frequency' }).click();

  const requestedFrequencyCount = page.getByLabel('Number Of Frequencies');
  await expect(requestedFrequencyCount).toHaveAttribute('aria-invalid', 'true');
  await expect(
    page.getByText('Only 1 out of 2 frequencies entered.')
  ).toBeVisible();
});
