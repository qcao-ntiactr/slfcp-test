import { expect, test } from '@playwright/test';
import dotenv from 'dotenv';

import {
  fillReceiverField,
  fillValidLaunchSite,
  loginAndOpenRequestForm,
} from './utils';

dotenv.config();

const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
const loginUrl = `${baseUrl}${process.env.LOGIN_URL || '/'}`;
const formUrl = `${baseUrl}${process.env.FORM_URL || '/create-request'}`;

const numFrequencies = parseInt(process.env.NUM_FREQ || '1', 10);

test(`Login and add ${numFrequencies} invalid frequency(ies)`, async ({
  page,
}) => {
  await loginAndOpenRequestForm(page, loginUrl, formUrl);
  await fillValidLaunchSite(page, 2027);

  await page.getByRole('button', { name: 'Frequencies' }).click();

  // === TAB 1: Frequencies ===
  await page
    .getByLabel('Number Of Frequencies')
    .fill(numFrequencies.toString());
  await expect(page.locator('#frequency')).toBeVisible();

  for (let i = 0; i < numFrequencies; i++) {
    // Fill invalid frequency: non-numeric
    await page.locator('#frequency').fill('500');

    // Leave transmitter location at its invalid default option.

    // Invalid EIRP: negative number
    await page.locator('#eirp').fill('-50');

    await page.getByLabel(/Change the EIRP unit/).click();

    // Invalid bandwidth: overly large number
    await page.locator('#transmitted_bandwidth').fill('100000');

    await page
      .locator('#transmitted_bandwidth_is_signal_filtered')
      .getByText('Signal is Not Filtered')
      .click();

    // Provide no justification (required if BW > 5)
    // We'll skip filling 'Bandwidth Justification'

    // Fill nonsense bandwidths
    await page.locator('#minus_3db_bandwidth').fill('-900000');
    await page
      .locator('#minus_3db_bandwidth_before_or_after_filtering')
      .getByText('Before Filtering')
      .click();

    await page.locator('#minus_20db_bandwidth').fill('-55555');
    await page
      .locator('#minus_20db_bandwidth_before_or_after_filtering')
      .getByText('After Filtering')
      .click();

    await page.locator('#minus_60db_bandwidth').fill('1000000');
    await page
      .locator('#minus_60db_bandwidth_before_or_after_filtering')
      .getByText('After Filtering')
      .click();

    await page.locator('#nature_of_modulating_signals').fill('');
    await page.locator('#emission_designator').fill(''); // Empty for bad values test

    // TX (some missing, some invalid)
    await page.locator('#tx_transmission_start').fill('');
    await page.locator('#tx_transmission_end').fill('');
    await page.locator('#tx_antenna_type').fill('');
    await page.locator('#tx_antenna_gain').fill('12345467');
    await page.locator('#tx_antenna_beamwidth').fill('9999');
    await page.locator('#tx_antenna_altitude').fill('-3333');
    await page
      .locator(
        '#tx_antenna_altitude + [aria-label^="Change the altitude unit"]'
      )
      .click();

    // Receiver Section (leave blank for validation errors)
    await fillReceiverField(page, 0, 'transmission_start', '');
    await fillReceiverField(page, 0, 'transmission_end', '');
    await fillReceiverField(page, 0, 'antenna_type', '');
    await fillReceiverField(page, 0, 'antenna_gain', '');
    await fillReceiverField(page, 0, 'antenna_beamwidth', '');
    await fillReceiverField(page, 0, 'antenna_altitude', '');

    await fillReceiverField(page, 0, 'latitude_of_receiving_antenna', '999'); // invalid latitude
    await fillReceiverField(page, 0, 'longitude_of_receiving_antenna', '');

    const receiverLongitude = page.locator(
      '#receivers\\.0\\.longitude_of_receiving_antenna'
    );
    await expect(
      page.getByRole('button', { name: /Add Frequency/i })
    ).toBeDisabled();
    await receiverLongitude.press('Tab');
  }

  await expect(page.getByRole('tab', { name: 'Frequencies' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  await expect(
    page.locator('#receivers\\.0\\.longitude_of_receiving_antenna')
  ).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#frequency')).toBeVisible();
});
